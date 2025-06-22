import {
  Component,
  ChangeDetectionStrategy,
  inject,
  input,
  signal,
  computed,
  DestroyRef,
} from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { FormsModule } from '@angular/forms'
import { CommonModule } from '@angular/common'
import { catchError, EMPTY, finalize, from, Subject, switchMap } from 'rxjs'

import { ButtonModule } from 'primeng/button'
import { InputTextarea } from 'primeng/inputtextarea'
import { AiService as ApiAiService } from '../../../api'
import type {
  FlashcardResponse,
  FlashcardUpdateResponse,
  SelectedCardDto,
  Flashcard,
  FlashcardSetWithCards,
} from '../../../api'
import { MODEL_DETAILS } from '../../../models/ai-http-service/ai-models.model'
import { GridRow } from '../../grid/grid.types'
import { GridService } from '../../grid/services/grid.service'
import { LocalStorageService } from '../../../services/state/local-storage.service'
import { GridPromptContextDto } from '../../../api/models/GridPromptContextDto'

interface ChatMessage {
  id: string
  text: string
  isUser: boolean
  timestamp: Date
}

@Component({
  selector: 'app-ai-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, InputTextarea],
  template: `
    <div class="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      <!-- Header -->
      <div class="px-6 py-4 bg-white dark:bg-gray-800 border-b">
        <div class="flex items-center space-x-3">
          <div
            class="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center"
          >
            <span class="text-white text-sm">🤖</span>
          </div>
          <div>
            <h3 class="font-semibold text-gray-900 dark:text-white text-sm">
              {{ isGenerateMode() ? 'AI Card Generator' : 'AI Card Editor' }}
            </h3>
            <p class="text-xs text-gray-500 dark:text-gray-400">
              {{ contextInfo() }}
            </p>
          </div>
        </div>
      </div>

      <!-- Messages -->
      <div class="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        <!-- Empty state -->
        <div
          *ngIf="messages().length === 0"
          class="text-center text-gray-500 py-16"
        >
          <div class="text-4xl mb-4">{{ isGenerateMode() ? '✨' : '📝' }}</div>
          <p class="font-medium mb-2">
            {{
              isGenerateMode()
                ? 'Ready to generate flashcards'
                : 'Ready to edit flashcards'
            }}
          </p>
          <p class="text-sm mb-8">
            {{
              isGenerateMode()
                ? 'I can only create new flashcards'
                : 'I can only edit or delete existing flashcards'
            }}
          </p>
          <div class="flex flex-wrap justify-center gap-2 max-w-lg mx-auto">
            <button
              *ngFor="let example of examplePrompts()"
              class="px-4 py-2 bg-white dark:bg-gray-800 rounded-xl text-sm cursor-pointer hover:bg-gray-50 border-0"
              (click)="currentPrompt.set(example)"
              type="button"
            >
              {{ example }}
            </button>
          </div>
        </div>

        <!-- Chat messages -->
        <div
          *ngFor="let message of messages(); trackBy: trackMessage"
          class="flex animate-fade-in"
          [class.justify-end]="message.isUser"
        >
          <div
            class="max-w-[70%] rounded-2xl px-4 py-3 shadow-sm"
            [class.bg-blue-500]="message.isUser"
            [class.text-white]="message.isUser"
            [class.bg-white]="!message.isUser"
            [class.dark:bg-gray-800]="!message.isUser"
          >
            <div class="text-sm leading-relaxed whitespace-pre-wrap">
              {{ message.text }}
            </div>
          </div>
        </div>

        <!-- Loading indicator -->
        <div *ngIf="isLoading()" class="flex justify-start animate-fade-in">
          <div
            class="bg-white dark:bg-gray-800 rounded-2xl px-4 py-3 shadow-sm"
          >
            <div class="flex space-x-1">
              <div
                class="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
              ></div>
              <div
                class="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                style="animation-delay: 150ms"
              ></div>
              <div
                class="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                style="animation-delay: 300ms"
              ></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Input -->
      <div class="px-6 py-4 bg-white dark:bg-gray-800 border-t">
        <div
          class="relative bg-gray-50 dark:bg-gray-700 rounded-2xl border focus-within:border-blue-500"
        >
          <textarea
            pInputTextarea
            [(ngModel)]="currentPrompt"
            [disabled]="!canSend()"
            [placeholder]="placeholder()"
            (keydown.enter)="onKeydown($event)"
            class="w-full resize-none rounded-2xl px-4 py-3 pr-12 text-sm bg-transparent"
            rows="2"
          ></textarea>
          <button
            [disabled]="!canSend() || !currentPrompt().trim()"
            (click)="sendMessage()"
            class="absolute right-2 bottom-2 w-8 h-8 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white rounded-full flex items-center justify-center"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .animate-fade-in {
        animation: fadeIn 0.3s ease-out;
      }
      @keyframes fadeIn {
        from {
          opacity: 0;
          transform: translateY(8px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      :host ::ng-deep .p-inputtextarea {
        border: none !important;
        box-shadow: none !important;
        background: transparent !important;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AiChatComponent {
  private readonly destroyRef = inject(DestroyRef)
  private readonly apiAiService = inject(ApiAiService)
  private readonly gridService = inject(GridService)
  private readonly localStorage = inject(LocalStorageService)

  activeTab = input<number>(0)

  messages = signal<ChatMessage[]>([])
  currentPrompt = signal('')
  isLoading = signal(false)

  private promptSubject = new Subject<string>()

  // Computed properties
  isGenerateMode = computed(() => this.activeTab() === 1)
  selectedSet = computed(() => this.gridService.currentSet())
  selectedCards = computed(() => this.gridService.selectedCards())

  canSend = computed(() => {
    const hasSet = !!this.selectedSet()
    const loading = this.isLoading()
    return hasSet && !loading
  })

  contextInfo = computed(() => {
    const set = this.selectedSet()
    const selectedCount = this.selectedCards().length

    if (!set) return 'Select a set to begin'
    if (this.isGenerateMode()) return set.title
    return selectedCount > 0 ? `${selectedCount} cards selected` : set.title
  })

  placeholder = computed(() => {
    const selectedCount = this.selectedCards().length
    if (this.isGenerateMode()) {
      return 'What flashcards would you like me to create?'
    }
    return selectedCount > 0
      ? `How should I modify the ${selectedCount} selected cards?`
      : 'What changes would you like me to make? (edit content, delete cards, or undo)'
  })

  examplePrompts = computed(() => {
    const hasSelection = this.selectedCards().length > 0
    if (this.isGenerateMode()) {
      return [
        'Create 5 cards about photosynthesis',
        'Generate vocabulary for Spanish',
        'Make history flashcards',
        'Physics formulas',
      ]
    }
    return hasSelection
      ? [
          'Make these harder',
          'Add more detail',
          'Simplify the language',
          'Delete these cards',
        ]
      : [
          'Delete all cards',
          'Make them harder',
          'Simplify the language',
          'Fix any errors',
        ]
  })

  constructor() {
    this.setupPromptProcessing()
  }

  sendMessage(): void {
    const prompt = this.currentPrompt().trim()
    if (!prompt || !this.canSend()) return

    this.addMessage(prompt, true)
    this.currentPrompt.set('')
    this.promptSubject.next(prompt)
  }

  onKeydown(event: Event): void {
    this.handleKeydown(event as KeyboardEvent)
  }

  handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      this.sendMessage()
    }
  }

  trackMessage(_: number, message: ChatMessage): string {
    return message.id
  }

  private setupPromptProcessing(): void {
    this.promptSubject
      .pipe(
        switchMap((prompt) => this.processPrompt(prompt)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => {
          this.isLoading.set(false)
          this.addMessage(response.message, false)
          this.handleResponse(response)
          this.gridService.refreshGrid()
        },
        error: (error) => {
          this.isLoading.set(false)
          this.addMessage(
            `Error: ${error.message || 'Something went wrong'}`,
            false,
          )
        },
      })
  }

  private processPrompt(prompt: string) {
    this.isLoading.set(true)
    const selectedSet = this.selectedSet()

    // Handle client-side undo
    const lowerPrompt = prompt.toLowerCase().trim()
    if (
      (lowerPrompt === 'undo' || lowerPrompt.includes('undo')) &&
      selectedSet
    ) {
      return from(
        this.localStorage
          .undoLastChange(selectedSet.id)
          .then((result) => {
            if (result.success) this.gridService.refreshGrid()
            return { message: result.message }
          })
          .catch(() => ({ message: 'Failed to undo changes' })),
      ).pipe(finalize(() => this.isLoading.set(false)))
    }

    const modelId = MODEL_DETAILS[0].id

    if (this.isGenerateMode()) {
      return this.apiAiService
        .generateFlashcards({
          prompt,
          model_id: modelId,
          system_prompt: this.getGenerateSystemPrompt(),
        })
        .pipe(
          finalize(() => this.isLoading.set(false)),
          catchError(() => EMPTY),
        )
    } else {
      if (!selectedSet) return EMPTY

      return this.apiAiService
        .updateFlashcards({
          prompt,
          model_id: modelId,
          context: this.buildContext(selectedSet),
        })
        .pipe(
          finalize(() => this.isLoading.set(false)),
          catchError(() => EMPTY),
        )
    }
  }

  private async handleResponse(
    response: FlashcardResponse | FlashcardUpdateResponse | { message: string },
  ): Promise<void> {
    if (!response) return

    // Handle simple undo response
    if ('message' in response && Object.keys(response).length === 1) return

    const selectedSet = this.selectedSet()
    if (!selectedSet) return

    // Handle generated cards (generate mode)
    if ('cards' in response && Array.isArray(response.cards)) {
      console.log('📝 Received generated cards:', response.cards.length)
      this.gridService.setGeneratedCards(response.cards)
      return
    }

    // Save snapshot before ANY AI changes (updates or deletions)
    const hasUpdates = 'updates' in response && response.updates?.length > 0
    const hasDeletions =
      'deletions' in response && response.deletions?.length > 0
    const isDeleteMessage =
      'message' in response &&
      response.message?.toLowerCase().includes('delete')

    if (hasUpdates || hasDeletions || isDeleteMessage) {
      const operationType =
        hasDeletions || isDeleteMessage ? 'deletion' : 'update'
      const description =
        ('message' in response
          ? response.message?.substring(0, 80)
          : undefined) || 'Made changes'

      console.log(`💾 Saving undo snapshot before ${operationType}:`, {
        setId: selectedSet.id,
        operation: operationType,
        description,
        hasUpdates,
        hasDeletions,
        updateCount: 'updates' in response ? response.updates?.length || 0 : 0,
        deletionCount:
          'deletions' in response ? response.deletions?.length || 0 : 0,
      })

      await this.localStorage.saveUndoSnapshot(
        selectedSet.id,
        operationType,
        description,
      )
    }

    // Apply changes to local storage
    if ('updates' in response && response.updates?.length > 0) {
      // Parse updates from string array to proper structure
      const parsedUpdates = response.updates.map((update) => {
        if (typeof update === 'string') {
          try {
            return JSON.parse(update) as {
              flashcardId: string
              changes: Partial<Flashcard>
            }
          } catch {
            return { flashcardId: update, changes: {} }
          }
        }
        return update as { flashcardId: string; changes: Partial<Flashcard> }
      })
      await this.applyUpdates(parsedUpdates, selectedSet.id)
    }

    if ('deletions' in response && response.deletions?.length > 0) {
      // Parse deletions to proper structure
      const parsedDeletions = response.deletions.map((deletion) => {
        if (typeof deletion === 'object' && deletion !== null) {
          const record = deletion as Record<string, any>
          return {
            flashcardId:
              record['flashcardId'] ||
              record['id'] ||
              Object.values(record)[0]?.toString() ||
              'unknown',
          }
        }
        return { flashcardId: String(deletion) }
      })
      await this.applyDeletions(parsedDeletions, selectedSet.id)
    }

    // Handle fallback delete all
    if (
      'message' in response &&
      response.message?.toLowerCase().includes('delete') &&
      (!('deletions' in response) ||
        !response.deletions ||
        response.deletions.length === 0)
    ) {
      await this.deleteAllCards(selectedSet.id)
    }
  }

  private async applyUpdates(
    updates: { flashcardId: string; changes: Partial<Flashcard> }[],
    setId: string,
  ): Promise<void> {
    await this.localStorage.updateState((state) => ({
      ...state,
      flashcardSets: state.flashcardSets.map((set) =>
        set.id === setId
          ? {
              ...set,
              flashcards: set.flashcards.map((card) => {
                const update = updates.find((u) => u.flashcardId === card.id)
                return update
                  ? {
                      ...card,
                      ...update.changes,
                      updatedAt: new Date().toISOString(),
                    }
                  : card
              }),
              updatedAt: new Date().toISOString(),
            }
          : set,
      ),
    }))
  }

  private async applyDeletions(
    deletions: { flashcardId: string }[],
    setId: string,
  ): Promise<void> {
    const deleteIds = deletions.map((d) => d.flashcardId)
    await this.localStorage.updateState((state) => ({
      ...state,
      flashcardSets: state.flashcardSets.map((set) =>
        set.id === setId
          ? {
              ...set,
              flashcards: set.flashcards.filter(
                (card) => !deleteIds.includes(card.id),
              ),
              updatedAt: new Date().toISOString(),
            }
          : set,
      ),
    }))
  }

  private async deleteAllCards(setId: string): Promise<void> {
    await this.localStorage.updateState((state) => ({
      ...state,
      flashcardSets: state.flashcardSets.map((set) =>
        set.id === setId
          ? { ...set, flashcards: [], updatedAt: new Date().toISOString() }
          : set,
      ),
    }))
  }

  private buildContext(
    selectedSet: FlashcardSetWithCards,
  ): GridPromptContextDto {
    const selectedCards = this.selectedCards()
    return {
      setId: selectedSet.id,
      setTitle: selectedSet.title,
      selectedCards: selectedCards.map(
        (card: GridRow) =>
          ({
            flashcardId: card.flashcardId,
            front: card.front,
            back: card.back,
            position: card.position ?? 0,
            difficulty: card.difficulty,
          } as SelectedCardDto),
      ),
      totalCards: selectedSet.flashcards?.length || 0,
      scope:
        selectedCards.length > 0
          ? GridPromptContextDto.scope.SELECTED
          : GridPromptContextDto.scope.FULLSET,
    }
  }

  private getGenerateSystemPrompt(): string {
    return `You are an AI assistant specialized in creating educational flashcards.

AVAILABLE FUNCTIONS:
- CREATE flashcards: Generate new flashcards on any topic

IMPORTANT RULES:
1. You can ONLY create/generate flashcards - no other operations are possible
2. If the user asks for something other than creating flashcards, politely explain you can only generate new flashcards
3. For anything unrelated to flashcard creation, say: "I can only help with creating new flashcards. Could you specify what flashcards you'd like me to generate?"

Always create clear, accurate, and educational flashcards when the request is valid.`
  }

  private addMessage(text: string, isUser: boolean): void {
    const message: ChatMessage = {
      id: crypto.randomUUID(),
      text,
      isUser,
      timestamp: new Date(),
    }
    this.messages.update((msgs) => [...msgs, message])
    setTimeout(() => {
      const container = document.querySelector('.overflow-y-auto')
      if (container) container.scrollTop = container.scrollHeight
    }, 0)
  }
}
