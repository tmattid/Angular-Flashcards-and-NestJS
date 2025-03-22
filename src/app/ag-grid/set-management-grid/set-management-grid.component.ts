import {
  Component,
  inject,
  DestroyRef,
  signal,
  Output,
  EventEmitter,
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
import {
  ValidatedFlashcardSet,
  Flashcard,
} from '../../models/flashcards.models'
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
export class SetManagementGridComponent {
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
    },
    {
      field: 'icon_id',
      headerName: 'Icon',
      editable: true,
      maxWidth: 100,
      cellRenderer: IconCellRendererComponent,
      cellEditor: IconCellEditorComponent,
    },

    {
      field: 'description',
      headerName: 'Description',
      editable: true,
      flex: 2,
      minWidth: 300,
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
          this.localStorageService.removeSet(params.data.id)
          // Force grid refresh
          this.gridApi?.setRowData(
            this.localStorageService.getState().flashcardSets,
          )
        }
      },
    },
  ]

  defaultColDef: ColDef = {
    sortable: true,
    flex: 1,
    wrapText: true,
    autoHeight: true,
    headerClass: 'text-center',
    cellStyle: { textAlign: 'center', display: 'flex', alignItems: 'center' },
  }

  detailCellRendererParams: IDetailCellRendererParams<
    ValidatedFlashcardSet,
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
  } as IDetailCellRendererParams<ValidatedFlashcardSet, Flashcard>

  onFirstDataRendered(params: FirstDataRenderedEvent) {
    setTimeout(() => {
      params.api.sizeColumnsToFit()
    }, 0)
  }

  onGridReady(params: GridReadyEvent) {
    this.gridApi = params.api
  }

  onSetCellValueChanged(event: CellValueChangedEvent): void {
    if (!event.data) return
    this.localStorageService.markDirty(event.data.id)
  }

  async createNewSet(): Promise<void> {
    try {
      const userId = this.authService.user()?.id
      if (!userId) throw new Error('User not authenticated')

      const newSet: ValidatedFlashcardSet = {
        id: crypto.randomUUID(),
        title: 'New Set',
        description: null,
        created_at: new Date().toISOString(),
        flashcards: [],
        icon_id: '@tui.book',
        set_position: 0,
        updated_at: new Date().toISOString(),
      }

      this.localStorageService.updateState((state) => ({
        ...state,
        flashcardSets: [...state.flashcardSets, newSet],
      }))

      this.localStorageService.markDirty(newSet.id)
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
}
