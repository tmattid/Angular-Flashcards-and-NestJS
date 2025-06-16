import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  signal,
  computed,
  EventEmitter,
  Output,
  DestroyRef,
  effect,
} from '@angular/core'
import { AgGridAngular } from 'ag-grid-angular'
import {
  ColDef,
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
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { FlashcardService } from '../../../../services/flashcard-http.service'
import { LocalStorageService } from '../../../../services/state/local-storage.service'
import { AuthService } from '../../../../services/auth.service'
import {
  Flashcard,
  FlashcardSetWithCards,
  UpdateFlashcardDto,
} from '../../../../api'
import { SetSelectionService } from '../../../../services/set-selection.service'
import { SelectionService } from '../../../../services/selection.service'
import { AgGridConfigService } from './services/ag-grid-config.service'
import { ThemeService } from '../../../../services/theme.service'
import { CardCellRendererComponent } from './cell-renderer/card-cell-renderer.component'
import { AiChatComponent } from '../../../../ai-chat/ai-chat.component'
import { SidebarContainerComponent } from './set-sidebar/sidebar-container.component'
import { CardSizeSliderComponent } from './card-size-slider/card-size-slider.component'
import { debounceTime, fromEvent, Subject, takeUntil } from 'rxjs'

// Register only the specific modules needed for better performance
ModuleRegistry.registerModules([
  ClientSideRowModelModule,
  RowGroupingModule,
  MenuModule,
  SideBarModule,
])

// Update GridRow interface to be more strict
export interface GridRow {
  readonly setId: string
  readonly flashcardId: string
  readonly set_title: string
  front: string
  back: string
  readonly tags: string[] | null
  difficulty: number | null
  readonly created_at: string
  readonly position: number // Add position tracking
}

@Component({
  selector: 'app-update-flashcards',
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
        [isOpen]="isSidebarOpen()"
        (sidebarToggled)="onSidebarToggled($event)"
        (sidebarClosed)="onSidebarClosed()"
      ></app-sidebar-container>

      <!-- Main Content Area (Full Width) -->
      <div class="flex h-full gap-4 overflow-hidden">
        <!-- Chat Panel -->
        <div class="chat-panel flex-shrink-0 w-96 overflow-hidden">
          <div
            class="chat-container h-full bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4"
          >
            <app-ai-chat [activeTab]="0" class="h-full"></app-ai-chat>
          </div>
        </div>

        <!-- Main Grid Area -->
        <div class="grid-container flex-1 overflow-hidden">
          <!-- Grid Controls -->
          <div class="grid-controls mb-3 flex items-center justify-between">
            <div class="grid-info">
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                {{
                  setSelectionService.getSelectedSet()
                    ? setSelectionService.getSelectedSet()!.title +
                      ' (' +
                      rowData().length +
                      ' cards)'
                    : 'No set selected'
                }}
              </h3>
            </div>

            <!-- Card Size Slider -->
            <app-card-size-slider
              [(size)]="cardSize"
              (sizeChanged)="onCardSizeChanged($event)"
            ></app-card-size-slider>
          </div>

          <!-- AG Grid -->
          <ag-grid-angular
            class="w-full h-full"
            [theme]="
              themeService.darkMode()
                ? gridConfig.myThemeDark
                : gridConfig.myThemeLight
            "
            [rowData]="rowData()"
            [columnDefs]="gridConfig.columnDefs"
            [defaultColDef]="gridConfig.gridOptions.defaultColDef"
            [autoGroupColumnDef]="gridConfig.autoGroupColumnDef"
            [gridOptions]="enhancedGridOptions()"
            [rowSelection]="gridConfig.rowSelection"
            [getRowId]="getRowId"
            (gridReady)="onGridReady($event)"
            (cellValueChanged)="onCellValueChanged($event)"
          ></ag-grid-angular>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .grid-container {
        @apply overflow-hidden h-full flex flex-col;
        min-width: 0;
        width: 100%;
      }

      .grid-controls {
        @apply flex-shrink-0 px-4 py-2 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700;
      }

      .hidden {
        display: none;
      }

      /* Make the cards take up more width */
      :host ::ng-deep .ag-center-cols-container {
        @apply w-full;
      }

      :host ::ng-deep .ag-cell {
        overflow: visible;
      }

      :host ::ng-deep .ag-row {
        width: 100% !important;
      }

      /* Dynamic row height based on card size */
      :host ::ng-deep .ag-row {
        height: var(--card-height) !important;
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
export class UpdateFlashcardsComponent implements OnInit, OnDestroy {
  localStorageService = inject(LocalStorageService)
  private authService = inject(AuthService)
  readonly setSelectionService = inject(SetSelectionService)
  private selectionService = inject(SelectionService)
  gridConfig = inject(AgGridConfigService)
  readonly themeService = inject(ThemeService)
  private readonly destroyRef = inject(DestroyRef)
  private readonly flashcardService = inject(FlashcardService)

  private gridApi?: GridApi<GridRow>
  private readonly isFetching = signal(false)
  private readonly isInitialLoadComplete = signal(false)
  private readonly destroy$ = new Subject<void>()

  // Sidebar state
  readonly isSidebarOpen = signal(false)

  // Card size control
  cardSize = 120 // Default card size in pixels

  // Enhanced grid options with performance optimizations
  readonly enhancedGridOptions = computed(() => ({
    ...this.gridConfig.gridOptions,
    // Enable row virtualization for better performance
    suppressRowVirtualisation: false,
    rowBuffer: 20,
    // Cache block size to improve scrolling performance
    cacheBlockSize: 50,
    // Improving performance with these additional options
    suppressPropertyNamesCheck: true,
    suppressAnimationFrame: false,
    // Only redraw rows if truly needed
    enableCellTextSelection: true,
    // Enable immutable data for more efficient updates
    immutableData: true,
    // Dynamic row height based on card size
    rowHeight: this.cardSize,
  }))

  // Get row ID function to support immutable data updates
  getRowId = (params: { data: GridRow }) => {
    return params.data.flashcardId
  }

  constructor() {
    // Create an effect to refresh grid data when local storage state changes
    // Using a more efficient approach with effect
    effect(() => {
      // This will react to changes in the localStorageService state signal
      const state = this.localStorageService.getState()
      const selectedSet = this.setSelectionService.getSelectedSet()

      if (this.gridApi && selectedSet) {
        this.refreshGrid()
      }
    })
  }

  ngOnInit() {
    // Initial setup
    this.updateCardSizeCSS()
  }

  autoGroupColumnDef = this.gridConfig.autoGroupColumnDef
  rowSelection = this.gridConfig.rowSelection

  readonly rowData = computed(() => {
    const state = this.localStorageService.getState()
    const selectedSet = this.setSelectionService.getSelectedSet()

    if (!selectedSet) {
      return [] as GridRow[]
    }

    // Find the selected set
    const targetSet = state.flashcardSets.find(
      (set) => set.id === selectedSet.id,
    )
    if (!targetSet) {
      return [] as GridRow[]
    }

    // Create grid rows from the set's flashcards
    return targetSet.flashcards.map(
      (card: Flashcard): GridRow => ({
        setId: targetSet.id,
        flashcardId: card.id,
        set_title: targetSet.title,
        front: card.front,
        back: card.back,
        tags: card.tags ?? null,
        difficulty: card.difficulty?.['value'] ?? null,
        created_at: card.createdAt,
        position: card.position,
      }),
    )
  })

  errorMessage: string = ''

  @Output() rowsSelected = new EventEmitter<GridRow[]>()

  // Card size control methods
  onCardSizeChanged(newSize: number) {
    this.cardSize = newSize
    this.updateCardSize()
  }

  updateCardSize() {
    this.updateCardSizeCSS()
    if (this.gridApi) {
      // Update the grid's row height
      this.gridApi.setGridOption('rowHeight', this.cardSize)
      // Force a refresh to apply the new height
      this.gridApi.onRowHeightChanged()
    }
  }

  private updateCardSizeCSS() {
    document.documentElement.style.setProperty(
      '--card-height',
      `${this.cardSize}px`,
    )
  }

  refreshGrid(): void {
    if (this.gridApi) {
      // With immutableData=true, setting new rowData triggers efficient refresh
      this.gridApi.setGridOption('rowData', this.rowData())
    }
  }

  /**
   * Handles cell value changes with strict type checking
   */
  onCellValueChanged(event: CellValueChangedEvent<GridRow>) {
    if (!event.data) return

    const field = event.colDef.field as keyof GridRow
    if (!field || !['front', 'back', 'difficulty'].includes(field as string)) {
      return
    }

    try {
      // Get the current state
      const state = this.localStorageService.getState()
      const setIndex = state.flashcardSets.findIndex(
        (set) => set.id === event.data!.setId,
      )
      if (setIndex === -1) return

      // Find the card to update
      const cardIndex = state.flashcardSets[setIndex].flashcards.findIndex(
        (card) => card.id === event.data!.flashcardId,
      )
      if (cardIndex === -1) return

      // Build update DTO with strict types
      const updateDto: UpdateFlashcardDto = {
        front: event.data.front,
        back: event.data.back,
        difficulty: event.data.difficulty
          ? { value: event.data.difficulty }
          : undefined,
        position: event.data.position,
      }

      // Update local storage state with the change
      this.localStorageService.updateState((currentState) => {
        const updatedSets = [...currentState.flashcardSets]
        updatedSets[setIndex] = {
          ...updatedSets[setIndex],
          flashcards: updatedSets[setIndex].flashcards.map((card) =>
            card.id === event.data!.flashcardId
              ? { ...card, [field]: event.newValue }
              : card,
          ),
        }

        return {
          ...currentState,
          flashcardSets: updatedSets,
        }
      })

      // Mark the flashcard set as dirty
      this.localStorageService.markDirty(event.data.setId)
    } catch (error) {
      console.error('Update failed:', error)
      this.errorMessage = 'Failed to save changes.'
      // Rollback with type safety
      event.api.applyTransaction({ update: [event.data] })
    }
  }

  dismissError(): void {
    this.errorMessage = ''
  }

  onGridReady(params: GridReadyEvent<GridRow>) {
    this.gridApi = params.api

    // Apply initial card size
    this.updateCardSize()

    // Selection handler
    params.api.addEventListener('selectionChanged', () => {
      const selectedRows = params.api.getSelectedRows()
      this.selectionService.updateSelection(selectedRows)
    })

    // Only size columns to fit once on initial load
    if (!this.isInitialLoadComplete()) {
      this.gridApi.sizeColumnsToFit()
      this.isInitialLoadComplete.set(true)
    }

    // Use RxJS for a debounced resize handler
    fromEvent(window, 'resize')
      .pipe(debounceTime(200), takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.gridApi) {
          this.gridApi.sizeColumnsToFit()
        }
      })

    // Initial selection state
    const currentSelection = this.selectionService.getSelectedRows()()
    params.api.forEachNode((node) => {
      node.setSelected(
        currentSelection.some(
          (sel) => sel.flashcardId === node.data?.flashcardId,
        ),
      )
    })
  }

  getSetTitle(setId: string) {
    return (
      this.localStorageService
        .getState()
        .flashcardSets.find((s) => s.id === setId)?.title || 'Unknown Set'
    )
  }

  // Sidebar methods
  onSidebarToggled(isOpen: boolean) {
    this.isSidebarOpen.set(isOpen)
  }

  onSidebarClosed() {
    this.isSidebarOpen.set(false)
  }

  toggleSidebar() {
    this.isSidebarOpen.update((value) => !value)
  }

  closeSidebar() {
    this.isSidebarOpen.set(false)
  }

  ngOnDestroy() {
    // Clean up subscriptions
    this.destroy$.next()
    this.destroy$.complete()
  }
}
