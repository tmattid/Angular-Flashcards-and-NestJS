import { Component } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FlashcardSetSelectorComponent } from '../../flashcard-set-selection/flashcard-set-selector.component'
import { AiChatComponent } from '../../ai-chat/ai-chat.component'

@Component({
  selector: 'app-grid-chat-box',
  standalone: true,
  imports: [CommonModule, FlashcardSetSelectorComponent, AiChatComponent],
  template: `
    <div class="chat-sidebar">
      <div class="selector-container">
        <app-flashcard-set-selector
          [activeTab]="0"
        ></app-flashcard-set-selector>
      </div>
      <div class="chat-container">
        <app-ai-chat [activeTab]="0"></app-ai-chat>
      </div>
    </div>
  `,
  styles: [
    `
      .chat-sidebar {
        @apply flex flex-col bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg;
        width: 100%;
        min-width: 400px;
        height: 100%;
      }

      .selector-container {
        @apply p-3 border-b border-gray-300 dark:border-gray-700;
        flex: 0 0 auto;
      }

      .chat-container {
        @apply p-3;
        flex: 1 1 auto;
        min-height: 0;
        overflow: hidden;
      }
    `,
  ],
})
export class GridChatBoxComponent {}
