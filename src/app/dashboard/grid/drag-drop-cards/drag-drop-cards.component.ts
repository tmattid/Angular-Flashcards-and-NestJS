import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
} from '@angular/core'
import { CommonModule } from '@angular/common'
import { DragDropModule, CdkDragDrop } from '@angular/cdk/drag-drop'

// Types
import { Flashcard } from '../../../api'
import { GridRow } from '../grid.types'

/**
 * Drag and Drop Cards Component
 * Handles the visual drag-and-drop interface for managing flashcards
 * between generated cards and set cards
 */
@Component({
  selector: 'app-drag-drop-cards',
  standalone: true,
  imports: [CommonModule, DragDropModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-1 gap-4 h-full p-4">
      <!-- Newly Generated Cards (Left) -->
      <div class="flex flex-col flex-1 h-full min-h-0">
        <div
          class="flex items-center justify-between mb-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg flex-shrink-0"
        >
          <h3 class="font-semibold text-green-800 dark:text-green-200">
            ✨ Generated Cards ({{ newCards().length }})
          </h3>
          @if (newCards().length > 0) {
          <button
            (click)="addAllCards.emit()"
            class="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm font-medium transition-colors"
          >
            Add All to Set
          </button>
          }
        </div>

        <div
          cdkDropList
          #newCardsList="cdkDropList"
          id="newCardsList"
          [cdkDropListData]="newCardsArray"
          [cdkDropListConnectedTo]="['setCardsList']"
          (cdkDropListDropped)="onDrop($event)"
          class="flex-1 min-h-0 p-4 border-2 border-dashed border-green-300 dark:border-green-600 rounded-lg overflow-y-auto"
        >
          @if (newCards().length === 0) {
          <div class="text-center text-gray-500 dark:text-gray-400 mt-8">
            <svg
              class="w-12 h-12 mx-auto mb-3 opacity-50"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1"
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            <p>AI-generated cards will appear here</p>
            <p class="text-sm mt-1">Use the chat to create new flashcards</p>
          </div>
          } @else { @for (card of newCards(); track card.id; let i = $index) {
          <div
            cdkDrag
            [cdkDragData]="card"
            class="border rounded-lg p-4 shadow-sm mb-2 cursor-move bg-white dark:bg-gray-800 hover:shadow-md transition-shadow"
          >
            <div
              class="font-bold mb-2 text-sm text-gray-600 dark:text-gray-400"
            >
              Front:
            </div>
            <div class="p-2 bg-gray-50 dark:bg-gray-700 rounded mb-3 text-sm">
              {{ card['front'] }}
            </div>
            <div
              class="font-bold mb-2 text-sm text-gray-600 dark:text-gray-400"
            >
              Back:
            </div>
            <div class="p-2 bg-gray-50 dark:bg-gray-700 rounded text-sm">
              {{ card['back'] }}
            </div>
          </div>
          } }
        </div>
      </div>

      <!-- Cards in Selected Set (Right) -->
      <div class="flex flex-col flex-1 h-full min-h-0">
        <div
          class="mb-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex-shrink-0"
        >
          <h3 class="font-semibold text-blue-800 dark:text-blue-200">
            📚 {{ selectedSetTitle() || 'No Set Selected' }} ({{
              setCards().length
            }})
          </h3>
        </div>

        <div
          cdkDropList
          #setCardsList="cdkDropList"
          id="setCardsList"
          [cdkDropListData]="setCardsArray"
          [cdkDropListConnectedTo]="['newCardsList']"
          (cdkDropListDropped)="onDrop($event)"
          class="flex-1 min-h-0 p-4 border-2 border-dashed border-blue-300 dark:border-blue-600 rounded-lg overflow-y-auto"
        >
          @if (setCards().length === 0) {
          <div class="text-center text-gray-500 dark:text-gray-400 mt-8">
            <svg
              class="w-12 h-12 mx-auto mb-3 opacity-50"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1"
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012 2v2M7 7h10"
              />
            </svg>
            @if (!selectedSetTitle()) {
            <p>Please select a flashcard set</p>
            } @else {
            <p>No cards in this set yet</p>
            <p class="text-sm mt-1">Generate some cards to get started!</p>
            }
          </div>
          } @else { @for (card of setCards(); track card.flashcardId; let i = $index) {
          <div
            cdkDrag
            [cdkDragData]="card"
            class="border rounded-lg p-4 shadow-sm mb-2 cursor-move bg-white dark:bg-gray-800 hover:shadow-md transition-shadow"
          >
            <div
              class="font-bold mb-2 text-sm text-gray-600 dark:text-gray-400"
            >
              Front:
            </div>
            <div class="p-2 bg-gray-50 dark:bg-gray-700 rounded mb-3 text-sm">
              {{ card['front'] }}
            </div>
            <div
              class="font-bold mb-2 text-sm text-gray-600 dark:text-gray-400"
            >
              Back:
            </div>
            <div class="p-2 bg-gray-50 dark:bg-gray-700 rounded text-sm">
              {{ card['back'] }}
            </div>
          </div>
          } }
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      /* Ensure proper height and overflow for the component */
      :host {
        display: flex;
        flex-direction: column;
        height: 100%;
        min-height: 0;
      }

      /* Ensure drag placeholder has proper styling */
      :host ::ng-deep .cdk-drag-placeholder {
        opacity: 0.4;
        background: #e0e0e0;
        border: 2px dashed #999;
        transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
      }

      :host ::ng-deep .cdk-drag-animating {
        transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
      }

      /* Ensure drop lists have proper scrolling */
      :host ::ng-deep .cdk-drop-list {
        height: 100%;
        overflow-y: auto;
      }

      /* Style for when dragging over a list */
      :host ::ng-deep .cdk-drop-list-dragging .cdk-drag-placeholder {
        background: #c8e6c9;
        border-color: #4caf50;
      }

      /* Visual feedback when dragging */
      :host ::ng-deep .cdk-drag-preview {
        box-shadow: 0 5px 10px rgba(0, 0, 0, 0.3);
        opacity: 0.9;
      }
    `,
  ],
})
export class DragDropCardsComponent {
  // Input properties for data binding
  @Input({ required: true }) newCards!: () => Flashcard[]
  @Input({ required: true }) setCards!: () => GridRow[]
  @Input({ required: true }) selectedSetTitle!: () => string | null

  // Output events
  @Output() cardDropped = new EventEmitter<{
    event: CdkDragDrop<any[]>
    isMovingToSet: boolean
  }>()
  @Output() addAllCards = new EventEmitter<void>()

  // Computed arrays for CDK drag-drop (it needs actual arrays, not signals)
  get newCardsArray(): Flashcard[] {
    return this.newCards()
  }

  get setCardsArray(): GridRow[] {
    return this.setCards()
  }

  onDrop(event: CdkDragDrop<any[]>): void {
    // Don't emit if dropping in the same position
    if (event.previousContainer === event.container && event.previousIndex === event.currentIndex) {
      return
    }

    // Determine if we're moving to the set
    const isMovingToSet = event.container.id === 'setCardsList'

    // Emit the event with additional context
    this.cardDropped.emit({ event, isMovingToSet })
  }
}
