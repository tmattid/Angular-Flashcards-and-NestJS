import {
  Component,
  EventEmitter,
  Output,
  inject,
  signal,
  computed,
  effect,
} from '@angular/core'
import { FormsModule } from '@angular/forms'
import { CommonModule } from '@angular/common'
import { catchError, EMPTY, finalize, Subject, switchMap, tap } from 'rxjs'
import { AiService } from '../../services/ai-llms/ai.service'
import { FlashcardCDKService } from '../services/flashcard-cdk-service.service'
import { EdgeFunctionResponse } from '../../models/ai-http-service/ai.types'
import { SelectionService } from '../../services/selection.service'
import { SetSelectionService } from '../../services/set-selection.service'
import { TuiButton } from '@taiga-ui/core'

interface ChatMessage {
  text: string
  isUser: boolean
}

@Component({
  selector: 'app-ai-prompt',
  standalone: true,
  imports: [FormsModule, CommonModule, TuiButton],
  template: `
    <div class="flex flex-col h-full  rounded-lg shadow">
      <!-- Selection Context -->
      <div *ngIf="selectedRows().length > 0" class="p-4border-b">
        <div class="text-sm text-gray-600">
          {{ contextMessage() }}
        </div>
      </div>

      <!-- Chat Messages Area -->
      <div
        class="flex-1 overflow-y-auto p-4 space-y-4 min-h-[200px] max-h-[50vh] "
      >
        <div
          *ngFor="let message of messages(); let i = index"
          [class]="message.isUser ? 'flex justify-end' : 'flex justify-start'"
          class="transition-all duration-300"
          [style.animation]="'fadeIn 0.3s ease-out ' + i * 0.1 + 's both'"
        >
          <div
            [class]="
              message.isUser
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-800'
            "
            class="rounded-lg p-3 max-w-[70%] shadow-md"
          >
            <p
              class="whitespace-pre-wrap break-words"
              [class.typing-animation]="!message.isUser"
            >
              {{ message.text }}
            </p>
          </div>
        </div>

        <!-- Loading indicator -->
        <div *ngIf="isLoading()" class="flex justify-start animate-fadeIn">
          <!-- ...existing loading indicator... -->
        </div>
      </div>

      <!-- Input Area -->
      <div class="border-t p-4">
        <div class="flex gap-2">
          <textarea
            [disabled]="isLoading()"
            [ngModel]="prompt()"
            (ngModelChange)="prompt.set($event)"
            rows="1"
            class="flex-1 rounded-lg border border-gray-300 p-2 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all duration-200"
            placeholder="Type your message here..."
            (keydown.enter)="$event.preventDefault(); sendPrompt()"
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
  `,
  styles: [
    `
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

      .typewriter {
        overflow: hidden;
        border-right: 2px solid transparent;
        animation: typing 2s steps(40, end), blink-caret 0.75s step-end infinite;
        white-space: pre-wrap;
        word-break: break-word;
      }

      @keyframes typing {
        from {
          width: 0;
          opacity: 0;
        }
        to {
          width: 100%;
          opacity: 1;
        }
      }

      @keyframes blink-caret {
        from,
        to {
          border-color: transparent;
        }
        50% {
          border-color: #666;
        }
      }

      @keyframes messagePopIn {
        0% {
          opacity: 0;
          transform: scale(0.8);
        }
        50% {
          transform: scale(1.05);
        }
        100% {
          opacity: 1;
          transform: scale(1);
        }
      }

      @keyframes typing {
        from {
          width: 0;
        }
        to {
          width: 100%;
        }
      }

      .animate-typing {
        animation: typing 1s steps(30, end);
      }

      .message-container {
        width: fit-content;
      }

      .message-text {
        visibility: visible;
      }

      .ai-message {
        visibility: hidden;
        position: relative;
      }

      .ai-message::after {
        visibility: visible;
        position: absolute;
        top: 0;
        left: 0;
        content: attr(data-text);
        white-space: pre-wrap;
        overflow: hidden;
        width: 0;
        animation: typewriter 2s steps(40, end) forwards;
      }

      @keyframes typewriter {
        from {
          width: 0;
        }
        to {
          width: 100%;
        }
      }

      .typing-animation {
        overflow: hidden;
        display: inline-block;
        white-space: pre-wrap;
        animation: typing 0.05s steps(1, end);
        width: fit-content;
      }

      @keyframes typing {
        from {
          clip-path: inset(0 100% 0 0);
        }
        to {
          clip-path: inset(0 0 0 0);
        }
      }
    `,
  ],
})
export class AiPromptComponent {
  @Output() promptSubmit = new EventEmitter<string>()
  private readonly aiService = inject(AiService)
  private readonly flashcardCDKService = inject(FlashcardCDKService)
  private readonly promptSubject = new Subject<string>()
  private readonly selectionService = inject(SelectionService)
  private readonly setSelectionService = inject(SetSelectionService)
  selectedRows = this.selectionService.getSelectedRows()

  // Convert to signals
  messages = signal<ChatMessage[]>([])
  prompt = signal('')
  isLoading = signal(false)
  currentMessage = signal('')

  contextMessage = computed(() => {
    const selectedSet = this.setSelectionService.getSelectedSet()
    const selectedCount = this.selectedRows().length

    if (!selectedSet) return 'Please select a flashcard set to begin.'

    let message = `Working with: ${selectedSet.title} (${selectedSet.flashcards.length} total cards)`
    if (selectedCount > 0) {
      message += `\nSelected: ${selectedCount} cards`
    }
    return message
  })

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

            // First check if user has a set selected
            const selectedSetId = this.flashcardCDKService.selectedSetId()

            // Force a change detection update
            setTimeout(() => {
              // Set the generated flashcards
              this.flashcardCDKService.setNewFlashcards(parsedCards)
              console.log(
                'DEBUG: Updated cards in CDK service. Current state:',
                this.flashcardCDKService.newFlashcards(),
              )

              // Add a helpful message about what happened
              if (selectedSetId) {
                // We already add cards to selected set (in setNewFlashcards), so just inform user
                this.messages.update((messages) => [
                  ...messages,
                  {
                    text: `Generated ${parsedCards.length} flashcards. Cards are available in the flashcard panel and have been automatically stored in your selected set.`,
                    isUser: false,
                  },
                ])
              } else {
                // No set was selected, but our updated service created a default set
                this.messages.update((messages) => [
                  ...messages,
                  {
                    text: `Generated ${parsedCards.length} flashcards. A default set "My Flashcards" was created for you, and your cards were automatically added to it.`,
                    isUser: false,
                  },
                ])
              }
            }, 0)
          } else {
            console.warn(
              'DEBUG: No cards in response or empty array:',
              response,
            )
          }
        },
      })

    // Add effect to track selection changes
    effect(() => {
      console.log('🎯 Prompt Component - Selected Rows:', {
        count: this.selectedRows().length,
        rows: this.selectedRows(),
      })
    })
  }
}
