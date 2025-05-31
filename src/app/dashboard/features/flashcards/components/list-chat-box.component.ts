import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { AiModelSelectorComponent } from '../../../../ai-chat/chat/ai-model-selector.component'
import {
  catchError,
  EMPTY,
  finalize,
  Subject,
  switchMap,
  tap,
  takeUntil,
  timer,
} from 'rxjs'
import { AiService } from '../../../../services/ai-llms/ai.service'
import { FlashcardCDKService } from '../../../../ai-chat/services/flashcard-cdk-service.service'
import { EdgeFunctionResponse } from '../../../../models/ai-http-service/ai.types'
import { TuiButton } from '@taiga-ui/core'

import { SetSelectionService } from '../../../../services/set-selection.service'
import { LocalStorageService } from '../../../../services/state/local-storage.service'
import { FlashcardSetWithCards } from '../../../../api'
import { FlashcardSetSelectorComponent } from '../../../../common/flashcard-set-selection/flashcard-set-selector.component'

interface ChatMessage {
  text: string
  isUser: boolean
  isTemporary?: boolean
  id?: string
}

@Component({
  selector: 'app-list-chat-box',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AiModelSelectorComponent,
    TuiButton,
    FlashcardSetSelectorComponent,
  ],
  template: `
    <div class="chat-sidebar">
      <div class="selector-container">
        <app-flashcard-set-selector
          [activeTab]="1"
        ></app-flashcard-set-selector>
      </div>
      <div class="model-container">
        <app-ai-model-selector />
      </div>
      <div class="chat-container">
        <div class="flex flex-col h-full rounded-lg shadow">
          <!-- Chat Messages Area -->
          <div class="flex-1 overflow-y-auto p-4 space-y-4 min-h-[2rem]">
            <div
              *ngFor="let message of messages(); let i = index"
              [class]="
                message.isUser ? 'flex justify-end' : 'flex justify-start'
              "
              class="transition-all duration-300"
              [class.fade-out]="message.isTemporary"
              [style.animation]="'fadeIn 0.3s ease-out ' + i * 0.1 + 's both'"
            >
              <div
                [class]="
                  message.isUser
                    ? 'bg-blue-500 text-white'
                    : message.isTemporary
                    ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                "
                class="rounded-lg p-3 max-w-[70%] shadow-md transition-opacity duration-500"
              >
                <p class="whitespace-pre-wrap break-words text-sm">
                  {{ message.text }}
                </p>
              </div>
            </div>

            <!-- Loading indicator -->
            <div *ngIf="isLoading()" class="flex justify-start animate-fadeIn">
              <div class="bg-gray-100 dark:bg-gray-700 rounded-lg p-3">
                <div class="flex space-x-2">
                  <div
                    class="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  ></div>
                  <div
                    class="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]"
                  ></div>
                  <div
                    class="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.4s]"
                  ></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Input Area -->
          <div class="border-t p-4 bg-gray-50 dark:bg-gray-900">
            <div class="flex gap-2">
              <textarea
                [ngModel]="prompt()"
                (ngModelChange)="prompt.set($event)"
                [disabled]="isLoading()"
                placeholder="Type your message here..."
                (keydown.enter)="$event.preventDefault(); sendPrompt()"
                class="flex-1 p-2 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
              ></textarea>
              <button
                appearance="outline"
                tuiAppearanceMode="checked"
                tuiButton
                tuiButtonVertical
                type="button"
                [disabled]="isLoading()"
                (click)="sendPrompt()"
              >
                {{ isLoading() ? 'Sending...' : 'Send' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .chat-sidebar {
        @apply flex flex-col bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg;
        width: 100%;
        min-width: 400px;
        @apply h-full;
      }

      .selector-container {
        @apply p-3 border-b border-gray-300 dark:border-gray-700;
        flex: 0 0 auto;
      }

      .model-container {
        @apply p-3 border-b border-gray-300 dark:border-gray-700;
        flex: 0 0 auto;
      }

      .chat-container {
        @apply p-3;
        flex: 1 1 auto;
        min-height: 0;
        overflow: hidden;
        display: flex;
        flex-direction: column;
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
          transform: translateY(10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .animate-fadeIn {
        animation: fadeIn 0.3s ease-out forwards;
      }

      .fade-out {
        animation: fadeOut 0.5s ease-out 3s forwards;
      }

      @keyframes fadeOut {
        from {
          opacity: 1;
        }
        to {
          opacity: 0;
          height: 0;
          margin-top: 0;
          margin-bottom: 0;
          padding-top: 0;
          padding-bottom: 0;
          transform: translateY(-10px);
        }
      }
    `,
  ],
})
export class ListChatBoxComponent implements OnInit, OnDestroy {
  private readonly aiService = inject(AiService)
  private readonly flashcardCDKService = inject(FlashcardCDKService)
  private readonly setSelectionService = inject(SetSelectionService)
  private readonly localStorageService = inject(LocalStorageService)
  private readonly promptSubject = new Subject<string>()
  private readonly destroy$ = new Subject<void>()

  // Keep track of the current selected set
  currentSet = signal<FlashcardSetWithCards | null>(null)
  messages = signal<ChatMessage[]>([])
  prompt = signal('')
  isLoading = signal(false)
  currentMessage = signal('')

  constructor() {
    // Initialize with available sets from local storage
    this.initFromLocalStorage()

    this.promptSubject
      .pipe(
        tap(() => this.isLoading.set(true)),
        switchMap((prompt) =>
          this.aiService.generateResponse(prompt).pipe(
            catchError((error) => {
              console.error('Error generating response:', error)
              this.handleError()
              return EMPTY
            }),
            finalize(() => {
              this.isLoading.set(false)
              this.resetCurrentMessage() // Reset current message when done
            }),
          ),
        ),
      )
      .subscribe({
        next: (response: EdgeFunctionResponse) => {
          if (response.message) {
            this.updateStreamResponse(response.message)
          }
          if (response.cards?.length) {
            console.log('DEBUG: Received cards from backend:', response.cards)

            // Make sure cards are in the correct format
            const parsedCards = response.cards.map((card) => {
              // Ensure card has front and back properties
              if (!card.front || !card.back) {
                console.warn('Malformed card:', card)
                return {
                  front: card.front || 'Missing front content',
                  back: card.back || 'Missing back content',
                }
              }
              return card
            })

            // Get the currently selected set from our signal
            const selectedSet = this.currentSet()
            if (!selectedSet) {
              this.messages.update((messages) => [
                ...messages,
                {
                  text: 'Please select a set before generating cards.',
                  isUser: false,
                },
              ])
              return
            }

            // Only add the cards to the "new flashcards" area
            // Do NOT add them directly to the set
            this.flashcardCDKService.setNewFlashcards(parsedCards)
            console.log(
              'DEBUG: Added cards to new flashcards area. Current state:',
              this.flashcardCDKService.newFlashcards(),
            )

            // Add a message about the generated cards
            this.messages.update((messages) => [
              ...messages,
              {
                text: `Generated ${parsedCards.length} flashcards. Drag them to the "Cards in Selected Set" area or use the "Add All to Set" button to add them to "${selectedSet.title}".`,
                isUser: false,
              },
            ])
          } else {
            console.warn(
              'DEBUG: No cards in response or empty array:',
              response,
            )
          }
        },
      })
  }

  /**
   * Initialize directly from local storage to ensure state is consistent before any subscriptions
   */
  private initFromLocalStorage(): void {
    const state = this.localStorageService.getState()
    console.log('Initial state from localStorage:', {
      currentSetId: state.currentSetId,
      availableSets: state.flashcardSets.length,
    })

    // Make sure flashcardCDKService is in sync with localStorage
    this.flashcardCDKService.flashcardSets.set(state.flashcardSets)

    // Get the currently selected set
    let selectedSet: FlashcardSetWithCards | null = null

    if (state.currentSetId) {
      selectedSet =
        state.flashcardSets.find((set) => set.id === state.currentSetId) || null
    }

    // If no selected set but we have sets, use the first one
    if (!selectedSet && state.flashcardSets.length > 0) {
      selectedSet = state.flashcardSets[0]
      console.log(
        `No selected set found, defaulting to first set: ${selectedSet.title}`,
      )
    }

    if (selectedSet) {
      console.log(
        `Initializing with set: ${selectedSet.title} (${selectedSet.id})`,
      )

      // Update all services with this set
      this.currentSet.set(selectedSet)
      this.setSelectionService.setSelectedSet(selectedSet)
      this.flashcardCDKService.selectSet(selectedSet.id)
      this.flashcardCDKService.forceUpdateSelectedSetCards(
        selectedSet.flashcards,
      )

      // Make sure localStorage is updated
      this.localStorageService.updateState((state) => ({
        ...state,
        currentSetId: selectedSet!.id,
      }))
    } else {
      console.log('No sets available in localStorage')
    }
  }

  ngOnInit(): void {
    console.log('ListChatBoxComponent initializing ngOnInit')

    // Subscribe to set selection changes
    this.setSelectionService.selectedSetChanged$
      .pipe(takeUntil(this.destroy$))
      .subscribe((set) => {
        console.log(
          'ListChatBoxComponent received set change:',
          set?.title,
          set?.id,
        )

        if (set) {
          this.currentSet.set(set)
          this.flashcardCDKService.selectSet(set.id)
          this.flashcardCDKService.forceUpdateSelectedSetCards(set.flashcards)

          // When a set is selected, add a temporary message to the chat
          const messageId = crypto.randomUUID()
          const newMessage = {
            text: `Now working with set: "${set.title}" (${set.flashcards.length} cards)`,
            isUser: false,
            isTemporary: true,
            id: messageId,
          }

          this.messages.update((msgs) => [...msgs, newMessage])

          // Remove the message after 5 seconds
          timer(5000)
            .pipe(takeUntil(this.destroy$))
            .subscribe(() => {
              this.messages.update((msgs) =>
                msgs.filter((msg) => msg.id !== messageId),
              )
            })
        } else {
          this.flashcardCDKService.clearSelectedSet()
          this.currentSet.set(null)
        }
      })

    // Subscribe to local storage changes to stay in sync
    this.localStorageService.stateChanged$
      .pipe(takeUntil(this.destroy$))
      .subscribe((state) => {
        console.log('LocalStorage state changed in ListChatBoxComponent')

        if (!this.currentSet()) {
          // If we don't have a current set, try to get one from localStorage
          this.initFromLocalStorage()
        } else {
          // Make sure our current set still exists
          const setId = this.currentSet()!.id
          const setExists = state.flashcardSets.some((set) => set.id === setId)

          if (!setExists && state.flashcardSets.length > 0) {
            console.log('Current set no longer exists, selecting new set')
            this.initFromLocalStorage()
          }
        }
      })
  }

  ngOnDestroy(): void {
    this.destroy$.next()
    this.destroy$.complete()
  }

  sendPrompt(): void {
    const currentPrompt = this.prompt()
    if (currentPrompt.trim()) {
      // Add user message to chat
      this.messages.update((msgs) => [
        ...msgs,
        { text: currentPrompt, isUser: true },
      ])

      // Set loading state
      this.isLoading.set(true)

      // Send prompt to subject
      this.promptSubject.next(currentPrompt)

      // Clear input
      this.prompt.set('')
    }
  }

  updateStreamResponse(content: string) {
    if (!this.currentMessage()) {
      // First chunk of new message
      this.messages.update((msgs) => [
        ...msgs,
        { text: content, isUser: false },
      ])
      this.currentMessage.set(content)
    } else {
      // Update existing message
      const updatedMessage = this.currentMessage() + content
      this.currentMessage.set(updatedMessage)

      this.messages.update((msgs) => {
        const newMsgs = [...msgs]
        if (newMsgs.length > 0) {
          newMsgs[newMsgs.length - 1] = {
            ...newMsgs[newMsgs.length - 1],
            text: updatedMessage,
          }
        }
        return newMsgs
      })
    }

    // Scroll to bottom after update
    queueMicrotask(() => {
      const chatContainer = document.querySelector('.overflow-y-auto')
      if (chatContainer) {
        chatContainer.scrollTop = chatContainer.scrollHeight
      }
    })
  }

  resetCurrentMessage() {
    this.currentMessage.set('')
  }

  handleError() {
    this.messages.update((msgs) => [
      ...msgs,
      {
        text: 'Sorry, I encountered an error while processing your request.',
        isUser: false,
      },
    ])
    this.isLoading.set(false)
  }
}
