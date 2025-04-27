import {
  Component,
  computed,
  inject,
  signal,
  OnDestroy,
  input,
} from '@angular/core'
import { FormsModule } from '@angular/forms'
import { CommonModule } from '@angular/common'
import { catchError, EMPTY, finalize, Subject, switchMap } from 'rxjs'
import { AiGridService } from '../../services/ai-llms/ai-grid.service'
import { SetSelectionService } from '../../services/set-selection.service'
import { LocalStorageService } from '../../services/state/local-storage.service'
import { GridApi, GridReadyEvent } from 'ag-grid-community'
import { GridRow } from '../../dashboard/main-grid/ag-grid.component'
import { ModelId } from '../../models/ai-http-service/ai-models.model'
import { SelectionService } from '../../services/selection.service'
import { TuiButton } from '@taiga-ui/core'
import { TuiTextareaModule } from '@taiga-ui/legacy'
interface ChatMessage {
  text: string
  isUser: boolean
}

interface GridPromptContext {
  setId: string
  setTitle: string
  selectedCards: Array<{
    flashcardId: string
    front: string
    back: string
    position: number
    difficulty: Record<string, any> | undefined
  }>
  totalCards: number
  scope: 'selected' | 'fullset'
}

@Component({
  selector: 'app-ai-grid-prompt',
  standalone: true,
  imports: [FormsModule, CommonModule, TuiButton, TuiTextareaModule],
  template: `
    <div class="flex flex-col h-full rounded-lg shadow">
      <!-- Context Information -->
      <div class="p-4 border-b bg-gray-50 dark:bg-gray-900">
        <div class="text-sm text-gray-600 dark:text-gray-300">
          {{ contextMessage() }}
        </div>
        @if (selectedRows().length > 0) {
        <div class="mt-2 text-xs text-blue-600 dark:text-blue-400">
          Selected cards: {{ selectedRows().length }}
        </div>
        }
      </div>

      <!-- Chat Messages Area -->
      <div class="flex-1 overflow-y-auto p-4 space-y-4 min-h-[2rem]">
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
                : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
            "
            class="rounded-lg p-3 max-w-[70%] shadow-md"
          >
            <p class="whitespace-pre-wrap break-words text-sm">
              {{ message.text }}
            </p>
          </div>
        </div>
      </div>

      <!-- Input Area -->
      <div class="border-t p-4 bg-gray-50 dark:bg-gray-900">
        <div class="flex gap-2">
          <tui-textarea
            [ngModel]="prompt()"
            (ngModelChange)="prompt.set($event)"
            class="flex-1"
          >
            <textarea
              [disabled]="isLoading()"
              [placeholder]="getPlaceholder()"
              (keydown.enter)="$event.preventDefault(); sendPrompt()"
              tuiTextfieldLegacy
            ></textarea>
          </tui-textarea>
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
      :host {
        display: block;
        height: 100%;
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
    `,
  ],
})
export class AiGridPromptComponent implements OnDestroy {
  private readonly aiGridService = inject(AiGridService)
  private readonly setSelectionService = inject(SetSelectionService)
  private readonly localStorageService = inject(LocalStorageService)
  private readonly promptSubject = new Subject<string>()
  private readonly selectionService = inject(SelectionService)
  private gridApi: GridApi<GridRow> | null = null
  activeFeature = input<number>(0)

  messages = signal<ChatMessage[]>([])
  prompt = signal('')
  isLoading = signal(false)
  selectedRows = this.selectionService.getSelectedRows()
  currentModel = signal<ModelId>('openai/gpt-4o-2024-11-20')

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

  getPlaceholder(): string {
    const hasSelection = this.selectedRows().length > 0
    return hasSelection
      ? 'Ask me about the selected flashcards...'
      : 'Select flashcards to get specific help, or ask about the entire set...'
  }

  private getPromptContext(): GridPromptContext | null {
    const selectedSet = this.setSelectionService.getSelectedSet()
    if (!selectedSet) return null

    return {
      setId: selectedSet.id,
      setTitle: selectedSet.title,
      selectedCards: this.selectedRows().map((row) => ({
        flashcardId: row.flashcardId,
        front: row.front,
        back: row.back,
        position: row.position,
        difficulty: row.difficulty ? { value: row.difficulty } : undefined,
      })),
      totalCards: selectedSet.flashcards.length,
      scope: this.selectedRows().length > 0 ? 'selected' : 'fullset',
    }
  }

  sendPrompt(): void {
    const currentPrompt = this.prompt()
    if (!currentPrompt.trim()) return

    const context = this.getPromptContext()
    if (!context) {
      this.messages.update((msgs) => [
        ...msgs,
        { text: 'Please select a flashcard set first.', isUser: false },
      ])
      return
    }

    this.messages.update((msgs) => [
      ...msgs,
      { text: currentPrompt, isUser: true },
    ])
    this.isLoading.set(true)
    this.promptSubject.next(currentPrompt)
    this.prompt.set('')
  }

  onGridReady(params: GridReadyEvent<GridRow>) {
    this.gridApi = params.api
  }

  constructor() {
    this.promptSubject
      .pipe(
        switchMap((prompt) =>
          this.aiGridService
            .generateGridUpdates(
              prompt,
              this.getPromptContext()!,
              this.currentModel(),
            )
            .pipe(
              catchError((error) => {
                console.error('Error:', error)
                this.messages.update((msgs) => [
                  ...msgs,
                  {
                    text:
                      'Sorry, I encountered an error while processing your request.',
                    isUser: false,
                  },
                ])
                return EMPTY
              }),
              finalize(() => this.isLoading.set(false)),
            ),
        ),
      )
      .subscribe((response) => {
        if (response.message) {
          this.messages.update((msgs) => [
            ...msgs,
            { text: response.message, isUser: false },
          ])

          if (response.updates) {
            this.applyUpdatesToSelectedCards(response.updates)
          }
        }
      })
  }

  private applyUpdatesToSelectedCards(
    updates: Array<{
      flashcardId: string
      changes: Partial<Pick<GridRow, 'front' | 'back' | 'difficulty'>>
    }>,
  ) {
    if (!this.gridApi) return

    // Update the grid
    updates.forEach((update) => {
      const rowNode = this.gridApi!.getRowNode(update.flashcardId)
      if (rowNode && rowNode.data) {
        rowNode.setData({
          ...rowNode.data,
          ...update.changes,
        } as GridRow)
      }
    })

    // Update local storage using existing updateState method
    this.localStorageService.updateState((current) => ({
      ...current,
      flashcardSets: current.flashcardSets.map((set) => ({
        ...set,
        flashcards: set.flashcards.map((card) => {
          const update = updates.find((u) => u.flashcardId === card.id)
          if (update) {
            this.localStorageService.markDirty(card.id)
            return {
              ...card,
              ...update.changes,
              difficulty: update.changes.difficulty
                ? { value: update.changes.difficulty }
                : undefined,
            }
          }
          return card
        }),
      })),
    }))
  }

  ngOnDestroy(): void {
    if (this.gridApi) {
      this.gridApi.destroy()
    }
  }
}
