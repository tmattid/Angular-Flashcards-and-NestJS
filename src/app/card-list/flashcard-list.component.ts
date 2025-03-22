import { Component, inject, Input, TrackByFunction } from '@angular/core'
import { CommonModule } from '@angular/common'
import { CdkDragDrop, transferArrayItem } from '@angular/cdk/drag-drop'
import { DragDropModule } from '@angular/cdk/drag-drop'
import { Flashcard } from '../models/flashcards.models'
import { FlashcardCDKService } from '../ai-chat/services/flashcard-cdk-service.service'

@Component({
  selector: 'app-flashcard-list',
  standalone: true,
  imports: [CommonModule, DragDropModule],
  template: `
    <div class="flex flex-col h-full p-2">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 overflow-hidden">
        <!-- Generated (new) flashcards drop zone -->
        <div class="flex flex-col h-full overflow-hidden">
          <h3 class="text-lg font-bold mb-2 flex-shrink-0">
            Newly Generated Cards
          </h3>
          <div
            id="new-flashcards"
            cdkDropList
            [cdkDropListData]="flashcardCDKService.newFlashcards()"
            [cdkDropListConnectedTo]="['selected-flashcards']"
            (cdkDropListDropped)="onDrop($event)"
            class="bg-gray-100 p-4 rounded border-2 border-dashed border-gray-300 flex-1 overflow-y-auto"
          >
            <div
              *ngFor="
                let card of flashcardCDKService.newFlashcards();
                trackBy: trackByCard;
                index as i
              "
              cdkDrag
              class="border rounded-lg p-4  shadow mb-2 cursor-move relative group hover:shadow-lg transition-shadow"
            >
              <div class="font-bold mb-2">Front:</div>
              <div class="p-2rounded mb-4">{{ card.front }}</div>
              <div class="font-bold mb-2">Back:</div>
              <div class="p-2rounded">{{ card.back }}</div>
            </div>
            <div
              *ngIf="flashcardCDKService.newFlashcards().length === 0"
              class="text-gray-500 text-center py-8"
            >
              No new cards generated yet
            </div>
          </div>
        </div>

        <!-- Selected flashcard set drop zone -->
        <div class="flex flex-col h-full overflow-hidden">
          <h3 class="text-lg font-bold mb-2 flex-shrink-0">
            {{
              flashcardCDKService.selectedSetId()
                ? 'Cards in Selected Set'
                : 'Create or Select a Set'
            }}
          </h3>
          <div
            id="selected-flashcards"
            cdkDropList
            [cdkDropListData]="flashcardCDKService.selectedSetCards()"
            [cdkDropListConnectedTo]="['new-flashcards']"
            (cdkDropListDropped)="onDrop($event)"
            class="bg-gray-100 p-4 rounded border-2 border-dashed border-gray-300 flex-1 overflow-y-auto"
          >
            <div
              *ngFor="
                let card of flashcardCDKService.selectedSetCards();
                trackBy: trackByCard;
                index as i
              "
              cdkDrag
              class="border rounded-lg p-4 shadow mb-2 cursor-move relative group hover:shadow-lg transition-shadow"
            >
              <div class="font-bold mb-2">Front:</div>
              <div class="p-2rounded mb-4">{{ card.front }}</div>
              <div class="font-bold mb-2">Back:</div>
              <div class="p-2rounded">{{ card.back }}</div>
            </div>
            <div
              *ngIf="flashcardCDKService.selectedSetCards().length === 0"
              class="text-gray-500 text-center py-8"
            >
              {{
                flashcardCDKService.selectedSetId()
                  ? 'No cards in set yet'
                  : 'Select or create a set first'
              }}
            </div>
          </div>
        </div>
      </div>
      <!-- <button (click)="saveSet()">Save Set</button> -->
    </div>
  `,
  styles: [
    `
      .cdk-drag-preview {
        @apply shadow-xl  border rounded-lg p-4;
      }
      .cdk-drag-placeholder {
        opacity: 0;
      }
      .cdk-drag-animating {
        transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
      }
      .cdk-drop-list-dragging .cdk-drag {
        transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
      }
    `,
  ],
})
export class FlashcardListComponent {
  @Input() flashcards: Flashcard[] = []
  readonly flashcardCDKService = inject(FlashcardCDKService)

  trackByCard: TrackByFunction<Flashcard> = (
    index: number,
    card: Flashcard,
  ): string => {
    return card.id
  }

  onDrop(event: CdkDragDrop<Flashcard[]>): void {
    if (event.previousContainer === event.container) {
      const cards = event.container.data
      cards.splice(
        event.currentIndex,
        0,
        cards.splice(event.previousIndex, 1)[0],
      )
      this.updateCardPositions()
    } else {
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex,
      )
      this.updateCardPositions()
    }
  }

  private updateCardPositions(): void {
    this.flashcardCDKService.updateCardPositions(
      this.flashcardCDKService.newFlashcards(),
      'new',
    )
    this.flashcardCDKService.updateCardPositions(
      this.flashcardCDKService.selectedSetCards(),
      'selected',
    )
  }

  saveSet(): void {
    this.flashcardCDKService.saveSelectedSet()
  }
}
