import { Injectable } from '@angular/core'
import {
  ColDef,
  GridOptions,
  Theme,
  ValueSetterParams,
  ICellRendererParams,
  NewValueParams,
  ValueGetterParams,
} from 'ag-grid-community'
import { themeQuartz } from 'ag-grid-enterprise'
import { IconCellRendererComponent } from '../cell-renderer/icon-cell-renderer.component'
import { IconCellEditorComponent } from '../cell-editor/icon-cell-editor.component'
import { FlashcardSetWithCards, Flashcard } from '../../../api'

@Injectable({ providedIn: 'root' })
export class SetManagementGridConfigService {
  readonly gridOptions: Partial<GridOptions> = {
    suppressRowClickSelection: true,
    rowSelection: 'multiple',
    animateRows: true,
    domLayout: 'normal',
    enableCellTextSelection: true,
    ensureDomOrder: true,
    suppressColumnVirtualisation: true,
    suppressRowVirtualisation: false,
    rowBuffer: 20,
    suppressHorizontalScroll: false,
    rowHeight: 56,
    headerHeight: 48,
    icons: {
      groupExpanded: '<span class="text-blue-500">⏷</span>',
      groupContracted: '<span class="text-blue-500">⏵</span>',
    },
    overlayNoRowsTemplate:
      '<div class="flex flex-col items-center justify-center h-full p-4 text-center">' +
      '<p class="text-lg text-gray-500 mb-2">No sets available</p>' +
      '<p class="text-sm text-gray-400">Click "New Set" to create your first set</p>' +
      '</div>',
    overlayLoadingTemplate:
      '<div class="flex items-center justify-center h-full">' +
      '<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-500"></div>' +
      '</div>',
  }

  readonly defaultColDef: ColDef = {
    sortable: true,
    filter: false,
    resizable: true,
    wrapText: true,
    autoHeight: true,
    suppressSizeToFit: false,
    cellStyle: {
      padding: '8px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'start',
    },
  }

  readonly myThemeLight: Theme = themeQuartz.withParams({
    backgroundColor: '#FFFFFF',
    foregroundColor: '#181D1F',
    accentColor: '#2196F3',
    browserColorScheme: 'light',
    headerFontSize: 14,
    borderColor: 'rgba(0, 0, 0, 0.12)',
    selectedRowBackgroundColor: 'rgba(33, 150, 243, 0.1)',
    rowHoverColor: 'rgba(0, 0, 0, 0.04)',
  })

  readonly myThemeDark = themeQuartz.withParams({
    backgroundColor: '#1f2836',
    foregroundColor: '#FFFFFF',
    accentColor: '#2196F3',
    browserColorScheme: 'dark',
    chromeBackgroundColor: {
      ref: 'foregroundColor',
      mix: 0.07,
      onto: 'backgroundColor',
    },
    headerFontSize: 14,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    selectedRowBackgroundColor: 'rgba(33, 150, 243, 0.2)',
    rowHoverColor: 'rgba(255, 255, 255, 0.04)',
  })

  readonly columnDefs: ColDef<FlashcardSetWithCards>[] = [
    {
      field: 'title',
      headerName: 'Set Title',
      editable: true,
      cellRenderer: 'agGroupCellRenderer',
      flex: 1,
      minWidth: 200,
      cellRendererParams: {
        innerRenderer: (params: any) => params.value,
        suppressCount: false,
        suppressDoubleClickExpand: true,
        suppressEnterExpand: true,
      },
      valueSetter: (
        params: ValueSetterParams<FlashcardSetWithCards, string>,
      ) => {
        if (params.newValue === params.oldValue) return false
        if (!params.newValue || params.newValue.trim() === '') return false
        if (params.data) {
          params.data.title = params.newValue
        }
        return true
      },
    },
    {
      field: 'iconId',
      headerName: 'Icon',
      editable: true,
      width: 100,
      cellRenderer: IconCellRendererComponent,
      cellEditor: IconCellEditorComponent,
      cellClass: 'ag-center-cell',
      cellEditorParams: {
        values: [
          '@tui.bookopen',
          '@tui.book',
          '@tui.edit',
          '@tui.star',
          '@tui.heart',
          '@tui.check',
          '@tui.brain',
        ],
      },
      valueSetter: (
        params: ValueSetterParams<FlashcardSetWithCards, string>,
      ) => {
        if (params.newValue === params.oldValue) return false
        if (params.data && params.newValue) {
          params.data.iconId = params.newValue
          console.log('Updated icon to:', params.newValue)
        }
        return true
      },
    },
    {
      field: 'description',
      headerName: 'Description',
      editable: true,
      flex: 2,
      minWidth: 300,
      valueSetter: (
        params: ValueSetterParams<FlashcardSetWithCards, string>,
      ) => {
        if (params.newValue === params.oldValue) return false
        if (params.data) {
          params.data.description = params.newValue || ''
        }
        return true
      },
    },
    {
      headerName: 'Cards',
      valueGetter: (params: ValueGetterParams<FlashcardSetWithCards>) =>
        params.data?.flashcards?.length ?? 0,
      width: 100,
      type: 'numericColumn',
    },
    {
      field: 'createdAt',
      headerName: 'Created',
      valueFormatter: (params) =>
        params.value
          ? new Date(params.value).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })
          : '',
      width: 140,
    },
    {
      headerName: 'Actions',
      colId: 'actions',
      width: 100,
      cellRenderer: IconCellRendererComponent,
      cellClass: 'ag-center-cell',
      cellRendererParams: {
        icon: 'trash',
        buttonClass: 'text-red-500 hover:text-red-700 cursor-pointer text-xl',
      },
    },
  ]
}
