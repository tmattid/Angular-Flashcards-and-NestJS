import {
  Component,
  inject,
  signal,
  computed,
  DestroyRef,
  Output,
  EventEmitter,
} from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { AgGridAngular } from 'ag-grid-angular'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import {
  CellValueChangedEvent,
  GridReadyEvent,
  GridApi,
  ModuleRegistry,
  ClientSideRowModelModule,
} from 'ag-grid-community'
import {
  MenuModule,
  SideBarModule,
  RowGroupingModule,
} from 'ag-grid-enterprise'
import { debounceTime, fromEvent } from 'rxjs'

// Services
import { FlashcardService } from '../../../../services/flashcard-http.service'
import { LocalStorageService } from '../../../../services/state/local-storage.service'
import { SetSelectionService } from '../../../../services/set-selection.service'
import { SelectionService } from '../../../../services/selection.service'
import { GridConfigService } from './grid-config.service'
import { ThemeService } from '../../../../services/theme.service'

// Components
import { AiChatComponent } from '../../../../ai-chat/ai-chat.component'
import { SidebarContainerComponent } from '../sidebar/sidebar-container.component'
import { CardSizeSliderComponent } from '../controls/card-size-slider.component'

// Types
import { Flashcard, UpdateFlashcardDto } from '../../../../api'

// Types
import { GridRow, GridPerformanceConfig } from './grid.types'

/**
 * Flashcards Grid Component with Multi-Select Checkboxes
 * Organized following Angular Signals Best Practices
 */
@Component({
  selector: 'app-flashcard-grid',
  standalone: true,
  imports: [
    AgGridAngular,
    CommonModule,
    FormsModule,
    SidebarContainerComponent,
    CardSizeSliderComponent,
    AiChatComponent,
  ],
  template: `
    <div class="relative h-full w-full overflow-hidden">
      <!-- Sidebar Container -->
      <app-sidebar-container
        [isOpen]="vm().isSidebarOpen"
        (sidebarToggled)="toggleSidebar($event)"
        (sidebarClosed)="closeSidebar()"
      />

      <!-- Main Content Area -->
      <div class="flex h-full gap-4 overflow-hidden">
        <!-- Chat Panel -->
        <div class="chat-panel flex-shrink-0 w-96 overflow-hidden">
          <div class="chat-container h-full bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
            <app-ai-chat [activeTab]="0" class="h-full" />
          </div>
        </div>

        <!-- Main Grid Area -->
        <div class="grid-container flex-1 overflow-hidden">
          <!-- Grid Controls -->
          <div class="grid-controls mb-3 flex items-center justify-between">
            <div class="grid-info">
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                {{ vm().gridTitle }}
              </h3>
            </div>

            <!-- Card Size Slider -->
            <app-card-size-slider
              [size]="vm().cardSize"
              (sizeChanged)="updateCardSize($event)"
            />
          </div>

          <!-- Error Message -->
          @if (vm().errorMessage) {
            <div class="mb-3 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {{ vm().errorMessage }}
              <button (click)="dismissError()" class="ml-2 text-red-900 hover:text-red-700">×</button>
            </div>
          }

          <!-- AG Grid with scrollable wrapper -->
          <div class="grid-wrapper flex-1 overflow-auto">
            <ag-grid-angular
              class="w-full"
              [theme]="vm().theme"
              [rowData]="vm().rowData"
              [columnDefs]="vm().columnDefs"
              [defaultColDef]="vm().gridOptions.defaultColDef"
              [autoGroupColumnDef]="vm().gridOptions.autoGroupColumnDef"
              [gridOptions]="vm().gridOptions"
              [selectionColumnDef]="vm().gridOptions.selectionColumnDef"
              [getRowId]="getRowId"
              (gridReady)="onGridReady($event)"
              (cellValueChanged)="onCellValueChanged($event)"
            />
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .grid-container {
        @apply overflow-auto h-full flex flex-col;
        min-width: 0;
        width: 100%;
      }

      .grid-controls {
        @apply flex-shrink-0 px-4 py-2 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700;
      }

      /* AG Grid cell styling */
      :host ::ng-deep .ag-center-cols-container {
        @apply w-full;
      }

      :host ::ng-deep .ag-cell {
        overflow: visible !important;
        text-overflow: clip !important;
      }

      :host ::ng-deep .ag-cell-wrapper {
        width: 100% !important;
        min-height: 60px !important;
      }

      :host ::ng-deep .ag-row {
        width: 100% !important;
      }

      /* Center the AG Grid multi-select checkbox in the selection column */
      :host ::ng-deep .ag-row-select .ag-cell {
        display: flex !important;
        justify-content: center !important;
        align-items: center !important;
        padding: 4px !important;
      }

      .chat-panel {
        min-width: 350px;
        max-width: 450px;
      }

      .chat-container {
        @apply flex flex-col overflow-hidden;
      }
    `,
  ],
})
export class FlashcardGridComponent {
  /* ═══════════════════════════════════════════════════════════════════════ */
  /* 1. Dependencies - Inject at the top                                      */
  /* ═══════════════════════════════════════════════════════════════════════ */
  private readonly destroyRef = inject(DestroyRef)
  private readonly flashcardService = inject(FlashcardService)
  private readonly localStorageService = inject(LocalStorageService)
  private readonly setSelectionService = inject(SetSelectionService)
  private readonly selectionService = inject(SelectionService)
  private readonly gridConfig = inject(GridConfigService)
  private readonly themeService = inject(ThemeService)

  /* ═══════════════════════════════════════════════════════════════════════ */
  /* 2. Simple State Signals                                                  */
  /* ═══════════════════════════════════════════════════════════════════════ */
  readonly cardSize = signal(this.gridConfig.performanceConfig.defaultCardSize)
  readonly isSidebarOpen = signal(false)
  readonly gridApi = signal<GridApi<GridRow> | null>(null)
  readonly errorMessage = signal<string | null>(null)

  /* ═══════════════════════════════════════════════════════════════════════ */
  /* 3. Computed Values - All derived state in one place                      */
  /* ═══════════════════════════════════════════════════════════════════════ */

  // Display mode based on card size
  readonly isTableMode = computed(() =>
    this.gridConfig.isTableMode(this.cardSize())
  )

  // Currently selected set
  readonly selectedSet = computed(() =>
    this.setSelectionService.getSelectedSet()
  )

  // Transform flashcards to grid rows
  readonly rowData = computed(() => {
    const state = this.localStorageService.getState()
    const set = this.selectedSet()

    if (!set) return []

    const currentSet = state.flashcardSets.find(s => s.id === set.id)
    if (!currentSet) return []

    return currentSet.flashcards.map((card): GridRow => ({
      setId: currentSet.id,
      flashcardId: card.id,
      set_title: currentSet.title,
      front: card.front,
      back: card.back,
      tags: card.tags ?? null,
      difficulty: card.difficulty?.['value'] ?? null,
      created_at: card.createdAt,
      position: card.position,
    }))
  })

  // Grid configuration based on mode
  readonly columnDefs = computed(() =>
    this.gridConfig.getColumnDefsForMode(this.isTableMode())
  )

  readonly gridOptions = computed(() =>
    this.gridConfig.getEnhancedGridOptions()
  )

  readonly theme = computed(() =>
    this.gridConfig.getTheme(this.themeService.darkMode())
  )

  // UI display values
  readonly gridTitle = computed(() => {
    const set = this.selectedSet()
    const count = this.rowData().length
    return set ? `${set.title} (${count} cards)` : 'No set selected'
  })

  // Template view model - single source of truth for template
  readonly vm = computed(() => ({
    cardSize: this.cardSize(),
    isSidebarOpen: this.isSidebarOpen(),
    isTableMode: this.isTableMode(),
    rowData: this.rowData(),
    columnDefs: this.columnDefs(),
    gridOptions: this.gridOptions(),
    theme: this.theme(),
    gridTitle: this.gridTitle(),
    errorMessage: this.errorMessage(),
  }))

  // Output events
  @Output() rowsSelected = new EventEmitter<GridRow[]>()

  /* ═══════════════════════════════════════════════════════════════════════ */
  /* 4. Public Methods - Simple state updates and grid operations             */
  /* ═══════════════════════════════════════════════════════════════════════ */

  updateCardSize(newSize: number): void {
    this.cardSize.set(newSize)
    // Update CSS variable for card height
    document.documentElement.style.setProperty('--card-height', `${newSize}px`)
    // Refresh grid layout
    this.refreshGridLayout()
  }

  toggleSidebar(isOpen: boolean): void {
    this.isSidebarOpen.set(isOpen)
  }

  closeSidebar(): void {
    this.isSidebarOpen.set(false)
  }

  dismissError(): void {
    this.errorMessage.set(null)
  }

  // Grid helper methods
  private refreshGridLayout(): void {
    const api = this.gridApi()
    if (api) {
      api.setGridOption('columnDefs', this.columnDefs())
      setTimeout(() => {
        api.resetRowHeights()
        api.onRowHeightChanged()
        api.sizeColumnsToFit()
      }, 0)
    }
  }

  getRowId = (params: { data: GridRow }) => params.data.flashcardId

  onGridReady(event: GridReadyEvent<GridRow>): void {
    // Store grid API reference
    this.gridApi.set(event.api)

    // Set up selection change handler
    event.api.addEventListener('selectionChanged', () => {
      const selectedRows = event.api.getSelectedRows()
      this.selectionService.updateSelection(selectedRows)
      this.rowsSelected.emit(selectedRows)
    })

    // Set up debounced resize handler
    fromEvent(window, 'resize')
      .pipe(
        debounceTime(this.gridConfig.performanceConfig.debounceMs),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.refreshGridLayout())

    // Restore previous selection
    this.restoreSelection(event.api)
  }

  onCellValueChanged(event: CellValueChangedEvent<GridRow>): void {
    if (!event.data || !event.newValue || event.newValue === event.oldValue) {
      return
    }

    const updateDto: UpdateFlashcardDto = {
      [event.colDef.field!]: event.newValue,
    }

    this.updateFlashcard(event.data.flashcardId, updateDto, event.data)
  }

  /* ═══════════════════════════════════════════════════════════════════════ */
  /* 5. Private Helper Methods                                                 */
  /* ═══════════════════════════════════════════════════════════════════════ */

  private updateFlashcard(
    flashcardId: string,
    updateDto: UpdateFlashcardDto,
    originalData: GridRow,
  ): void {
    this.errorMessage.set(null)

    this.flashcardService
      .updateCard(flashcardId, updateDto, originalData.setId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updatedSet: any) => {
          // Update local storage
          this.localStorageService.updateState((current) => ({
            ...current,
            flashcardSets: current.flashcardSets.map((set) =>
              set.id === updatedSet.id ? updatedSet : set,
            ),
          }))
          // Refresh grid layout after data change
          this.refreshGridLayout()
        },
        error: (error: any) => {
          const message = error.status === 404
            ? 'Flashcard not found'
            : 'Failed to save changes. Please try again.'
          this.errorMessage.set(message)

          // Revert the change
          const api = this.gridApi()
          if (api) {
            api.applyTransaction({ update: [originalData] })
          }
        },
      })
  }

  private restoreSelection(gridApi: GridApi<GridRow>): void {
    const currentSelection = this.selectionService.getSelectedRows()()
    gridApi.forEachNode((node) => {
      const isSelected = currentSelection.some(
        (sel) => sel.flashcardId === node.data?.flashcardId,
      )
      node.setSelected(isSelected)
    })
  }
}
