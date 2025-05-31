import { Injectable, inject } from '@angular/core'
import {
  ColDef,
  RowSelectionOptions,
  ICellRendererParams,
  GridOptions,
  Theme,
  themeAlpine,
} from 'ag-grid-community'
import { GridRow } from '../update-flashcards.component'
import { themeQuartz } from 'ag-grid-enterprise'
import { CardCellRendererComponent } from '../cell-renderer/card-cell-renderer.component'

@Injectable({ providedIn: 'root' })
export class AgGridConfigService {
  readonly gridOptions: Partial<GridOptions> = {
    defaultColDef: {
      sortable: true,
      filter: false,
      autoHeight: true,
      resizable: true,
      suppressSizeToFit: true,
    },
    suppressRowClickSelection: true,
    rowSelection: 'multiple',
    groupDefaultExpanded: 1,
    rowHeight: 120,
    headerHeight: 40,
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

  readonly rowSelection: RowSelectionOptions | 'single' | 'multiple' =
    'multiple'
}
