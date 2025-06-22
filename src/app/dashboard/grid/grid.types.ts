import { ModuleRegistry } from 'ag-grid-community'
import { AllEnterpriseModule } from 'ag-grid-enterprise'
import { Flashcard } from '../../api'

// Register AG Grid modules - centralized registration
ModuleRegistry.registerModules([
  AllEnterpriseModule
  
])

/**
 * Interface for grid row data representing a flashcard
 * Extends the OpenAPI Flashcard type with additional grid-specific properties
 */
export interface GridRow extends Omit<Flashcard, 'id' | 'difficulty'> {
  readonly flashcardId: string  // Maps to Flashcard.id
  readonly set_title: string    // Additional property for display
  difficulty: number | null     // Simplified from Record<string, any>
}

/**
 * Configuration object for grid performance settings
 */
export interface GridPerformanceConfig {
  defaultCardSize: number
  tableModeThreshold: number
  debounceMs: number
  rowBuffer: number
}