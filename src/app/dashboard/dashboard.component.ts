import { Component, inject, signal, OnInit } from '@angular/core'
import { CommonModule } from '@angular/common'
import { Router, ActivatedRoute } from '@angular/router'
import { AuthService } from '../services/auth.service'
import { DashboardNavComponent } from './shared/components/dashboard-nav.component'
import { ProfileInfoComponent } from './features/profile/components/profile-info.component'
import { ProfileAvatarComponent } from './features/profile/components/profile-avatar.component'
import { FlashcardCDKService } from '../ai-chat/services/flashcard-cdk-service.service'
import { SetSelectionService } from '../services/set-selection.service'
import { FlashcardListComponent } from './features/flashcards/components/flashcard-list.component'
import { SetManagementGridComponent } from './features/sets/components/set-management-grid.component'
import {
  UpdateFlashcardsComponent,
  GridRow,
} from './features/grid/update-flashcards/update-flashcards.component'

type Tab = 'grid' | 'flashcard-list' | 'sets' | 'profile'

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    DashboardNavComponent,
    ProfileInfoComponent,
    ProfileAvatarComponent,
    UpdateFlashcardsComponent,
    FlashcardListComponent,
    SetManagementGridComponent,
  ],
  template: `
    <div class="page-wrapper flex flex-col min-h-screen">
      <app-dashboard-nav
        [userEmail]="user()?.email || ''"
        (signOut)="signOut()"
        (tabChange)="changeTab($event)"
      ></app-dashboard-nav>

      <div class="dashboard-container">
        <div class="content-panel w-full">
          <!-- Grid Tab -->
          <div [hidden]="activeTab() !== 0" class="panel-content">
            <app-update-flashcards (rowsSelected)="onRowsSelected($event)"></app-update-flashcards>
          </div>

          <!-- Flashcard List Tab -->
          <div [hidden]="activeTab() !== 1" class="panel-content">
            <app-flashcard-list></app-flashcard-list>
          </div>

          <!-- Sets Tab -->
          <div [hidden]="activeTab() !== 2" class="panel-content">
            <app-set-management-grid></app-set-management-grid>
          </div>

          <!-- Profile Tab -->
          <div [hidden]="activeTab() !== 3" class="panel-content">
            <div class="flex-center">
              <app-profile-avatar
                [profile]="user() || null"
              ></app-profile-avatar>
              <app-profile-info [profile]="user() || null"></app-profile-info>
            </div>
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
  readonly setSelectionService = inject(SetSelectionService)
  private readonly router = inject(Router)
  private readonly route = inject(ActivatedRoute)
  protected readonly user = this.auth.user
  protected readonly tabs: Tab[] = [
    'grid',
    'flashcard-list',
    'sets',
    'profile',
  ] as const
  protected readonly activeTab = signal<number>(0)

  async ngOnInit(): Promise<void> {
    await this.flashcardService.loadFlashcardSets()
  }

  changeTab(tab: Tab): void {
    if (this.activeTab() === this.tabs.indexOf(tab)) {
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
