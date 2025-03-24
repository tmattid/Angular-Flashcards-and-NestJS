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
import { Flashcard, FlashcardSetWithCards, UpdateFlashcardDto } from '../api'
import { SetSelectionService } from '../services/set-selection.service'
import { SelectionService } from '../services/selection.service'
import { AgGridConfigService } from './ag-grid-config.service'
import { ThemeService } from '../services/theme.service'
import { CardCellRendererComponent } from './cell-renderer/card-cell-renderer.component'
import { animate, style, transition, trigger } from '@angular/animations'
import { firstValueFrom } from 'rxjs'
import { GridChatBoxComponent } from './components/grid-chat-box.component'

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

@Component({
  selector: 'app-ag-grid',
  standalone: true,
  imports: [AgGridAngular, CommonModule, GridChatBoxComponent],
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
    <div class="relative h-full w-full overflow-hidden">
      <div class="flex h-full gap-2 overflow-hidden">
        <!-- Grid Chat Box -->
        <app-grid-chat-box
          *ngIf="!setSelectionService.getIsManagingSet()"
          class="flex-shrink-0 w-2/6 overflow-hidden"
        ></app-grid-chat-box>

        <!-- Main content area -->
        <div class="grid-container flex-1 overflow-hidden">
          <!-- Standard grid view -->
          <ag-grid-angular
            *ngIf="!setSelectionService.getIsManagingSet()"
            @slideInOut
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
            [gridOptions]="gridConfig.gridOptions"
            [rowSelection]="gridConfig.rowSelection"
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
        @apply overflow-hidden h-full;
        min-width: 0;
        width: 100%;
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
  private readonly isFetching = signal(false)
  private readonly isInitialLoadComplete = signal(false)

  constructor() {
    // Create the effect in the constructor
    // effect(() => {
    //   const isAuthenticated = this.authService.isAuthenticated()
    //   if (isAuthenticated && !this.isInitialLoadComplete()) {
    //     this.isFetching.set(true)
    //     this.loadData().finally(() => {
    //       this.isFetching.set(false)
    //       this.isInitialLoadComplete.set(true)
    //     })
    //   }
    // })
  }

  ngOnInit() {
    // size columns to fit initially
    
  }

  autoGroupColumnDef = this.gridConfig.autoGroupColumnDef
  rowSelection = this.gridConfig.rowSelection

  // Remove duplicate column definitions - use only gridConfig.columnDefs
  // columnDefs: ColDef<GridRow>[] = [
  //   //check
  //   {
  //     field: 'front',
  //     headerName: 'Front',
  //     editable: true,
  //     cellRenderer: CardCellRendererComponent,
  //     valueSetter: (params): boolean => {
  //       if (params.newValue === params.oldValue) return false
  //       return params.newValue?.trim() !== ''
  //     },
  //     flex: 1,
  //     minWidth: 200,
  //     width: 400,
  //     autoHeight: true,
  //     wrapText: true,
  //   },
  //   {
  //     field: 'back',
  //     headerName: 'Back',
  //     editable: true,
  //     cellRenderer: CardCellRendererComponent,
  //     valueSetter: (params): boolean => {
  //       if (params.newValue === params.oldValue) return false
  //       return params.newValue?.trim() !== ''
  //     },
  //     flex: 1,
  //     minWidth: 200,
  //     width: 400,
  //     autoHeight: true,
  //     wrapText: true,
  //   },
  // ]

  defaultColDef: ColDef<GridRow> = {
    sortable: true,
    filter: false,
    autoHeight: true,
    wrapText: true,
    resizable: true,
    flex: 1,
  }

  errorMessage: string = ''

  @Output() rowsSelected = new EventEmitter<GridRow[]>()

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
          (card: Flashcard): GridRow => ({
            setId: set.id,
            flashcardId: card.id,
            set_title: set.title,
            front: card.front,
            back: card.back,
            tags: card.tags ?? null,
            difficulty: card.difficulty?.['value'] ?? null,
            created_at: card.createdAt,
            position: card.position,
          }),
        ),
      )
  })

  // private async loadData(): Promise<void> {
  //   try {
  //     // Check if we have a valid auth token before making the request
  //     const token = localStorage.getItem('auth_token')
  //     if (!token) {
  //       console.log('No auth token found, skipping data load')
  //       return
  //     }

  //     await firstValueFrom(this.flashcardService.getFlashcardSets())
  //     // Data is already loaded in the service and local storage
  //   } catch (error) {
  //     console.error('Error loading data:', error)
  //     this.errorMessage = 'Failed to load flashcards. Please try again.'

  //     // If unauthorized, redirect to login
  //     if (error instanceof Error && error.message.includes('Unauthorized')) {
  //       await firstValueFrom(this.authService.logout())
  //       // The router will handle the redirect to login
  //     }
  //   }
  // }

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
        difficulty: event.data.difficulty
          ? { value: event.data.difficulty }
          : undefined,
        position: event.data.position,
      }

      // Get the current set
      const set = await firstValueFrom(
        this.flashcardService.getFlashcardSet(event.data.setId),
      )
      if (!set) {
        throw new Error('Flashcard set not found')
      }

      // Update the flashcard in the set
      const updatedSet = {
        ...set,
        flashcards: set.flashcards.map((flashcard: Flashcard) =>
          flashcard.id === event.data.flashcardId
            ? {
                ...flashcard,
                [field]: updateDto[field as keyof UpdateFlashcardDto],
              }
            : flashcard,
        ),
      }

      // Update the set using flashcardService
      this.flashcardService.updateFlashcardSet(event.data.setId, {
        title: updatedSet.title,
        iconId: (updatedSet.iconId as unknown) as Record<string, any>,
        description: (updatedSet.description as unknown) as Record<string, any>,
      })
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

    // Selection handler
    params.api.addEventListener('selectionChanged', () => {
      const selectedRows = params.api.getSelectedRows()
      this.selectionService.updateSelection(selectedRows)
    })

    // Initial sizing
    this.gridApi.sizeColumnsToFit()

    // Resize handler
    const resizeHandler = () => {
      if (this.gridApi) {
        this.gridApi.sizeColumnsToFit()
      }
    }
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

  /**
   * Helper method to properly size the grid columns
   */
  private resizeGrid(): void {
    if (!this.gridApi) return
    this.gridApi.sizeColumnsToFit()
  }
}
