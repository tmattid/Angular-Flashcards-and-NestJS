import { Component, inject, effect, signal, OnInit } from '@angular/core'
import { CommonModule } from '@angular/common'
import { Router } from '@angular/router'
import { AuthService } from '../services/auth.service'
import { DashboardNavComponent } from './components/dashboard-nav.component'
import { ProfileInfoComponent } from './components/profile-info.component'
import { ProfileAvatarComponent } from './components/profile-avatar.component'
import { AgGridComponent, GridRow } from '../ag-grid/ag-grid.component'
import { AiChatComponent } from '../ai-chat/ai-chat.component'
import { FlashcardCreatePage } from '../create-new-cards/flashcard-create.page'
import { TuiSegmented } from '@taiga-ui/kit'
import { FlashcardSetSelectorComponent } from '../flashcard-set-selection/flashcard-set-selector.component'
import { TabSelectorComponent } from './components/tab-selector.component'
import { FlashcardListComponent } from '../card-list/flashcard-list.component'
import { SetSelectionService } from '../services/set-selection.service'
import { FlashcardCDKService } from '../ai-chat/services/flashcard-cdk-service.service'

type Tab = 'grid' | 'flashcard-list' | 'profile'

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    DashboardNavComponent,
    ProfileInfoComponent,
    ProfileAvatarComponent,
    AgGridComponent,
    AiChatComponent,
    FlashcardListComponent,
    FlashcardSetSelectorComponent,

    FlashcardListComponent,
  ],
  template: `
    <div class="page-wrapper">
      <app-dashboard-nav
        [userEmail]="user()?.email || ''"
        (signOut)="signOut()"
        (tabChange)="changeTab($event)"
      ></app-dashboard-nav>

      <div class="dashboard-container">
        <!-- Left Column - AI Chat -->
        @if (!editSetService.getIsManagingSet()) {
          <div class="chat-column gap-2 flex flex-col bg-gray-1 border p-2 border-gray-300 rounded-lg">

            <app-flashcard-set-selector [activeTab]="activeTab()" />
            <app-ai-chat [activeTab]="activeTab()"></app-ai-chat>
          </div>
        }

        <!-- Right Column - Dynamic Content -->
        <div [class]="editSetService.getIsManagingSet() ? 'w-full' : 'content-column'">
          <div class="content-panel">
            <div [hidden]="activeTab() !== 2" class="panel-content">
              <div class="flex-center">
                <app-profile-avatar
                  [profile]="user() || null"
                ></app-profile-avatar>
                <app-profile-info [profile]="user() || null"></app-profile-info>
              </div>
            </div>

            <div [hidden]="activeTab() !== 0" class="panel-content">
              <app-ag-grid (rowsSelected)="onRowsSelected($event)"></app-ag-grid>
            </div>

            <div [hidden]="activeTab() !== 1" class="panel-content">
              <app-flashcard-list></app-flashcard-list>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .page-wrapper {
        @apply min-h-screen w-full;
      }

      .dashboard-container {
        @apply w-full h-[calc(100vh-4rem)] flex gap-2 p-4;
      }

      .chat-column {
        @apply w-1/3 rounded-lg shadow overflow-hidden;
      }

      .content-column {
        @apply w-2/3 flex flex-col;
      }

      .content-panel {
        @apply flex-1  rounded-lg shadow overflow-hidden;
      }

      .panel-content {
        @apply h-full w-full;
      }

      .flex-center {
        @apply flex items-center gap-4;
      }
    `,
  ],
})
export class DashboardComponent implements OnInit {
  private readonly auth = inject(AuthService)
  private readonly flashcardService = inject(FlashcardCDKService)
  readonly editSetService = inject(SetSelectionService)
  private readonly router = inject(Router)
  protected readonly user = this.auth.user
  protected readonly tabs: Tab[] = [
    'grid',
    'flashcard-list',
    'profile',
  ] as const
  protected readonly activeTab = signal<number>(0)

  async ngOnInit(): Promise<void> {
    // Load flashcards when dashboard initializes
    await this.flashcardService.loadFlashcardSets()
  }

  /**
   * Handles tab changes. If the clicked tab differs from the current value,
   * update the signal (which will trigger the effect). If the clicked tab is
   * the same as the current one, manually trigger `onTabChange()`.
   */
  changeTab(tab: Tab): void {
    if (this.activeTab() === this.tabs.indexOf(tab)) {
      // The signal's value isn't updated since it's equal,
      // so manually trigger our tab change handler.
      this.onTabChange(tab)
    } else {
      this.activeTab.set(this.tabs.indexOf(tab))
    }
  }

  onTabChange(tab: Tab): void {
    console.log('onTabChange called with tab:', tab)
  }

  async signOut(): Promise<void> {
    try {
      this.auth.logout()

      await this.router.navigate(['/login'])
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  selectedRows = signal<GridRow[]>([])

  onRowsSelected(rows: GridRow[]): void {
    console.log('Rows selected:', rows)
    this.selectedRows.set(rows)
  }
}
