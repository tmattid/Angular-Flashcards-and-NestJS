import { Injectable, inject } from '@angular/core'
import {
  ColDef,
  RowSelectionOptions,
  ICellRendererParams,
  GridOptions,
  Theme,
  themeAlpine,
  SelectionColumnDef,
} from 'ag-grid-community'
import { GridRow, GridPerformanceConfig } from './grid.types'
import { themeQuartz } from 'ag-grid-enterprise'
import { CardCellRendererComponent } from '../cells/card-cell-renderer.component'

@Injectable({ providedIn: 'root' })

export class GridConfigService {
  /* ═══════════════════════════════════════════════════════════════════════ */
  /* Performance Configuration                                                 */
  /* ═══════════════════════════════════════════════════════════════════════ */
  readonly performanceConfig: GridPerformanceConfig = {
    defaultCardSize: 120,
    tableModeThreshold: 40,
    debounceMs: 200,
    rowBuffer: 20,
    cacheBlockSize: 50,
  }

  /* ═══════════════════════════════════════════════════════════════════════ */
  /* Base Grid Options                                                        */
  /* ═══════════════════════════════════════════════════════════════════════ */
  readonly baseGridOptions: Partial<GridOptions> = {
    defaultColDef: {
      sortable: true,
      filter: false,
      resizable: true,
      suppressSizeToFit: true,
    },
    suppressRowClickSelection: true,
    rowSelection: {
      mode: 'multiRow',
      checkboxes: true,
      headerCheckbox: true,
      selectAll: 'all',
      enableClickSelection: false,
    },
    groupDefaultExpanded: 1,
    domLayout: 'autoHeight',
    headerHeight: 40,
  }

  /* ═══════════════════════════════════════════════════════════════════════ */
  /* Enhanced Grid Options with Performance                                   */
  /* ═══════════════════════════════════════════════════════════════════════ */
  getEnhancedGridOptions(): Partial<GridOptions> {
    return {
      ...this.baseGridOptions,
      // Performance optimizations
      suppressRowVirtualisation: false,
      rowBuffer: this.performanceConfig.rowBuffer,
      cacheBlockSize: this.performanceConfig.cacheBlockSize,
      suppressPropertyNamesCheck: true,
      suppressAnimationFrame: false,
      enableCellTextSelection: true,
    }
  }

  /* ═══════════════════════════════════════════════════════════════════════ */
  /* Legacy property for backward compatibility                               */
  /* ═══════════════════════════════════════════════════════════════════════ */
  get gridOptions(): Partial<GridOptions> {
    return this.baseGridOptions
  }

  readonly autoGroupColumnDef: ColDef<GridRow> = {
    headerName: 'Flashcard Set',
    minWidth: 200,
    cellRendererParams: {
      suppressCount: false,
      innerRenderer: (params: ICellRendererParams<GridRow>) => params.value,
    },
  }

  readonly myThemeLight: Theme = themeQuartz.withParams({
    backgroundColor: '#f0f0f0',
    browserColorScheme: 'light',
    chromeBackgroundColor: {
      ref: 'foregroundColor',
      mix: 0.07,
      onto: 'backgroundColor',
    },
    foregroundColor: '#000',
    headerFontSize: 14,
  })

  readonly myThemeDark = themeAlpine.withParams({
    backgroundColor: '#1f2836',
    browserColorScheme: 'dark',
    chromeBackgroundColor: {
      ref: 'foregroundColor',
      mix: 0.07,
      onto: 'backgroundColor',
    },
    foregroundColor: '#FFF',
    headerFontSize: 14,
  })

  readonly columnDefs: ColDef<GridRow>[] = [
    {
      field: 'front',
      headerName: 'Front',
      editable: true,
      cellRenderer: CardCellRendererComponent,
      valueSetter: (params): boolean => {
        if (params.newValue === params.oldValue) return false
        return params.newValue?.trim() !== ''
      },
      flex: 1,
      minWidth: 200,
      autoHeight: true,
      wrapText: true,
      checkboxSelection: true,
      headerCheckboxSelection: true,
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
      flex: 1,
      minWidth: 200,
      autoHeight: true,
      wrapText: true,
    },
  ]

  /* ═══════════════════════════════════════════════════════════════════════ */
  /* Card Mode Column Definitions                                             */
  /* ═══════════════════════════════════════════════════════════════════════ */
  getCardModeColumnDefs(): ColDef<GridRow>[] {
    return [
      {
        field: 'front',
        headerName: 'Front',
        editable: true,
        cellRenderer: CardCellRendererComponent,
        valueSetter: (params): boolean => {
          if (params.newValue === params.oldValue) return false
          return params.newValue?.trim() !== ''
        },
        flex: 1,
        minWidth: 200,
        wrapText: true,
        autoHeight: true,
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
        flex: 1,
        minWidth: 200,
        wrapText: true,
        autoHeight: true,
      },
    ]
  }

  /* ═══════════════════════════════════════════════════════════════════════ */
  /* Table Mode Column Definitions                                            */
  /* ═══════════════════════════════════════════════════════════════════════ */
  getTableModeColumnDefs(): ColDef<GridRow>[] {
    return [
      {
        field: 'front',
        headerName: 'Front',
        editable: true,
        valueSetter: (params): boolean => {
          if (params.newValue === params.oldValue) return false
          return params.newValue?.trim() !== ''
        },
        flex: 1,
        minWidth: 200,
        wrapText: true,
        autoHeight: true,
        cellStyle: {
          whiteSpace: 'normal',
          wordBreak: 'break-word',
          lineHeight: '1.4',
          padding: '8px',
          display: 'flex',
          alignItems: 'center',
        },
      },
      {
        field: 'back',
        headerName: 'Back',
        editable: true,
        valueSetter: (params): boolean => {
          if (params.newValue === params.oldValue) return false
          return params.newValue?.trim() !== ''
        },
        flex: 1,
        minWidth: 200,
        wrapText: true,
        autoHeight: true,
        cellStyle: {
          whiteSpace: 'normal',
          wordBreak: 'break-word',
          lineHeight: '1.4',
          padding: '8px',
          display: 'flex',
          alignItems: 'center',
        },
      },
      {
        field: 'difficulty',
        headerName: 'Difficulty',
        editable: true,
        width: 100,
        cellStyle: {
          textAlign: 'center',
          padding: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        },
      },
    ]
  }

  readonly selectionColumnDef: SelectionColumnDef = {
    sortable: false,
    resizable: false,
    width: 40,
    minWidth: 40,
    maxWidth: 40,
    pinned: 'left',
    suppressSizeToFit: false,
  }

  /* ═══════════════════════════════════════════════════════════════════════ */
  /* Mode Detection Helper                                                    */
  /* ═══════════════════════════════════════════════════════════════════════ */
  isTableMode(cardSize: number): boolean {
    return cardSize <= this.performanceConfig.tableModeThreshold
  }

  /* ═══════════════════════════════════════════════════════════════════════ */
  /* Dynamic Column Definitions Based on Mode                                 */
  /* ═══════════════════════════════════════════════════════════════════════ */
  getColumnDefsForMode(isTableMode: boolean): ColDef<GridRow>[] {
    return isTableMode ? this.getTableModeColumnDefs() : this.getCardModeColumnDefs()
  }

  /* ═══════════════════════════════════════════════════════════════════════ */
  /* Theme Selection Helper                                                   */
  /* ═══════════════════════════════════════════════════════════════════════ */
  getTheme(isDarkMode: boolean): Theme {
    return isDarkMode ? this.myThemeDark : this.myThemeLight
  }
}
