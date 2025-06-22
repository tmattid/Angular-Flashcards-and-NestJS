import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
} from '@angular/core'
import { CommonModule } from '@angular/common'
import { ButtonModule } from 'primeng/button'
import { CardModule } from 'primeng/card'
import { TagModule } from 'primeng/tag'
import { TooltipModule } from 'primeng/tooltip'
import { DialogModule } from 'primeng/dialog'
import { InputTextModule } from 'primeng/inputtext'
import { FormsModule } from '@angular/forms'
import type { FlashcardSetWithCards } from '../../../api/models/FlashcardSetWithCards'

@Component({
  selector: 'app-grid-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    CardModule,
    TagModule,
    TooltipModule,
    DialogModule,
    InputTextModule,
    FormsModule,
  ],
  template: `
    <!-- Hideable Sidebar for Flashcard Sets -->
    <div
      class="sidebar-container"
      [class.sidebar-open]="showSidebar()"
      [class.sidebar-closed]="!showSidebar()"
    >
      <div class="sidebar-content">
        <!-- Sidebar Header -->
        <div class="sidebar-header">
          <h3 class="sidebar-title">
            Flashcard Sets
          </h3>
          <button
            (click)="closeSidebar.emit()"
            class="close-button"
            title="Close panel"
          >
            <i class="pi pi-times close-icon"></i>
          </button>
        </div>

        <!-- Add New Set Button -->
        <div class="new-set-button-container">
          <p-button
            label="New Flashcard Set"
            icon="pi pi-plus"
            [fluid]="true"
            (onClick)="openNewSetDialog.emit()"
          />
        </div>

        <!-- Sets List -->
        <div class="sets-list-container">
          @if (flashcardSets().length > 0) {
          <div class="sets-list">
            @for (set of flashcardSets(); track set.id) {
            <p-card
              class="set-card"
              [class.set-card-selected]="set.id === currentSetId()"
              (click)="selectSet.emit(set.id)"
            >
              <ng-template pTemplate="header">
                <div class="set-card-header">
                  <div class="set-card-title">
                    <i class="set-icon pi" [class]="getIconClass(set.iconId)"></i>
                    <h4 class="set-name">{{ set.title }}</h4>
                  </div>
                  <p-button
                    icon="pi pi-pencil"
                    [text]="true"
                    [rounded]="true"
                    size="small"
                    (onClick)="editSet.emit({ set, event: $event })"
                    pTooltip="Edit set"
                  />
                </div>
              </ng-template>

              <p class="set-description">
                {{ set.description || 'No description' }}
              </p>

              <div class="set-card-footer">
                <p-tag
                  value="{{ set.flashcards.length }} cards"
                  severity="info"
                  [rounded]="true"
                />
                <small class="set-date">{{ formatDate(set.updatedAt) }}</small>
              </div>
            </p-card>
            }
          </div>
          } @else {
          <!-- Empty State -->
          <div class="empty-state">
            <i class="empty-state-icon pi pi-book"></i>
            <h3 class="empty-state-title">
              No Flashcard Sets Yet
            </h3>
            <p class="empty-state-description">
              Create your first flashcard set to get started!
            </p>
            <p-button
              label="Create Your First Set"
              icon="pi pi-plus"
              (onClick)="openNewSetDialog.emit()"
              [outlined]="true"
            />
          </div>
          }
        </div>
      </div>
    </div>

    <!-- Overlay for sidebar -->
    @if (showSidebar()) {
    <div
      class="sidebar-overlay"
      (click)="closeSidebar.emit()"
    ></div>
    }

    <!-- New Set Dialog -->
    <p-dialog
      header="Create New Flashcard Set"
      [visible]="showNewSetDialog()"
      (visibleChange)="showNewSetDialogChange.emit($event)"
      [modal]="true"
      [style]="{width: '450px'}"
      [closable]="true"
    >
      <div class="dialog-content">
        <div class="form-field">
          <label class="form-label">
            Set Name
          </label>
          <input
            type="text"
            pInputText
            [ngModel]="newSetName()"
            (ngModelChange)="newSetNameChange.emit($event)"
            placeholder="Enter set name..."
            class="form-input"
          />
        </div>
        <div class="form-field">
          <label class="form-label">
            Description
          </label>
          <input
            type="text"
            pInputText
            [ngModel]="newSetDescription()"
            (ngModelChange)="newSetDescriptionChange.emit($event)"
            placeholder="Enter description..."
            class="form-input"
          />
        </div>
      </div>
      <ng-template pTemplate="footer">
        <div class="dialog-footer">
          <button
            pButton
            label="Cancel"
            (click)="cancelNewSet.emit()"
            class="p-button-text"
          ></button>
          <button
            pButton
            label="Create"
            (click)="createNewSet.emit()"
            [disabled]="!newSetName().trim()"
          ></button>
        </div>
      </ng-template>
    </p-dialog>
  `,
  styleUrl: './grid-sidebar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GridSidebarComponent {
  // Inputs
  showSidebar = input(false)
  flashcardSets = input<FlashcardSetWithCards[]>([])
  currentSetId = input<string | null>(null)
  showNewSetDialog = input(false)
  newSetName = input('')
  newSetDescription = input('')

  // Outputs
  closeSidebar = output<void>()
  selectSet = output<string>()
  editSet = output<{ set: FlashcardSetWithCards; event: Event }>()
  openNewSetDialog = output<void>()
  showNewSetDialogChange = output<boolean>()
  newSetNameChange = output<string>()
  newSetDescriptionChange = output<string>()
  cancelNewSet = output<void>()
  createNewSet = output<void>()

  formatDate(dateString: string): string {
    const date = new Date(dateString)
    const now = new Date()
    const diffInDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
    )

    if (diffInDays === 0) return 'Today'
    if (diffInDays === 1) return 'Yesterday'
    if (diffInDays < 7) return `${diffInDays} days ago`

    return date.toLocaleDateString()
  }

  getIconClass(iconId: string | undefined): string {
    if (!iconId) {
      return 'pi-book'
    }

    // If it's already a PrimeNG icon class (starts with 'pi-'), use it
    if (iconId.startsWith('pi-')) {
      return iconId
    }

    // If it contains TUI or other non-PrimeNG references, use default
    if (iconId.includes('tui') || iconId.includes('@')) {
      return 'pi-book'
    }

    // For any other case, assume it needs 'pi-' prefix
    return `pi-${iconId}`
  }
}
