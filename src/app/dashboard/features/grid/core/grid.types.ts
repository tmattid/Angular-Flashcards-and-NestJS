import { ModuleRegistry, ClientSideRowModelModule } from 'ag-grid-community'
import { MenuModule, SideBarModule, RowGroupingModule } from 'ag-grid-enterprise'

// Register AG Grid modules - centralized registration
ModuleRegistry.registerModules([
  ClientSideRowModelModule,
  RowGroupingModule,
  MenuModule,
  SideBarModule,
])

/**
 * Interface for grid row data representing a flashcard
 * Used by AG Grid to display and edit flashcard data
 */
export interface GridRow {
  readonly setId: string
  readonly flashcardId: string
  readonly set_title: string
  front: string
  back: string
  readonly tags: string[] | null
  difficulty: number | null
  readonly created_at: string
  readonly position: number
}

/**
 * Configuration object for grid performance settings
 */
export interface GridPerformanceConfig {
  defaultCardSize: number
  tableModeThreshold: number
  debounceMs: number
  rowBuffer: number
  cacheBlockSize: number
}