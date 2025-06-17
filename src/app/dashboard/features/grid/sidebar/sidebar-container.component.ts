import { Component, signal, input, output } from '@angular/core'
import { CommonModule } from '@angular/common'
import { SetManagementSidebarComponent } from './set-management/set-management-sidebar.component'

@Component({
  selector: 'app-sidebar-container',
  standalone: true,
  imports: [CommonModule, SetManagementSidebarComponent],
  template: `
    <!-- Sidebar Toggle Tab -->
    <button
      (click)="toggleSidebar()"
      class="sidebar-toggle-tab"
      [class.sidebar-open]="isOpen()"
      title="Toggle flashcard sets"
    >
      <svg
        class="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
        />
      </svg>
      <span class="tab-text">Sets</span>
    </button>

    <!-- Sidebar Overlay -->
    <div
      *ngIf="isOpen()"
      class="sidebar-overlay"
      (click)="closeSidebar()"
    ></div>

    <!-- Sliding Sidebar -->
    <div class="sliding-sidebar" [class.sidebar-open]="isOpen()">
      <div class="sidebar-header">
        <h3 class="sidebar-title">Flashcard Sets</h3>
        <button
          (click)="closeSidebar()"
          class="close-btn"
          title="Close sidebar"
        >
          <svg
            class="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
      <div class="sidebar-content">
        <app-set-management-sidebar></app-set-management-sidebar>
      </div>
    </div>
  `,
  styles: [
    `
      /* Sidebar Toggle Tab */
      .sidebar-toggle-tab {
        @apply fixed top-1/2 left-0 transform -translate-y-1/2 z-50;
        @apply bg-blue-600 hover:bg-blue-700 text-white;
        @apply rounded-r-lg shadow-lg border-r border-blue-800;
        @apply flex flex-col items-center justify-center;
        @apply transition-all duration-300 ease-in-out;
        width: 25px;
        height: 80px;
        padding: 6px;
      }

      .sidebar-toggle-tab.sidebar-open {
        @apply left-80 bg-gray-600 hover:bg-gray-700;
      }

      .sidebar-toggle-tab .tab-text {
        @apply text-xs mt-1 font-medium;
        writing-mode: vertical-lr;
        text-orientation: mixed;
        font-size: 10px;
      }

      /* Sidebar Overlay */
      .sidebar-overlay {
        @apply fixed inset-0 bg-black bg-opacity-50 z-40;
        @apply transition-opacity duration-300;
      }

      /* Sliding Sidebar */
      .sliding-sidebar {
        @apply fixed top-0 left-0 h-full bg-white dark:bg-gray-900;
        @apply shadow-2xl border-r border-gray-200 dark:border-gray-700;
        @apply transform -translate-x-full transition-transform duration-300 ease-in-out z-50;
        width: 320px;
      }

      .sliding-sidebar.sidebar-open {
        @apply translate-x-0;
      }

      .sidebar-header {
        @apply flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700;
        @apply bg-gray-50 dark:bg-gray-800;
      }

      .sidebar-title {
        @apply text-lg font-semibold text-gray-900 dark:text-white;
      }

      .close-btn {
        @apply p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-200;
        @apply dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700;
        @apply transition-colors;
      }

      .sidebar-content {
        @apply h-full overflow-hidden;
        height: calc(100% - 73px); /* Subtract header height */
      }
    `,
  ],
})
export class SidebarContainerComponent {
  // Input signal for external control of sidebar state
  readonly isOpen = input<boolean>(false)

  // Output events
  readonly sidebarToggled = output<boolean>()
  readonly sidebarClosed = output<void>()

  toggleSidebar() {
    const newState = !this.isOpen()
    this.sidebarToggled.emit(newState)
  }

  closeSidebar() {
    this.sidebarClosed.emit()
  }
}
