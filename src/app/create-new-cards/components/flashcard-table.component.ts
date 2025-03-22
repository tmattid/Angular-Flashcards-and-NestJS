import {
  Component,
  Input,
  computed,
  signal,
  EventEmitter,
  Output,
  inject,
} from '@angular/core'
import { CommonModule } from '@angular/common'
import { FlashcardSetWithCards } from '../../models/flashcards.models'
import { Flashcard } from '../../models/flashcards.models'
import { LocalStorageService } from '../../services/state/local-storage.service'

@Component({
  selector: 'app-flashcard-table',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="currentFlashcardSet()" class="mt-8">
      <h2 class="text-xl font-bold mb-4">
        Flashcards in Set: {{ currentFlashcardSet()?.title }}
      </h2>
      <div class="overflow-x-auto">
        <table
          class="min-w-full leading-normal shadow-md rounded-lg overflow-hidden"
        >
          <thead>
            <tr>
              <th
                class="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold  uppercase tracking-wider"
              >
                Front
              </th>
              <th
                class="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold  uppercase tracking-wider"
              >
                Back
              </th>
              <th
                class="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold  uppercase tracking-wider"
              >
                Difficulty
              </th>
              <th
                class="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold  uppercase tracking-wider"
              >
                Tags
              </th>
            </tr>
          </thead>
          <tbody>
            @for (card of sortedFlashcards(); track card.id) {
            <tr
              (click)="onCardSelect(card)"
              class="cursor-pointer hover:bg-gray-50 transition-colors"
              [class.bg-blue-50]="selectedCardId() === card.id"
            >
              <td class="px-5 py-5 border-b border-gray-200 text-sm">
                {{ card.front }}
              </td>
              <td class="px-5 py-5 border-b border-gray-200 text-sm">
                {{ card.back }}
              </td>
              <td class="px-5 py-5 border-b border-gray-200 text-sm">
                {{ card.difficulty }}
              </td>
              <td class="px-5 py-5 border-b border-gray-200 text-sm">
                {{ card.tags?.join(', ') }}
              </td>
            </tr>
            } @empty {
            <tr>
              <td colspan="4" class="px-5 py-5 text-center text-gray-500">
                No flashcards yet
              </td>
            </tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
})
export class FlashcardTableComponent {
  private localStorageService = inject(LocalStorageService)
  private setId = signal<string | undefined>(undefined)
  selectedCardId = signal<string | undefined>(undefined)

  @Input({ required: true }) set flashcardSet(
    value: FlashcardSetWithCards | undefined,
  ) {
    this.setId.set(value?.id)
  }

  // Computed signal that always reflects current state from localStorage
  readonly currentFlashcardSet = computed(() => {
    const id = this.setId()
    if (!id) return undefined

    return this.localStorageService
      .getState()
      .flashcardSets.find((set) => set.id === id)
  })

  // Computed signal for sorted flashcards
  readonly sortedFlashcards = computed(
    () =>
      this.currentFlashcardSet()
        ?.flashcards.slice()
        .sort((a, b) => a.position - b.position) ?? [],
  )

  @Output() cardSelect = new EventEmitter<
    Omit<Flashcard, 'flashcard_set_id'> & { position?: number }
  >()

  onCardSelect(
    card: Omit<Flashcard, 'flashcard_set_id'> & { position?: number },
  ): void {
    this.selectedCardId.set(card.id)
    this.cardSelect.emit({
      ...card,
      position: card.position ?? 0,
    })
  }
}
