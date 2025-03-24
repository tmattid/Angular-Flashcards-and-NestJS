import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { AiModelSelectorComponent } from '../../ai-chat/chat/ai-model-selector.component'
import {
  catchError,
  EMPTY,
  finalize,
  Subject,
  switchMap,
  tap,
  takeUntil,
} from 'rxjs'
import { AiService } from '../../services/ai-llms/ai.service'
import { FlashcardCDKService } from '../../ai-chat/services/flashcard-cdk-service.service'
import { EdgeFunctionResponse } from '../../models/ai-http-service/ai.types'
import { TuiButton } from '@taiga-ui/core'
import { FlashcardSetSelectorComponent } from '../../flashcard-set-selection/flashcard-set-selector.component'
import { SetSelectionService } from '../../services/set-selection.service'
import { LocalStorageService } from '../../services/state/local-storage.service'
import { FlashcardSetWithCards } from '../../api'

interface ChatMessage {
  text: string
  isUser: boolean
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
              [style.animation]="'fadeIn 0.3s ease-out ' + i * 0.1 + 's both'"
            >
              <div
                [class]="
                  message.isUser
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                "
                class="rounded-lg p-3 max-w-[70%] shadow-md"
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

  ngOnInit(): void {
    // Subscribe to set selection changes
    this.setSelectionService.selectedSetChanged$
      .pipe(takeUntil(this.destroy$))
      .subscribe((set) => {
        this.currentSet.set(set)

        // When a set is selected, add a message to the chat
        if (set) {
          this.messages.update((msgs) => [
            ...msgs,
            {
              text: `Now working with set: "${set.title}" (${set.flashcards.length} cards)`,
              isUser: false,
            },
          ])
        }
      })

    // Initialize with the current selected set if it exists
    const initialSet = this.setSelectionService.getSelectedSet()
    if (initialSet) {
      this.currentSet.set(initialSet)
    }
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

  constructor() {
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

            // Get the most up-to-date version of the set from localStorage
            const upToDateSet = this.localStorageService
              .getState()
              .flashcardSets.find((set) => set.id === selectedSet.id)

            if (!upToDateSet) {
              console.error('Could not find the selected set in localStorage')
              return
            }

            // Format the cards with all required properties
            const formattedCards = parsedCards.map((card, index) => ({
              id: crypto.randomUUID(),
              setId: upToDateSet.id,
              front: card.front,
              back: card.back,
              position: upToDateSet.flashcards.length + index,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }))

            // Set the generated flashcards in the service
            this.flashcardCDKService.setNewFlashcards(parsedCards)
            console.log(
              'DEBUG: Updated cards in CDK service. Current state:',
              this.flashcardCDKService.newFlashcards(),
            )

            // Update the local storage state with the new cards
            this.localStorageService.updateState((state) => {
              const updatedSets = state.flashcardSets.map((set) =>
                set.id === upToDateSet.id
                  ? {
                      ...set,
                      flashcards: [...set.flashcards, ...formattedCards],
                    }
                  : set,
              )

              console.log(
                'DEBUG: Updated local storage state with new cards',
                updatedSets,
              )

              return {
                ...state,
                flashcardSets: updatedSets,
              }
            })

            // Update our current set signal with the latest data (including the new cards)
            const updatedSet = {
              ...upToDateSet,
              flashcards: [...upToDateSet.flashcards, ...formattedCards],
            }
            this.currentSet.set(updatedSet)

            // Also update the SetSelectionService to ensure consistency
            this.setSelectionService.setSelectedSet(updatedSet)

            // Add a message about the generated cards
            this.messages.update((messages) => [
              ...messages,
              {
                text: `Generated ${parsedCards.length} flashcards and added them to "${upToDateSet.title}".`,
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
}
