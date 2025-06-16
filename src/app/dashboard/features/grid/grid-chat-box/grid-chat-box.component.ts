import {
  Component,
  signal,
  computed,
  inject,
  OnInit,
  OnDestroy,
} from '@angular/core'
import { CommonModule } from '@angular/common'
import { Subject, takeUntil } from 'rxjs'

import { AiChatComponent } from '../../../../ai-chat/ai-chat.component'
import { AiModelSelectorComponent } from '../../../../ai-chat/chat/ai-model-selector.component'
import { SetManagementSidebarComponent } from '../update-flashcards/set-sidebar/set-management-sidebar/set-management-sidebar.component'
import { SetSelectionService } from '../../../../services/set-selection.service'
import { AiService } from '../../../../services/ai-llms/ai.service'

@Component({
  selector: 'app-grid-chat-box',
  standalone: true,
  imports: [
    CommonModule,
    SetManagementSidebarComponent,
    AiChatComponent,
    AiModelSelectorComponent,
  ],
  template: `
    <div class="chat-box-container">
      <!-- Header Section -->
      <div class="chat-box-header">
        <div class="header-content">
          <div class="header-title">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
              Workspace
            </h2>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              Manage sets and chat with AI
            </p>
          </div>

          <!-- Panel Toggle Buttons -->
          <div class="panel-toggles">
            <button
              (click)="toggleSetsPanel()"
              [class]="setPanelButtonClass()"
              class="toggle-button"
              type="button"
              aria-label="Toggle sets panel"
            >
              <svg
                class="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 11H5m14-7l-7 7-7-7m14 18l-7-7-7 7"
                />
              </svg>
              Sets
            </button>

            <button
              (click)="toggleChatPanel()"
              [class]="chatPanelButtonClass()"
              class="toggle-button"
              type="button"
              aria-label="Toggle chat panel"
            >
              <svg
                class="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a9.863 9.863 0 01-4.906-1.294A6 6 0 003 18.75V10.5a6 6 0 006-6h10.5A2.5 2.5 0 0121 7v5z"
                />
              </svg>
              AI Chat
            </button>
          </div>
        </div>
      </div>

      <!-- Model Selector Bar -->
      <div class="model-selector-bar" [class.hidden]="!showChatPanel()">
        <div class="model-selector-content">
          <div class="model-info">
            <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
              AI Model:
            </span>
            <span class="text-sm text-gray-600 dark:text-gray-400">
              {{ aiService.selectedModel().name }}
            </span>
          </div>
          <div class="model-selector-wrapper">
            <app-ai-model-selector />
          </div>
        </div>
      </div>

      <!-- Main Content Area -->
      <div class="chat-box-content" [class]="contentLayoutClass()">
        <!-- Sets Panel -->
        <div
          class="sets-panel"
          [class]="setPanelClass()"
          [attr.aria-hidden]="!showSetsPanel()"
        >
          <div class="panel-header">
            <h3 class="panel-title">
              Flashcard Sets
            </h3>
            <span class="set-count-badge" *ngIf="selectedSetInfo()">
              {{ selectedSetInfo()?.cardCount }} cards
            </span>
          </div>

          <div class="panel-content">
            <app-set-management-sidebar></app-set-management-sidebar>
          </div>
        </div>

        <!-- Resizer (for desktop) -->
        <div
          class="panel-resizer"
          [class.hidden]="!showBothPanels()"
          (mousedown)="startResize($event)"
        >
          <div class="resizer-handle"></div>
        </div>

        <!-- Chat Panel -->
        <div
          class="chat-panel"
          [class]="chatPanelClass()"
          [attr.aria-hidden]="!showChatPanel()"
        >
          <div class="panel-header">
            <h3 class="panel-title">
              AI Assistant
            </h3>
            <div class="chat-status">
              <div class="status-indicator" [class]="aiStatusClass()"></div>
              <span class="text-xs text-gray-500 dark:text-gray-400">
                {{ aiStatusText() }}
              </span>
            </div>
          </div>

          <div class="panel-content chat-content">
            <app-ai-chat [activeTab]="0" class="h-full w-full"></app-ai-chat>
          </div>
        </div>
      </div>

      <!-- Loading Overlay -->
      <div
        class="loading-overlay"
        [class.hidden]="!isLoading()"
        role="status"
        aria-label="Loading"
      >
        <div class="loading-spinner">
          <div class="spinner"></div>
          <p class="loading-text">Loading workspace...</p>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .chat-box-container {
        @apply flex flex-col h-full bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 rounded-xl shadow-lg overflow-hidden;
        min-width: 400px;
        position: relative;
      }

      .chat-box-header {
        @apply flex-shrink-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700;
        padding: 1rem 1.25rem;
      }

      .header-content {
        @apply flex items-center justify-between w-full;
      }

      .header-title h2 {
        @apply text-lg font-semibold text-gray-900 dark:text-white mb-0;
      }

      .header-title p {
        @apply text-sm text-gray-500 dark:text-gray-400 mt-0;
      }

      .panel-toggles {
        @apply flex gap-2;
      }

      .toggle-button {
        @apply inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200;
        @apply border border-gray-200 dark:border-gray-600;
        @apply hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1;
      }

      .toggle-button.active {
        @apply bg-blue-600 text-white border-blue-600 shadow-sm;
      }

      .toggle-button.inactive {
        @apply bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300;
        @apply hover:bg-gray-50 dark:hover:bg-gray-600;
      }

      .model-selector-bar {
        @apply flex-shrink-0 bg-gray-50/80 dark:bg-gray-700/80 border-b border-gray-200 dark:border-gray-600;
        padding: 0.75rem 1.25rem;
        transition: all 0.3s ease-in-out;
      }

      .model-selector-content {
        @apply flex items-center justify-between w-full;
      }

      .model-info {
        @apply flex items-center gap-2;
      }

      .model-selector-wrapper {
        @apply max-w-xs;
      }

      .chat-box-content {
        @apply flex-1 flex overflow-hidden;
        min-height: 0;
      }

      .content-layout-both {
        @apply flex-row;
      }

      .content-layout-sets-only .chat-panel,
      .content-layout-chat-only .sets-panel {
        @apply hidden;
      }

      .content-layout-sets-only .sets-panel,
      .content-layout-chat-only .chat-panel {
        @apply w-full;
      }

      .sets-panel {
        @apply flex flex-col bg-white dark:bg-gray-800;
        flex: 1 1 40%;
        min-width: 0;
        transition: all 0.3s ease-in-out;
      }

      .chat-panel {
        @apply flex flex-col bg-white dark:bg-gray-800;
        flex: 1 1 60%;
        min-width: 0;
        transition: all 0.3s ease-in-out;
      }

      .panel-resizer {
        @apply flex-shrink-0 w-1 bg-gray-200 dark:bg-gray-700 cursor-col-resize relative;
        @apply hover:bg-blue-300 dark:hover:bg-blue-600 transition-colors duration-200;
      }

      .panel-resizer:hover .resizer-handle {
        @apply opacity-100;
      }

      .resizer-handle {
        @apply absolute inset-y-0 left-1/2 w-1 bg-blue-500 rounded-full opacity-0 transition-opacity;
        transform: translateX(-50%);
      }

      .panel-header {
        @apply flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50;
      }

      .panel-title {
        @apply text-sm font-semibold text-gray-900 dark:text-white;
      }

      .set-count-badge {
        @apply inline-flex items-center px-2 py-1 text-xs font-medium rounded-full;
        @apply bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200;
      }

      .chat-status {
        @apply flex items-center gap-2;
      }

      .status-indicator {
        @apply w-2 h-2 rounded-full;
        transition: all 0.3s ease-in-out;
      }

      .status-indicator.online {
        @apply bg-green-500;
        box-shadow: 0 0 0 2px rgba(34, 197, 94, 0.2);
      }

      .status-indicator.busy {
        @apply bg-yellow-500;
        box-shadow: 0 0 0 2px rgba(234, 179, 8, 0.2);
      }

      .status-indicator.offline {
        @apply bg-gray-400;
      }

      .panel-content {
        @apply flex-1 overflow-hidden;
      }

      .chat-content {
        @apply p-4;
      }

      .loading-overlay {
        @apply absolute inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm;
        @apply flex items-center justify-center z-50;
        transition: opacity 0.3s ease-in-out;
      }

      .loading-spinner {
        @apply flex flex-col items-center gap-3;
      }

      .spinner {
        @apply w-8 h-8 border-2 border-gray-200 dark:border-gray-700 border-t-blue-600 rounded-full animate-spin;
      }

      .loading-text {
        @apply text-sm text-gray-600 dark:text-gray-400 font-medium;
      }

      .hidden {
        display: none !important;
      }

      /* Responsive design */
      @media (max-width: 768px) {
        .chat-box-container {
          min-width: 320px;
        }

        .header-content {
          @apply flex-col gap-3 items-start;
        }

        .panel-toggles {
          @apply w-full justify-center;
        }

        .toggle-button {
          @apply flex-1 justify-center;
        }

        .model-selector-content {
          @apply flex-col gap-2 items-start;
        }

        .model-selector-wrapper {
          @apply w-full max-w-none;
        }

        .panel-resizer {
          @apply hidden;
        }

        .content-layout-both {
          @apply flex-col;
        }

        .sets-panel,
        .chat-panel {
          @apply w-full;
          flex: none;
        }
      }
    `,
  ],
})
export class GridChatBoxComponent implements OnInit, OnDestroy {
  private readonly setSelectionService = inject(SetSelectionService)
  readonly aiService = inject(AiService)
  private readonly destroy$ = new Subject<void>()

  // Panel visibility state
  readonly showSetsPanel = signal(true)
  readonly showChatPanel = signal(true)
  readonly isLoading = signal(false)

  // Computed states
  readonly showBothPanels = computed(
    () => this.showSetsPanel() && this.showChatPanel(),
  )

  readonly selectedSetInfo = computed(() => {
    const selectedSet = this.setSelectionService.getSelectedSet()
    if (!selectedSet) return null

    return {
      title: selectedSet.title,
      cardCount: selectedSet.flashcards?.length || 0,
    }
  })

  readonly contentLayoutClass = computed(() => {
    if (this.showSetsPanel() && this.showChatPanel()) {
      return 'content-layout-both'
    } else if (this.showSetsPanel()) {
      return 'content-layout-sets-only'
    } else {
      return 'content-layout-chat-only'
    }
  })

  readonly setPanelClass = computed(() =>
    this.showSetsPanel() ? 'visible' : 'hidden',
  )

  readonly chatPanelClass = computed(() =>
    this.showChatPanel() ? 'visible' : 'hidden',
  )

  readonly setPanelButtonClass = computed(() =>
    this.showSetsPanel() ? 'toggle-button active' : 'toggle-button inactive',
  )

  readonly chatPanelButtonClass = computed(() =>
    this.showChatPanel() ? 'toggle-button active' : 'toggle-button inactive',
  )

  // AI status indicators
  readonly aiStatusClass = computed(() => {
    const isLoading = this.isLoading()
    if (isLoading) return 'status-indicator busy'
    return 'status-indicator online'
  })

  readonly aiStatusText = computed(() => {
    const isLoading = this.isLoading()
    const modelName = this.aiService.selectedModel().name
    if (isLoading) return 'Processing...'
    return `Ready (${modelName})`
  })

  // Resizing state
  private isResizing = false
  private startX = 0
  private startWidth = 0

  ngOnInit() {
    // Simulate initial loading
    this.isLoading.set(true)
    setTimeout(() => {
      this.isLoading.set(false)
    }, 500)

    // Set up resize event listeners
    this.setupResizeListeners()
  }

  ngOnDestroy() {
    this.destroy$.next()
    this.destroy$.complete()
  }

  toggleSetsPanel() {
    this.showSetsPanel.update((value) => !value)
    // Ensure at least one panel is visible
    if (!this.showSetsPanel() && !this.showChatPanel()) {
      this.showChatPanel.set(true)
    }
  }

  toggleChatPanel() {
    this.showChatPanel.update((value) => !value)
    // Ensure at least one panel is visible
    if (!this.showSetsPanel() && !this.showChatPanel()) {
      this.showSetsPanel.set(true)
    }
  }

  startResize(event: MouseEvent) {
    event.preventDefault()
    this.isResizing = true
    this.startX = event.clientX

    const setsPanel = event.target as HTMLElement
    const panelRect = setsPanel.closest('.sets-panel')?.getBoundingClientRect()
    this.startWidth = panelRect?.width || 0
  }

  private setupResizeListeners() {
    document.addEventListener('mousemove', this.onMouseMove.bind(this))
    document.addEventListener('mouseup', this.onMouseUp.bind(this))
  }

  private onMouseMove(event: MouseEvent) {
    if (!this.isResizing) return

    event.preventDefault()
    const deltaX = event.clientX - this.startX
    const newWidth = this.startWidth + deltaX

    // Set constraints for panel width
    const minWidth = 300
    const maxWidth = 600
    const constrainedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth))

    const setsPanel = document.querySelector('.sets-panel') as HTMLElement
    if (setsPanel) {
      setsPanel.style.flexBasis = `${constrainedWidth}px`
    }
  }

  private onMouseUp() {
    this.isResizing = false
  }
}
