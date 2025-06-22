import { Injectable, inject, signal, computed } from '@angular/core'
import { GridApi, GridOptions, ColDef } from 'ag-grid-community'
import { GridRow } from '../grid.types'
import { LocalStorageService } from '../../../services/state/local-storage.service'
import { FlashcardsService, Flashcard } from '../../../api'
import { firstValueFrom } from 'rxjs'

/**
 * Simplified Grid Service
 * Handles all grid-related operations and configurations
 */
@Injectable({
  providedIn: 'root',
})
export class GridService {
  private readonly localStorage = inject(LocalStorageService)
  private readonly flashcardsApi = inject(FlashcardsService)

  // Grid state
  readonly gridApi = signal<GridApi<GridRow> | null>(null)
  readonly gridMode = signal<'edit' | 'generate'>('generate')
  readonly errorMessage = signal<string | null>(null)
  readonly selectedRowsSignal = signal<GridRow[]>([])
  readonly generatedCards = signal<Flashcard[]>([])

  // Computed values
  readonly isEditMode = computed(() => this.gridMode() === 'edit')
  readonly isGenerateMode = computed(() => this.gridMode() === 'generate')

  readonly currentSet = computed(() => {
    const state = this.localStorage.getState()
    if (!state.currentSetId) return null
    return state.flashcardSets.find((s) => s.id === state.currentSetId) || null
  })

  readonly currentSetCards = computed(() => {
    const set = this.currentSet()
    if (!set) return []

    return set.flashcards
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      .map(
        (card): GridRow => ({
          setId: set.id,
          flashcardId: card.id,
          set_title: set.title,
          front: card.front,
          back: card.back,
          tags: card.tags ?? [],
          difficulty: card.difficulty?.['value'] ?? null,
          createdAt: card.createdAt,
          updatedAt: card.updatedAt,
          position: card.position,
        }),
      )
  })

  readonly selectedCards = computed(() => {
    return this.selectedRowsSignal()
  })

  // Grid configuration
  readonly gridOptions: GridOptions = {
    defaultColDef: {
      sortable: true,
      filter: false,
      resizable: true,
      suppressSizeToFit: true,
    },
    rowSelection: 'multiple',
    suppressRowClickSelection: true,
    headerHeight: 40,
    suppressRowVirtualisation: false,
    rowBuffer: 20,
    enableCellTextSelection: true,
    domLayout: 'normal',
    rowHeight: 60,
    suppressColumnVirtualisation: false,
  }

  readonly columnDefs: ColDef[] = [
    {
      headerCheckboxSelection: true,
      checkboxSelection: true,
      width: 50,
      minWidth: 50,
      maxWidth: 50,
      pinned: 'left',
      lockPosition: true,
      sortable: false,
      filter: false,
      resizable: false,
      suppressSizeToFit: true,
      cellClass: 'checkbox-column',
      headerClass: 'checkbox-column-header',
    },
    {
      field: 'front',
      headerName: 'Front',
      editable: true,
      flex: 1,
      minWidth: 300,
      suppressSizeToFit: true,
      wrapText: true,
      autoHeight: true,
      cellClass: 'text-sm',
      headerClass: 'text-sm',
      cellStyle: {
        lineHeight: '1.5',
        fontSize: '12px',
      },
      headerStyle: {
        fontSize: '12px',
      },
    },
    {
      field: 'back',
      headerName: 'Back',
      editable: true,
      flex: 1,
      minWidth: 200,
      suppressSizeToFit: true,
      wrapText: true,
      autoHeight: true,
      cellClass: 'text-sm',
      headerClass: 'text-sm',
      cellStyle: {
        lineHeight: '1.5',
        fontSize: '12px',
      },
    },
  ]

  // Public methods
  setGridApi(api: GridApi<GridRow>): void {
    this.gridApi.set(api)

    // Set up selection change listener
    api.addEventListener('selectionChanged', () => {
      const selectedRows = api.getSelectedRows()
      this.selectedRowsSignal.set(selectedRows)
    })
  }

  setGridMode(mode: 'edit' | 'generate'): void {
    this.gridMode.set(mode)

    if (mode === 'generate') {
      this.gridApi()?.deselectAll()
    }
    // Keep generated cards when switching modes to preserve state
  }

  setGeneratedCards(cards: Flashcard[]): void {
    this.generatedCards.set(cards)
  }

  clearGeneratedCards(): void {
    this.generatedCards.set([])
  }

  async addGeneratedCardsToSet(cards: Flashcard[]): Promise<void> {
    const set = this.currentSet()
    if (!set || !cards.length) return

    try {
      // Convert generated cards to flashcards with proper IDs and positions
      const newCards: Flashcard[] = cards.map((card, index) => ({
        ...card,
        id: crypto.randomUUID(), // Generate new ID for each card
        setId: set.id,
        position: set.flashcards.length + index,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }))

      // Update local storage
      this.localStorage.updateState((state) => ({
        ...state,
        flashcardSets: state.flashcardSets.map((s) =>
          s.id === set.id
            ? {
                ...s,
                flashcards: [...s.flashcards, ...newCards],
                updatedAt: new Date().toISOString(),
              }
            : s
        ),
      }))

      // Mark as dirty for sync
      await this.localStorage.markDirty(set.id)

      // Clear generated cards after adding
      this.clearGeneratedCards()

      console.log(`✅ Added ${newCards.length} cards to set: ${set.title}`)
    } catch (error) {
      this.errorMessage.set('Failed to add cards to set')
      console.error('Add cards error:', error)
    }
  }

  async addSingleGeneratedCard(card: Flashcard): Promise<void> {
    await this.addGeneratedCardsToSet([card])
  }

  async addGeneratedCardAtPosition(card: Flashcard, position: number): Promise<void> {
    const set = this.currentSet()
    if (!set) return

    try {
      // Create new card with proper ID and position
      const newCard: Flashcard = {
        ...card,
        id: crypto.randomUUID(),
        setId: set.id,
        position: position,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      // Update positions of existing cards
      const updatedFlashcards = [...set.flashcards]
      
      // Insert the new card at the specified position
      updatedFlashcards.splice(position, 0, newCard)
      
      // Update positions for all cards
      const reorderedCards = updatedFlashcards.map((c, index) => ({
        ...c,
        position: index
      }))

      // Update local storage
      this.localStorage.updateState((state) => ({
        ...state,
        flashcardSets: state.flashcardSets.map((s) =>
          s.id === set.id
            ? {
                ...s,
                flashcards: reorderedCards,
                updatedAt: new Date().toISOString(),
              }
            : s
        ),
      }))

      // Remove the card from generated cards
      const updatedGeneratedCards = this.generatedCards().filter(c => c.id !== card.id)
      this.generatedCards.set(updatedGeneratedCards)

      // Mark as dirty for sync
      await this.localStorage.markDirty(set.id)

      console.log(`✅ Added card at position ${position}: ${newCard.front}`)
    } catch (error) {
      this.errorMessage.set('Failed to add card')
      console.error('Add card error:', error)
    }
  }

  async moveCardBackToGenerated(cardRow: GridRow, position: number): Promise<void> {
    const set = this.currentSet()
    if (!set) return

    try {
      // Find the card in the set
      const cardToMove = set.flashcards.find(c => c.id === cardRow.flashcardId)
      if (!cardToMove) return

      // Convert back to a generated card format
      const generatedCard: Flashcard = {
        id: cardToMove.id,
        setId: '', // Generated cards don't belong to a set
        front: cardToMove.front,
        back: cardToMove.back,
        tags: cardToMove.tags || [],
        position: position,
        createdAt: cardToMove.createdAt,
        updatedAt: cardToMove.updatedAt,
      }

      // Remove from set
      const remainingCards = set.flashcards
        .filter(c => c.id !== cardToMove.id)
        .map((c, index) => ({ ...c, position: index }))

      // Update local storage
      this.localStorage.updateState((state) => ({
        ...state,
        flashcardSets: state.flashcardSets.map((s) =>
          s.id === set.id
            ? {
                ...s,
                flashcards: remainingCards,
                updatedAt: new Date().toISOString(),
              }
            : s
        ),
      }))

      // Add back to generated cards at specific position
      const currentGenerated = [...this.generatedCards()]
      currentGenerated.splice(position, 0, generatedCard)
      this.generatedCards.set(currentGenerated)

      // Mark as dirty for sync
      await this.localStorage.markDirty(set.id)

      console.log(`↩️ Moved card back to generated: ${cardToMove.front}`)
    } catch (error) {
      this.errorMessage.set('Failed to move card')
      console.error('Move card error:', error)
    }
  }

  reorderSetCards(fromIndex: number, toIndex: number): void {
    const set = this.currentSet()
    if (!set || fromIndex === toIndex) return

    const cards = [...set.flashcards]
    const [movedCard] = cards.splice(fromIndex, 1)
    cards.splice(toIndex, 0, movedCard)

    // Update positions
    const reorderedCards = cards.map((c, index) => ({ ...c, position: index }))

    // Update local storage
    this.localStorage.updateState((state) => ({
      ...state,
      flashcardSets: state.flashcardSets.map((s) =>
        s.id === set.id
          ? {
              ...s,
              flashcards: reorderedCards,
              updatedAt: new Date().toISOString(),
            }
          : s
      ),
    }))

    this.localStorage.markDirty(set.id)
    console.log(`🔄 Reordered cards in set`)
  }

  reorderGeneratedCards(fromIndex: number, toIndex: number): void {
    if (fromIndex === toIndex) return

    const cards = [...this.generatedCards()]
    const [movedCard] = cards.splice(fromIndex, 1)
    cards.splice(toIndex, 0, movedCard)

    this.generatedCards.set(cards)
    console.log(`🔄 Reordered generated cards`)
  }

  selectSet(setId: string): void {
    // Clear generated cards when changing sets to avoid confusion
    this.clearGeneratedCards()
    
    this.localStorage.updateState((state) => ({
      ...state,
      currentSetId: setId,
    }))
  }

  async addCard(): Promise<void> {
    const set = this.currentSet()
    if (!set) return

    const newCard: Flashcard = {
      id: `new-${Date.now()}`,
      setId: set.id,
      front: '',
      back: '',
      tags: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      position: set.flashcards.length,
    }

    // Add to grid immediately
    this.gridApi()?.applyTransaction({
      add: [this.cardToGridRow(newCard, set.id, set.title)],
    })

    // Start editing
    requestAnimationFrame(() => {
      const api = this.gridApi()
      if (api) {
        const rowNode = api.getRowNode(newCard.id)
        if (rowNode && typeof rowNode.rowIndex === 'number') {
          api.startEditingCell({
            rowIndex: rowNode.rowIndex,
            colKey: 'front',
          })
        }
      }
    })
  }

  async updateCard(
    cardId: string,
    updates: { front?: string; back?: string },
  ): Promise<void> {
    const set = this.currentSet()
    if (!set) return

    try {
      // Update local state
      this.localStorage.updateState((state) => ({
        ...state,
        flashcardSets: state.flashcardSets.map((s) =>
          s.id === set.id
            ? {
                ...s,
                flashcards: s.flashcards.map((c) =>
                  c.id === cardId
                    ? { ...c, ...updates, updatedAt: new Date().toISOString() }
                    : c,
                ),
                updatedAt: new Date().toISOString(),
              }
            : s,
        ),
      }))

      // Mark as dirty for sync
      await this.localStorage.markDirty(set.id)

      // Update backend
      await firstValueFrom(this.flashcardsApi.updateCard(cardId, updates))
    } catch (error) {
      this.errorMessage.set('Failed to update card')
      console.error('Update card error:', error)
    }
  }

  async deleteSelectedCards(): Promise<void> {
    const selected = this.selectedCards()
    if (selected.length === 0) return

    const set = this.currentSet()
    if (!set) return

    if (!confirm(`Delete ${selected.length} card(s)?`)) return

    const idsToDelete = new Set(selected.map((row) => row.flashcardId))

    try {
      // Update local state first
      this.localStorage.updateState((state) => ({
        ...state,
        flashcardSets: state.flashcardSets.map((s) =>
          s.id === set.id
            ? {
                ...s,
                flashcards: s.flashcards.filter((c) => !idsToDelete.has(c.id)),
                updatedAt: new Date().toISOString(),
              }
            : s,
        ),
      }))

      await this.localStorage.markDirty(set.id)

      // Remove from grid
      this.gridApi()?.applyTransaction({ remove: selected })

      // Delete from backend
      for (const cardId of idsToDelete) {
        await firstValueFrom(this.flashcardsApi.deleteCard(cardId))
      }
    } catch (error) {
      this.errorMessage.set('Failed to delete cards')
      console.error('Delete cards error:', error)

      // Revert local state on error
      this.refreshGrid()
    }
  }

  refreshGrid(): void {
    const api = this.gridApi()
    if (api) {
      api.onRowHeightChanged()
      api.refreshCells()
    }
  }

  private cardToGridRow(
    card: Flashcard,
    setId: string,
    setTitle: string,
  ): GridRow {
    return {
      setId,
      flashcardId: card.id,
      set_title: setTitle,
      front: card.front,
      back: card.back,
      tags: card.tags ?? [],
      difficulty: card.difficulty?.['value'] ?? null,
      createdAt: card.createdAt,
      updatedAt: card.updatedAt,
      position: card.position,
    }
  }
}
