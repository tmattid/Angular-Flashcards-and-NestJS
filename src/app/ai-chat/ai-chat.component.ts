import { Component, inject, input } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { CommonModule } from '@angular/common'

import { FlashcardCDKService } from './services/flashcard-cdk-service.service'
// import { FlashcardListComponent } from '../card-list/flashcard-list.component'
import { FlashcardSetSelectorComponent } from '../flashcard-set-selection/flashcard-set-selector.component'
import { AiPromptComponent } from './chat/ai-prompt.component'
import { AiModelSelectorComponent } from './chat/ai-model-selector.component'
import { AiGridPromptComponent } from './chat/ai-grid-prompt.component'

@Component({
  selector: 'app-ai-chat',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AiModelSelectorComponent,
    AiPromptComponent,
    AiGridPromptComponent,
  ],
  template: `

      <div class="app-content-wrapper">
        <!-- Sidebar Section -->
        <aside class="app-sidebar">
          <app-ai-model-selector />
          @if (activeTab() === 1) {
            <app-ai-prompt />
          } @else {
            <app-ai-grid-prompt [activeFeature]="activeTab()" />
          }
        </aside>


      </div>

  `,
  styles: [
    `

      .app-content-wrapper {
        @apply flex flex-row gap-4 h-full w-full;
      }
      .app-sidebar {
        @apply flex flex-col gap-3 w-full;
      }
    `,
  ],
})
export class AiChatComponent {
  flashcardCDKService = inject(FlashcardCDKService)
  activeTab = input<number>(0)
}
