import {
  Component,
  inject,
  DestroyRef,
  signal,
  OnInit,
  effect,
} from '@angular/core'
import { AgGridAngular } from 'ag-grid-angular'
import {
  GridReadyEvent,
  FirstDataRenderedEvent,
  ModuleRegistry,
  ClientSideRowModelModule,
  IDetailCellRendererParams,
  GridApi,
  ValueSetterParams,
  GetDetailRowDataParams,
  RowDataTransaction,
  GridOptions,
  AllCommunityModule,
  CellValueChangedEvent,
} from 'ag-grid-community'
import { AllEnterpriseModule } from 'ag-grid-enterprise'
import { CommonModule } from '@angular/common'
import { TuiRoot, TuiDialogService, TuiButton, TuiIcon } from '@taiga-ui/core'
import { LocalStorageService } from '../../../../services/state/local-storage.service'
import { ThemeService } from '../../../../services/theme.service'
import { FlashcardSetWithCards, Flashcard } from '../../../../api'
import { AuthService } from '../../../../services/auth.service'
import { firstValueFrom } from 'rxjs'
import { SetManagementGridConfigService } from '../services/set-management-grid-config.service'
import { FlashcardDetailRendererComponent } from './flashcard-detail-renderer.component'
import { FlashcardService } from '../../../../services/flashcard-http.service'

// Register required modules
ModuleRegistry.registerModules([AllEnterpriseModule, AllCommunityModule])

@Component({
  selector: 'app-set-management-grid',
  standalone: true,
  imports: [AgGridAngular, CommonModule, TuiButton, TuiIcon],
  host: {
    '[class.dark-theme]': 'themeService.darkMode()',
  },
  template: `
    <div class="flex h-full flex-col">
      <div class="flex justify-end p-4">
        <button
          tuiButton
          type="button"
          appearance="primary"
          size="m"
          (click)="createNewSet()"
          class="flex items-center"
        >
          <tui-icon icon="@tui.plus" class="mr-2 h-5 w-5"></tui-icon>
          New Set
        </button>
      </div>

      <div class="flex-1 min-h-0 p-4">
        <ag-grid-angular
          class="w-full h-full ag-theme-quartz"
          [theme]="
            themeService.darkMode()
              ? gridConfig.myThemeDark
              : gridConfig.myThemeLight
          "
          [columnDefs]="gridConfig.columnDefs"
          [defaultColDef]="gridConfig.defaultColDef"
          [masterDetail]="true"
          [detailRowHeight]="275"
          [detailCellRenderer]="'flashcardDetailRenderer'"
          [components]="{
            flashcardDetailRenderer: FlashcardDetailRendererComponent
          }"
          [rowData]="localStorageService.getState().flashcardSets"
          [gridOptions]="gridConfig.gridOptions"
          (firstDataRendered)="onFirstDataRendered($event)"
          (gridReady)="onGridReady($event)"
          (cellClicked)="onCellClicked($event)"
          (cellValueChanged)="onCellValueChanged($event)"
        ></ag-grid-angular>
      </div>
    </div>

    @if (errorMessage()) {
    <div
      class="fixed top-4 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded shadow-lg z-50"
    >
      <div class="flex items-center justify-between">
        <span>{{ errorMessage() }}</span>
        <button (click)="dismissError()" class="ml-4 font-bold">Close</button>
      </div>
    </div>
    } @if (showConfirmDialog()) {
    <div
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    >
      <div
        class="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-sm w-full"
      >
        <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Delete Confirmation
        </h3>
        <p class="text-gray-600 dark:text-gray-300 mb-6">
          Are you sure you want to delete this set? This action cannot be
          undone.
        </p>
        <div class="flex justify-end gap-3">
          <button
            class="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600
                   text-gray-800 dark:text-white rounded transition-colors"
            (click)="handleConfirmResponse(false)"
          >
            Cancel
          </button>
          <button
            class="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded transition-colors"
            (click)="handleConfirmResponse(true)"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
    }
  `,
  styles: [
    `
      :host {
        display: block;
        height: 100%;
        width: 100%;
      }

      ::ng-deep .ag-cell[col-id='actions'] tui-icon {
        color: #f44336;
        cursor: pointer;
      }
    `,
  ],
})
export class SetManagementGridComponent implements OnInit {
  readonly localStorageService = inject(LocalStorageService)
  readonly authService = inject(AuthService)
  readonly themeService = inject(ThemeService)
  readonly gridConfig = inject(SetManagementGridConfigService)
  readonly dialogService = inject(TuiDialogService)
  readonly destroyRef = inject(DestroyRef)
  readonly flashcardService = inject(FlashcardService)

  protected readonly FlashcardDetailRendererComponent = FlashcardDetailRendererComponent
  protected readonly errorMessage = signal('')
  protected readonly showConfirmDialog = signal(false)
  private gridApi: GridApi<FlashcardSetWithCards> | null = null

  // For custom confirm dialog
  private confirmResolve: ((value: boolean) => void) | null = null
  private setToDelete: string | null = null

  constructor() {
    effect(() => {
      const newTheme = this.themeService.darkMode()
        ? this.gridConfig.myThemeDark
        : this.gridConfig.myThemeLight
    })
  }

  ngOnInit() {
    this.refreshGridData()
  }

  refreshGridData() {
    const sets = this.localStorageService.getState().flashcardSets
    console.log('Refreshing grid with', sets.length, 'sets')

    if (this.gridApi) {
      try {
        // Directly set the new row data - this will replace existing data
        this.gridApi.setGridOption('rowData', sets)
        this.gridApi.sizeColumnsToFit()
        this.gridApi.redrawRows()

        console.log('Grid data refreshed successfully')
      } catch (error) {
        console.error('Error refreshing grid data:', error)
        this.errorMessage.set('Failed to refresh grid')
      }
    } else {
      console.warn('Grid API not available for refresh')
    }
  }

  onGridReady(params: GridReadyEvent<FlashcardSetWithCards>) {
    this.gridApi = params.api
    this.refreshGridData()

    const resizeHandler = () => {
      if (this.gridApi) {
        this.gridApi.sizeColumnsToFit()
      }
    }
    window.addEventListener('resize', resizeHandler)

    this.destroyRef.onDestroy(() => {
      window.removeEventListener('resize', resizeHandler)
    })
  }

  async createNewSet(): Promise<void> {
    try {
      const newSetId = crypto.randomUUID()
      const newSet: FlashcardSetWithCards = {
        id: newSetId,
        title: 'New Set',
        description: 'Your flashcard collection',
        createdAt: new Date().toISOString(),
        flashcards: [],
        iconId: '@tui.book',
        setPosition: this.localStorageService.getState().flashcardSets.length,
        updatedAt: new Date().toISOString(),
        createdBy: this.authService.user()?.id ?? 'local-user',
      }

      console.log('Creating new set:', newSet)

      this.localStorageService.updateState((state) => ({
        ...state,
        flashcardSets: [...state.flashcardSets, newSet],
      }))

      this.localStorageService.markDirty(newSetId)
      this.refreshGridData()

      // Set is marked as dirty and will sync when user clicks save button

      console.log(`New set created with ID: ${newSetId}`)
    } catch (error) {
      console.error('Failed to create new set:', error)
      this.errorMessage.set('Failed to create new set')
    }
  }

  onCellValueChanged(event: CellValueChangedEvent<FlashcardSetWithCards>) {
    const field = event.colDef.field as keyof FlashcardSetWithCards
    if (!field || !event.data) return

    try {
      // Update the set in local storage
      this.localStorageService.updateState((state) => {
        const updatedSets = state.flashcardSets.map((set) =>
          set.id === event.data?.id ? { ...set, [field]: event.newValue } : set,
        )

        return {
          ...state,
          flashcardSets: updatedSets,
        }
      })

      // Mark the set as dirty for syncing
      this.localStorageService.markDirty(event.data.id)

      // Changes are marked as dirty and will sync when user clicks save button
    } catch (error) {
      console.error('Failed to update set:', error)
      this.errorMessage.set('Failed to update set')

      // Revert the changes in the grid
      if (this.gridApi) {
        this.refreshGridData()
      }
    }
  }

  dismissError(): void {
    this.errorMessage.set('')
  }

  onFirstDataRendered(params: FirstDataRenderedEvent<FlashcardSetWithCards>) {
    params.api.sizeColumnsToFit()
  }

  private async deleteSet(setId: string): Promise<void> {
    console.log(`Deleting set with ID: ${setId}`)

    try {
      // First, call the API to delete the set
      console.log('Calling API to delete set:', setId)

      try {
        // Delete from backend first
        await firstValueFrom(this.flashcardService.deleteFlashcardSet(setId))
        console.log('Set successfully deleted from backend')
      } catch (error) {
        console.error('Error deleting set from backend:', error)
        this.errorMessage.set(
          'Error deleting set from backend. Local changes still applied.',
        )
        // Continue with local deletion even if backend fails
      }

      // Get current sets
      const currentState = this.localStorageService.getState()
      const currentSets = currentState.flashcardSets

      // Filter out the set to delete
      const updatedSets = currentSets.filter((set) => set.id !== setId)

      console.log(
        `Removing set ${setId} from local storage. Before: ${currentSets.length} sets, After: ${updatedSets.length} sets`,
      )

      // Update the state with filtered sets
      this.localStorageService.updateState((state) => ({
        ...state,
        flashcardSets: updatedSets,
        // Update currentSetId if needed
        currentSetId:
          state.currentSetId === setId
            ? updatedSets.length > 0
              ? updatedSets[0].id
              : null
            : state.currentSetId,
      }))

      // Force refresh the grid after a short delay to ensure state changes are processed
      setTimeout(() => {
        this.refreshGridData()
        console.log('Grid refreshed after deletion')
      }, 50)
    } catch (error) {
      console.error('Error in delete process:', error)
      this.errorMessage.set(`Failed to delete set: ${error}`)
    }
  }

  async onCellClicked(event: any): Promise<void> {
    // Debug information to see what's clicked
    console.log('Cell clicked:', {
      colId: event.column.colId,
      dataId: event.data?.id,
      nodeId: event.node?.id,
      value: event.value,
      rowIndex: event.rowIndex,
    })

    // Handle action column clicks (delete button)
    if (event.column.colId === 'actions') {
      if (event.data && event.data.id) {
        console.log('Action clicked for set:', event.data.id)

        try {
          // Store the set ID to delete - important to capture this outside the async flow
          const setIdToDelete = event.data.id
          this.setToDelete = setIdToDelete

          // Ask for confirmation
          const confirmed = await this.confirmDelete()
          console.log('Confirmation result:', confirmed)

          // If confirmed, delete the set
          if (confirmed) {
            console.log('Proceeding with deletion of set:', setIdToDelete)
            await this.deleteSet(setIdToDelete)
            console.log('Set deletion complete')
          } else {
            console.log('Deletion cancelled by user')
          }
        } catch (error) {
          console.error('Error during delete operation:', error)
          this.errorMessage.set(
            'Failed to delete set: ' +
              (error instanceof Error ? error.message : String(error)),
          )
        }
      } else {
        console.warn('No data ID found for action click')
      }
    }
  }

  // Custom confirm dialog methods
  private async confirmDelete(): Promise<boolean> {
    console.log('Opening simple confirmation dialog')
    this.showConfirmDialog.set(true)

    return new Promise<boolean>((resolve) => {
      this.confirmResolve = resolve
    })
  }

  handleConfirmResponse(confirmed: boolean): void {
    console.log('User response:', confirmed ? 'Delete' : 'Cancel')
    this.showConfirmDialog.set(false)

    if (this.confirmResolve) {
      this.confirmResolve(confirmed)
      this.confirmResolve = null
    }
  }
}
