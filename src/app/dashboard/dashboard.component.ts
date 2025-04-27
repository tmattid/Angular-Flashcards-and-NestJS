import { Component, inject, effect, signal, OnInit } from '@angular/core'
import { CommonModule } from '@angular/common'
import { Router } from '@angular/router'
import { AuthService } from '../services/auth.service'
import { DashboardNavComponent } from './components/dashboard-nav.component'
import { ProfileInfoComponent } from './components/profile-info.component'
import { ProfileAvatarComponent } from './components/profile-avatar.component'
import { AgGridComponent, GridRow } from './main-grid/ag-grid.component'
import { FlashcardCDKService } from '../ai-chat/services/flashcard-cdk-service.service'
import { SetSelectionService } from '../services/set-selection.service'
import { FlashcardListComponent } from './flashcard-list/flashcard-list.component'

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
    FlashcardListComponent,
  ],
  template: `
    <div class="page-wrapper flex flex-col min-h-screen">
      <app-dashboard-nav
        [userEmail]="user()?.email || ''"
        (signOut)="signOut()"
        (tabChange)="changeTab($event)"
      ></app-dashboard-nav>

      <div class="dashboard-container">
        <!-- Full Width Content Column -->
        <div class="content-panel w-full">
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
  `,
  styles: [
    `
      .page-wrapper {
        @apply flex flex-col min-h-screen w-full h-screen;
      }

      .dashboard-container {
        @apply w-full flex-1 flex p-4 overflow-hidden min-h-0;
      }

      .content-panel {
        @apply flex-1 rounded-lg shadow overflow-hidden flex flex-col min-h-0;
      }

      .panel-content {
        @apply h-full w-full overflow-auto min-h-0;
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
