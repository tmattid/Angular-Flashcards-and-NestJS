import {
  ModuleRegistry,
  ClientSideRowModelModule,
  RowGroupingModule,
  MenuModule,
  ColumnsToolPanelModule,
  FiltersToolPanelModule,
  RangeSelectionModule,
  RichSelectModule,
  SideBarModule,
} from 'ag-grid-enterprise'

// Register the required modules
ModuleRegistry.registerModules([
  ClientSideRowModelModule,
  RowGroupingModule,
  MenuModule,
  ColumnsToolPanelModule,
  FiltersToolPanelModule,
  RangeSelectionModule,
  RichSelectModule,
  SideBarModule,
])

// Export default grid configuration
export const defaultGridConfig = {
  // Add your default grid configuration here
  suppressMenuHide: true,
  enableRangeSelection: true,
  rowSelection: 'multiple',
  // Add more default configurations as needed
}
