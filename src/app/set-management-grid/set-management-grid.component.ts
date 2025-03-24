import {
  Component,
  inject,
  DestroyRef,
  signal,
  Output,
  EventEmitter,
  OnInit,
} from '@angular/core'
import { AgGridAngular } from 'ag-grid-angular'
import {
  ColDef,
  CellValueChangedEvent,
  GridReadyEvent,
  FirstDataRenderedEvent,
  ModuleRegistry,
  ClientSideRowModelModule,
  IDetailCellRendererParams,
} from 'ag-grid-community'
import {
  MasterDetailModule,
  MenuModule,
  ColumnsToolPanelModule,
} from 'ag-grid-enterprise'
import { CommonModule } from '@angular/common'
import { TuiButton, TuiIcon, TuiDialogService } from '@taiga-ui/core'
import { LocalStorageService } from '../../services/state/local-storage.service'
import { ThemeService } from '../../services/theme.service'
import { AgGridConfigService } from '../ag-grid-config.service'
import { IconCellRendererComponent } from '../cell-renderer/icon-cell-renderer.component'
import { IconCellEditorComponent } from '../cell-editor/icon-cell-editor.component'
import { FlashcardSetWithCards, Flashcard } from '../../api'
import { AuthService } from '../../services/auth.service'
import { firstValueFrom } from 'rxjs'

// Register required modules
ModuleRegistry.registerModules([
  ClientSideRowModelModule,
  MasterDetailModule,
  MenuModule,
  ColumnsToolPanelModule,
])

@Component({
  selector: 'app-set-management-grid',
  standalone: true,
  imports: [AgGridAngular, CommonModule, TuiButton, TuiIcon],
  template: `
    <div class="flex justify-between p-4">
      <button
        tuiButton
        type="button"
        appearance="secondary"
        size="m"
        (click)="onBack.emit()"
      >
        <tui-icon icon="@tui.arrow-left" class="mr-2"></tui-icon>
        Back to Cards
      </button>
      <button
        tuiButton
        type="button"
        appearance="primary"
        size="m"
        (click)="createNewSet()"
      >
        <tui-icon icon="@tui.plus" class="mr-2"></tui-icon>
        New Set
      </button>
    </div>

    <ag-grid-angular
      class="w-full h-[80vh] m-2"
      [theme]="
        themeService.darkMode()
          ? gridConfig.myThemeDark
          : gridConfig.myThemeLight
      "
      [columnDefs]="columnDefs"
      [defaultColDef]="defaultColDef"
      [masterDetail]="true"
      [detailRowHeight]="400"
      [detailCellRendererParams]="detailCellRendererParams"
      [rowData]="localStorageService.getState().flashcardSets"
      (firstDataRendered)="onFirstDataRendered($event)"
      (gridReady)="onGridReady($event)"
    ></ag-grid-angular>

    @if (errorMessage()) {
    <div
      class="fixed top-4 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded shadow-lg z-50"
    >
      <div class="flex items-center justify-between">
        <span>{{ errorMessage() }}</span>
        <button (click)="dismissError()" class="ml-4 font-bold">Close</button>
      </div>
    </div>
    }
  `,
})
export class SetManagementGridComponent implements OnInit {
  @Output() onBack = new EventEmitter<void>()

  readonly localStorageService = inject(LocalStorageService)
  readonly authService = inject(AuthService)
  readonly themeService = inject(ThemeService)
  readonly gridConfig = inject(AgGridConfigService)
  readonly dialogService = inject(TuiDialogService)

  protected readonly errorMessage = signal('')

  columnDefs: ColDef[] = [
    {
      field: 'title',
      headerName: 'Set Title',
      editable: true,
      cellRenderer: 'agGroupCellRenderer',
      flex: 1,
      minWidth: 200,
      onCellValueChanged: this.onSetCellValueChanged.bind(this),
    },
    {
      field: 'icon_id',
      headerName: 'Icon',
      editable: true,
      maxWidth: 100,
      cellRenderer: IconCellRendererComponent,
      cellEditor: IconCellEditorComponent,
      cellEditorParams: {
        values: [
          'tuiIconBookOpen',
          'tuiIconBook',
          'tuiIconEdit',
          'tuiIconStar',
          'tuiIconHeart',
          'tuiIconCheck',
          'tuiIconBrain',
        ],
      },
      onCellValueChanged: this.onSetCellValueChanged.bind(this),
    },
    {
      field: 'description',
      headerName: 'Description',
      editable: true,
      flex: 2,
      minWidth: 300,
      onCellValueChanged: this.onSetCellValueChanged.bind(this),
    },
    {
      headerName: 'Cards',
      valueGetter: (params) => params.data?.flashcards?.length ?? 0,
      width: 100,
    },
    {
      field: 'created_at',
      headerName: 'Created',
      valueFormatter: (params) =>
        params.value
          ? new Date(params.value).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })
          : '',
      width: 160,
    },
    {
      headerName: 'Actions',
      maxWidth: 100,
      cellRenderer: IconCellRendererComponent,
      cellRendererParams: {
        icon: '@tui.trash-2',
        buttonClass: 'text-red-500 hover:text-red-700',
      },
      onCellClicked: async (params: any) => {
        if (await this.confirmDelete()) {
          this.deleteSet(params.data.id)
        }
      },
    },
  ]

  defaultColDef: ColDef = {
    sortable: true,
    filter: true,
    resizable: true,
    suppressMovable: false,
    wrapText: true,
    autoHeight: true,
    cellClass: 'text-sm py-2',
  }

  detailCellRendererParams: IDetailCellRendererParams<
    FlashcardSetWithCards,
    Flashcard
  > = {
    detailGridOptions: {
      columnDefs: [
        {
          field: 'front',
          headerName: 'Front',
          flex: 1,
          wrapText: true,
          autoHeight: true,
          cellStyle: {
            textAlign: 'center',
            display: 'flex',
            alignItems: 'center',
          },
        },
        {
          field: 'back',
          headerName: 'Back',
          flex: 1,
          wrapText: true,
          autoHeight: true,
        },
      ],
      defaultColDef: {
        sortable: true,
        flex: 1,
        wrapText: true,
        autoHeight: true,
        headerClass: 'line-height-1.5',
      },
    },
    getDetailRowData: (params) => {
      params.successCallback(params.data.flashcards)
    },
  } as IDetailCellRendererParams<FlashcardSetWithCards, Flashcard>

  ngOnInit() {
    // Initialize grid data from localStorage
    this.refreshGridData()
  }

  /**
   * Refresh grid data from localStorage
   */
  refreshGridData() {
    const sets = this.localStorageService.getState().flashcardSets
    if (this.gridApi) {
      try {
        // First try proper AG Grid method
        this.gridApi.setRowData(sets)
      } catch (e) {
        console.warn(
          'Error using setRowData, falling back to alternative method',
          e,
        )
        // If the above fails, try this alternative
        if (this.gridApi.applyTransaction) {
          this.gridApi.applyTransaction({ update: sets })
        }
      }
    }
  }

  onGridReady(params: GridReadyEvent) {
    // Store reference to the grid API
    this.gridApi = params.api

    // Wait a tick to ensure grid is properly initialized
    setTimeout(() => {
      // Initialize with data
      this.refreshGridData()
    }, 0)

    // Add event listener for cell value changed to handle edits
    params.api.addEventListener(
      'cellValueChanged',
      this.onSetCellValueChanged.bind(this),
    )
  }

  /**
   * Handles cell value changes from AG Grid
   */
  onSetCellValueChanged(event: any): void {
    if (!event.data || !event.data.id) {
      console.warn('Missing data or ID in cell value changed event')
      return
    }

    const fieldName = event.column?.getColId() || ''
    const newValue = event.newValue

    console.log(
      `Cell value changed for set ${event.data.id}:`,
      fieldName,
      newValue,
    )

    // Update the set in LocalStorageService with the new value
    this.localStorageService.updateState((state) => ({
      ...state,
      flashcardSets: state.flashcardSets.map((set) =>
        set.id === event.data.id
          ? {
              ...set,
              [fieldName]: newValue,
              updated_at: new Date().toISOString(),
            }
          : set,
      ),
    }))

    // Mark the set as dirty for syncing
    this.localStorageService.markDirty(event.data.id)
    console.log(`Set ${event.data.id} marked as dirty after cell value change`)
  }

  /**
   * Handles set deletion with proper cleanup
   */
  private deleteSet(setId: string): void {
    console.log(`Deleting set with ID: ${setId}`)

    // Remove the set from localStorage
    this.localStorageService.removeSet(setId)

    // Mark the deletion for syncing with backend
    this.localStorageService.markDirty(setId)

    // Wait a moment for the deletion to be processed
    setTimeout(() => {
      // Get the fresh data from localStorage
      const updatedSets = this.localStorageService.getState().flashcardSets

      // Force refresh the grid data
      try {
        if (this.gridApi) {
          this.gridApi.setRowData(updatedSets)
        }
      } catch (error) {
        console.warn('Error refreshing grid after deletion:', error)
        // Try alternative refresh method
        if (this.gridApi && this.gridApi.refreshCells) {
          this.gridApi.refreshCells({ force: true })
        }
      }
    }, 100)

    console.log(`Set ${setId} marked as deleted and will be synced`)
  }

  async createNewSet(): Promise<void> {
    try {
      // Generate a new UUID for the set
      const newSetId = crypto.randomUUID()

      // Create a new set with default values
      const newSet: FlashcardSetWithCards = {
        id: newSetId,
        title: 'New Set',
        description: 'Your flashcard collection',
        createdAt: new Date().toISOString(),
        flashcards: [],
        iconId: 'tuiIconBook',
        setPosition: this.localStorageService.getState().flashcardSets.length,
        updatedAt: new Date().toISOString(),
        createdBy: this.authService.user()?.id ?? 'local-user',
      }

      // Add the new set to localStorage
      this.localStorageService.updateState((state) => ({
        ...state,
        flashcardSets: [...state.flashcardSets, newSet],
      }))

      // Mark the set as dirty for syncing
      this.localStorageService.markDirty(newSetId)

      // Refresh the grid to show the new set
      setTimeout(() => {
        this.refreshGridData()
      }, 50)

      console.log(`New set created with ID: ${newSetId}`)
    } catch (error) {
      console.error('Failed to create new set:', error)
      this.errorMessage.set('Failed to create new set')
    }
  }

  dismissError(): void {
    this.errorMessage.set('')
  }

  private gridApi: any

  private async confirmDelete(): Promise<boolean> {
    return await firstValueFrom(
      this.dialogService.open<boolean>(
        'Are you sure you want to delete this set?',
        {
          label: 'This action cannot be undone',
        },
      ),
    )
      .then(() => true)
      .catch(() => false)
  }

  onFirstDataRendered(params: FirstDataRenderedEvent) {
    setTimeout(() => {
      params.api.sizeColumnsToFit()
    }, 0)
  }
}
