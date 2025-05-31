import {
  Component,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core'
import { ICellRendererAngularComp } from 'ag-grid-angular'
import { ICellRendererParams } from 'ag-grid-community'
import { Flashcard } from '../../../api'

@Component({
  selector: 'app-flashcard-detail-renderer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="detail-container p-4">
      <!-- Fixed Header -->
      <div class="header-row">
        <div class="header-cell">Front</div>
        <div class="header-cell">Back</div>
      </div>

      <!-- Scrollable Content -->
      <div class="content-area">
        @if (flashcards.length === 0) {
        <div class="empty-state">
          <p class="text-gray-500 mb-1">No cards in this set</p>
          <p class="text-sm text-gray-400">Edit the set to add cards</p>
        </div>
        } @else { @for (card of flashcards; track card.id) {
        <div class="card-row">
          <div class="card-cell">
            <div class="card-content">{{ card.front }}</div>
          </div>
          <div class="card-cell">
            <div class="card-content">{{ card.back }}</div>
          </div>
        </div>
        } }
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
      }
      .detail-container {
        display: flex;
        flex-direction: column;
        height: 16rem;
        width: 100%;
      }
      .header-row {
        display: flex;
        background-color: #f3f4f6;
        border-bottom: 1px solid #e5e7eb;
        padding: 8px 0;
      }
      :host-context(.dark-theme) .header-row {
        background-color: #374151;
        border-bottom: 1px solid #4b5563;
      }
      .header-cell {
        flex: 1;
        font-weight: 600;
        padding: 0 12px;
      }
      .content-area {
        flex: 1;
        overflow-y: auto;
      }
      .card-row {
        display: flex;
        border-bottom: 1px solid #e5e7eb;
      }
      :host-context(.dark-theme) .card-row {
        border-bottom: 1px solid #4b5563;
      }
      .card-row:hover {
        background-color: #f9fafb;
      }
      :host-context(.dark-theme) .card-row:hover {
        background-color: #1f2937;
      }
      .card-cell {
        flex: 1;
        padding: 12px;
        word-wrap: break-word;
        word-break: break-word;
        overflow-wrap: break-word;
      }
      .card-content {
        white-space: pre-wrap;
        line-height: 1.5;
      }
      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        padding: 20px;
        text-align: center;
      }
    `,
  ],
})
export class FlashcardDetailRendererComponent
  implements ICellRendererAngularComp {
  flashcards: Flashcard[] = []

  constructor(private cdr: ChangeDetectorRef) {}

  agInit(params: ICellRendererParams): void {
    this.flashcards = params.data?.flashcards || []
  }

  refresh(params: ICellRendererParams): boolean {
    this.flashcards = params.data?.flashcards || []
    this.cdr.detectChanges()
    return true
  }
}
