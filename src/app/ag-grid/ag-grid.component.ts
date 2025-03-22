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
} from 'ag-grid-community'
import { AllEnterpriseModule, ModuleRegistry } from 'ag-grid-enterprise'
import { AllCommunityModule } from 'ag-grid-community'
import { CommonModule } from '@angular/common'
import { FlashcardService } from '../services/flashcard-http.service'
import { LocalStorageService } from '../services/state/local-storage.service'
import { AuthService } from '../services/auth.service'
import {
  Flashcard,
  FlashcardSet,
  UpdateFlashcardDto,
} from '../models/flashcards.models'
import { SetSelectionService } from '../services/set-selection.service'
import { SelectionService } from '../services/selection.service'
import { AgGridConfigService } from './ag-grid-config.service'
import { ThemeService } from '../services/theme.service'
import { CardCellRendererComponent } from './cell-renderer/card-cell-renderer.component'
import { SetManagementGridComponent } from './set-management-grid/set-management-grid.component'
import { animate, style, transition, trigger } from '@angular/animations'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'

ModuleRegistry.registerModules([AllEnterpriseModule, AllCommunityModule])

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

interface FlashcardSetWithCards extends Omit<FlashcardSet, 'created_by'> {
  flashcards: Omit<Flashcard, 'flashcard_set_id'>[]
}

@Component({
  selector: 'app-ag-grid',
  standalone: true,
  imports: [AgGridAngular, CommonModule, SetManagementGridComponent],
  animations: [
    trigger('slideInOut', [
      transition(':enter', [
        style({
          position: 'absolute',
          width: '100%',
          transform: 'translateX(100%)',
          opacity: 0,
        }),
        animate(
          '200ms ease-out',
          style({
            transform: 'translateX(0)',
            opacity: 1,
          }),
        ),
      ]),
      transition(':leave', [
        style({ position: 'absolute', width: '100%' }),
        animate(
          '200ms ease-in',
          style({
            transform: 'translateX(-100%)',
            opacity: 0,
          }),
        ),
      ]),
    ]),
  ],
  template: `
    <div class="relative overflow-hidden" style="height: 87vh;">
      @if (setSelectionService.getIsManagingSet()) {
        <app-set-management-grid
          @slideInOut
          (onBack)="setSelectionService.setIsManagingSet(false)"
        />
      } @else {
        <ag-grid-angular
          @slideInOut
          class="w-full h-full"
          [theme]="themeService.darkMode() ? gridConfig.myThemeDark : gridConfig.myThemeLight"
          [rowData]="rowData()"
          [columnDefs]="gridConfig.columnDefs"
          [defaultColDef]="gridConfig.gridOptions.defaultColDef"
          [autoGroupColumnDef]="gridConfig.autoGroupColumnDef"
          [gridOptions]="gridConfig.gridOptions"
          [rowSelection]="gridConfig.rowSelection"
          (gridReady)="onGridReady($event)"
          (cellValueChanged)="onCellValueChanged($event)"
        ></ag-grid-angular>
      }
    </div>
  `,
  styles: [
    `
      .hidden {
        display: none;
      }
    `,
  ],
})
export class AgGridComponent implements OnInit, OnDestroy {
  localStorageService = inject(LocalStorageService)
  private authService = inject(AuthService)
  readonly setSelectionService = inject(SetSelectionService)
  private selectionService = inject(SelectionService)
  gridConfig = inject(AgGridConfigService)
  readonly themeService = inject(ThemeService)
  private readonly destroyRef = inject(DestroyRef)
  private readonly flashcardService = inject(FlashcardService)

  private gridApi?: GridApi<GridRow>

  // Update computed signal to include position
  readonly rowData = computed(() => {
    const state = this.localStorageService.getState()
    const selectedSet = this.setSelectionService.getSelectedSet()

    if (!selectedSet) {
      return [] as GridRow[]
    }

    return state.flashcardSets
      .filter((set) => set.id === selectedSet?.id)
      .flatMap((set) =>
        set.flashcards.map(
          (card): GridRow => ({
            setId: set.id,
            flashcardId: card.id,
            set_title: set.title,
            front: card.front,
            back: card.back,
            tags: card.tags,
            difficulty: card.difficulty,
            created_at: card.created_at,
            position: card.position,
          }),
        ),
      )
  })

  private readonly isFetching = signal(false)
  private readonly isInitialLoadComplete = signal(false)

  autoGroupColumnDef = this.gridConfig.autoGroupColumnDef
  rowSelection = this.gridConfig.rowSelection

  // Update column definitions with stricter types
  columnDefs: ColDef<GridRow>[] = [
    {
      field: 'front',
      headerName: 'Front',
      editable: true,
      cellRenderer: CardCellRendererComponent,
      valueSetter: (params): boolean => {
        if (params.newValue === params.oldValue) return false
        return params.newValue?.trim() !== ''
      },
      minWidth: 200,
    },
    {
      field: 'back',
      headerName: 'Back',
      editable: true,
      cellRenderer: CardCellRendererComponent,
      valueSetter: (params): boolean => {
        if (params.newValue === params.oldValue) return false
        return params.newValue?.trim() !== ''
      },
      minWidth: 200,
    },
    // {
    //   field: 'position',
    //   headerName: 'Position',
    //   pinned: 'left',
    //   maxWidth: 50,
    //   editable: false,
    //   sort: 'asc',
    // },
  ]

  defaultColDef: ColDef<GridRow> = {
    sortable: true,
    filter: false,
    autoHeight: true,
  }

  errorMessage: string = ''

  @Output() rowsSelected = new EventEmitter<GridRow[]>()

  ngOnInit() {
    // Use the user signal from AuthService instead of user$ subscription
    if (this.authService.isAuthenticated()) {
      this.isFetching.set(true)
      this.loadData().finally(() => {
        this.isFetching.set(false)
        this.isInitialLoadComplete.set(true)
      })
    }

    // Watch for auth changes using effect()
    effect(() => {
      if (this.authService.isAuthenticated()) {
        this.isFetching.set(true)
        this.loadData().finally(() => {
          this.isFetching.set(false)
          this.isInitialLoadComplete.set(true)
        })
      }
    })
  }

  private async loadData(): Promise<void> {
    try {
      console.log('AgGrid: Loading data from backend')
      const sets = await this.flashcardService.loadFromBackend()
      console.log(`AgGrid: Loaded ${sets.length} sets from backend`)

      if (sets.length === 0) {
        console.log('AgGrid: No sets found in backend')
      }

      // Data is already loaded in the service and local storage
      // Now refresh the grid with the updated data
      this.refreshGridData()
    } catch (error) {
      console.error('Error loading data:', error)
      this.errorMessage = 'Failed to load flashcards. Please try again.'
    }
  }

  /**
   * Refreshes the grid data from the FlashcardService
   */
  private refreshGridData(): void {
    // Get the updated sets from the service
    const allSets = this.flashcardService.sets()
    console.log(`AgGrid: Refreshing grid with ${allSets.length} sets`)

    // The rowData is already a computed signal that uses the latest state
    // Just update the grid if it's available
    if (this.gridApi) {
      this.gridApi.refreshCells()
    }
  }

  /**
   * Handles cell value changes with strict type checking
   */
  async onCellValueChanged(event: CellValueChangedEvent<GridRow>) {
    if (!event.data) return

    const field = event.colDef.field as keyof GridRow
    if (!field || !['front', 'back', 'difficulty'].includes(field as string)) {
      return
    }

    try {
      // Build update DTO with strict types
      const updateDto: UpdateFlashcardDto = {
        front: event.data.front,
        back: event.data.back,
        difficulty: event.data.difficulty,
        position: event.data.position,
      }

      // Get the current set
      const set = this.flashcardService.getFlashcardSet(event.data.setId)
      if (!set) {
        throw new Error('Flashcard set not found')
      }

      // Update the flashcard in the set
      const updatedSet = {
        ...set,
        flashcards: set.flashcards.map((flashcard) =>
          flashcard.id === event.data.flashcardId
            ? {
                ...flashcard,
                [field]: updateDto[field as keyof UpdateFlashcardDto],
              }
            : flashcard,
        ),
      }

      // Update the set using flashcardService
      this.flashcardService.updateFlashcardSet(updatedSet)
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
    params.api.sizeColumnsToFit()

    // Selection handler
    params.api.addEventListener('selectionChanged', () => {
      const selectedRows = params.api.getSelectedRows()
      this.selectionService.updateSelection(selectedRows)
    })

    // Resize handler
    const resizeHandler = () => params.api.sizeColumnsToFit()
    window.addEventListener('resize', resizeHandler)

    // Cleanup resize listener on destroy
    this.destroyRef.onDestroy(() => {
      window.removeEventListener('resize', resizeHandler)
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

  ngOnDestroy() {
    // No need for effect cleanup anymore
  }
}
