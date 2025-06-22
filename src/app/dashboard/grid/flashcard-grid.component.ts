import {
  Component,
  inject,
  signal,
  computed,
  effect,
  DestroyRef,
} from '@angular/core'
import { AgGridAngular } from 'ag-grid-angular'
import { CommonModule } from '@angular/common'
import {
  GridReadyEvent,
  CellValueChangedEvent,
  GetRowIdParams,
} from 'ag-grid-community'
import { ModuleRegistry, AllEnterpriseModule } from 'ag-grid-enterprise'
import { firstValueFrom } from 'rxjs'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { SplitterModule } from 'primeng/splitter'
import { ButtonModule } from 'primeng/button'
import { DialogModule } from 'primeng/dialog'
import { InputTextModule } from 'primeng/inputtext'
import { FormsModule } from '@angular/forms'
import { CardModule } from 'primeng/card'
import { DividerModule } from 'primeng/divider'
import { TagModule } from 'primeng/tag'
import { TooltipModule } from 'primeng/tooltip'
import { DragDropCardsComponent } from './drag-drop-cards/drag-drop-cards.component'
import { GridToolbarComponent } from './grid-toolbar/grid-toolbar.component'
import { GridSidebarComponent } from './grid-sidebar/grid-sidebar.component'

// Register AG Grid modules
ModuleRegistry.registerModules([AllEnterpriseModule])

import { GridService } from './services/grid.service'
import { LocalStorageService } from '../../services/state/local-storage.service'
import { AiChatComponent } from '../ai-chat/components/ai-chat.component'
import { FlashcardService } from '../../services/flashcard-http.service'

import { FlashcardSetWithCards } from '../../api/models/FlashcardSetWithCards'
import { CdkDragDrop } from '@angular/cdk/drag-drop'

/**
 * Simplified Flashcard Grid Component
 * Fully reactive using Angular 20 signal best practices
 */
@Component({
  selector: 'app-flashcard-grid',
  standalone: true,
  imports: [
    AgGridAngular,
    CommonModule,
    AiChatComponent,
    SplitterModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    FormsModule,
    CardModule,
    DividerModule,
    TagModule,
    TooltipModule,
    DragDropCardsComponent,
    GridToolbarComponent,
    GridSidebarComponent,
  ],
  template: `
    <div class="flashcard-grid-container">
      <!-- Enhanced Toolbar -->
      <div class="toolbar-container">
        <app-grid-toolbar
          [currentSetTitle]="vm().currentSetTitle"
          [currentSetCardCount]="vm().currentSetCardCount"
          [selectedCardCount]="vm().selectedCardCount"
          [isEditMode]="vm().isEditMode"
          [isGenerateMode]="vm().isGenerateMode"
          (toggleSidebar)="toggleSidebar()"
          (setGridMode)="gridService.setGridMode($event)"
          (addCard)="gridService.addCard()"
          (deleteSelectedCards)="gridService.deleteSelectedCards()"
        />
      </div>

      <!-- Main Content with Sidebar -->
      <div class="main-content" [style.margin-left]="vm().sidebarWidth">
        <!-- Splitter for resizable panels -->
        <p-splitter
          class="content-splitter"
          [panelSizes]="[20, 40]"
          [minSizes]="[20, 40]"
          layout="horizontal"
          resizerStyle="background: #e5e7eb; width: 6px;"
          (onResizeEnd)="onSplitterResize()"
        >
          <!-- AI Chat Panel -->
          <ng-template pTemplate="content">
            <div class="chat-panel">
              <div class="chat-container">
                <!-- Mode Indicator -->
                <div class="mode-indicator">
                  <div class="mode-indicator-content">
                    <span class="mode-label">AI Assistant</span>
                    <div class="mode-text"
                         [class.mode-edit]="vm().isEditMode"
                         [class.mode-generate]="vm().isGenerateMode">
                      {{ vm().modeDisplayText }}
                    </div>
                  </div>
                </div>
                <app-ai-chat [activeTab]="vm().aiChatActiveTab" class="ai-chat-component" />
              </div>
            </div>
          </ng-template>

          <!-- Grid Panel -->
          <ng-template pTemplate="content">
            <div class="grid-panel">
              @if (vm().errorMessage) {
              <div class="error-message">
                {{ vm().errorMessage }}
                <button (click)="clearErrorMessage()" class="error-close">×</button>
              </div>
              }

              @if (vm().isEditMode) {
              <!-- AG Grid for Edit Mode -->
              <div class="grid-wrapper">
                <ag-grid-angular
                  class="ag-grid-component ag-theme-alpine"
                  [rowData]="vm().currentSetCards"
                  [columnDefs]="gridService.columnDefs"
                  [gridOptions]="gridService.gridOptions"
                  [getRowId]="getRowId"
                  (gridReady)="onGridReady($event)"
                  (cellValueChanged)="onCellValueChanged($event)"
                />
              </div>
              } @else {
              <!-- Generate Mode - Drag and Drop Cards -->
              <div class="card-list-container">
                <app-drag-drop-cards
                  [newCards]="newCards"
                  [setCards]="gridService.currentSetCards"
                  [selectedSetTitle]="selectedSetTitle"
                  (cardDropped)="handleCardDrop($event)"
                  (addAllCards)="addAllCardsToSet()"
                />
              </div>
              }
            </div>
          </ng-template>
        </p-splitter>
      </div>

      <!-- Sidebar Component -->
      <app-grid-sidebar
        [showSidebar]="vm().showSidebar"
        [flashcardSets]="vm().flashcardSets"
        [currentSetId]="vm().currentSetId"
        [showNewSetDialog]="vm().showNewSetDialog"
        [newSetName]="vm().newSetName"
        [newSetDescription]="vm().newSetDescription"
        (closeSidebar)="toggleSidebar()"
        (selectSet)="selectSet($event)"
        (editSet)="editSet($event.set, $event.event)"
        (openNewSetDialog)="setShowNewSetDialog(true)"
        (showNewSetDialogChange)="setShowNewSetDialog($event)"
        (newSetNameChange)="updateNewSetName($event)"
        (newSetDescriptionChange)="updateNewSetDescription($event)"
        (cancelNewSet)="cancelNewSet()"
        (createNewSet)="createNewSet()"
      />
    </div>
  `,
  styleUrl: './flashcard-grid.component.scss',
})
export class FlashcardGridComponent {
  // ✨ Injected services
  readonly gridService = inject(GridService)
  private readonly localStorage = inject(LocalStorageService)
  private readonly flashcardService = inject(FlashcardService)
  private readonly destroyRef = inject(DestroyRef)

  // 🚀 Private writable signals
  private readonly _showSidebar = signal(false)
  private readonly _showNewSetDialog = signal(false)
  private readonly _newSetName = signal('')
  private readonly _newSetDescription = signal('')
  private readonly _isInitialized = signal(false)

  // 📖 Public readonly signals
  readonly showSidebar = this._showSidebar.asReadonly()
  readonly showNewSetDialog = this._showNewSetDialog.asReadonly()
  readonly newSetName = this._newSetName.asReadonly()
  readonly newSetDescription = this._newSetDescription.asReadonly()

  // 🔍 Computed signals for generated cards from GridService
  readonly newCards = computed(() => this.gridService.generatedCards())

  // 🔍 Computed state - derive, don't duplicate
  readonly vm = computed(() => {
    const state = this.localStorage.getState()
    const currentSet = this.gridService.currentSet()
    const isEditMode = this.gridService.isEditMode()
    const isGenerateMode = this.gridService.isGenerateMode()
    const selectedCards = this.gridService.selectedCards()
    const errorMessage = this.gridService.errorMessage()
    const currentSetCards = this.gridService.currentSetCards()

    return {
      // Sidebar state
      showSidebar: this._showSidebar(),
      sidebarWidth: this._showSidebar() ? '320px' : '0',

      // Set information
      flashcardSets: state.flashcardSets,
      currentSetId: state.currentSetId,
      currentSetTitle: currentSet?.title || 'Select a Set',
      currentSetCards: currentSetCards,
      currentSetCardCount: currentSetCards.length,

      // Selection state
      selectedCardCount: selectedCards.length,

      // Mode state
      isEditMode,
      isGenerateMode,
      modeDisplayText: isEditMode ? '📝 Edit Mode' : '✨ Generate Mode',
      aiChatActiveTab: isGenerateMode ? 1 : 0,

      // Error state
      errorMessage,

      // Dialog state
      showNewSetDialog: this._showNewSetDialog(),
      newSetName: this._newSetName(),
      newSetDescription: this._newSetDescription(),

      // Initialization state
      isInitialized: this._isInitialized(),
    }
  })

  // Computed property for selected set title
  readonly selectedSetTitle = computed(() => this.vm().currentSetTitle)

  constructor() {
    // Initialize data loading effect
    effect(() => {
      // Only run once when component is created
      if (!this._isInitialized()) {
        this.loadInitialData()
      }
    })
  }

  private async loadInitialData(): Promise<void> {
    try {
      // Load flashcard sets from the API
      const sets = await firstValueFrom(
        this.flashcardService
          .getFlashcardSets()
          .pipe(takeUntilDestroyed(this.destroyRef)),
      )

      if (sets && Array.isArray(sets) && sets.length > 0) {
        // Update local storage with the loaded data
        await this.localStorage.loadFromApi(sets satisfies FlashcardSetWithCards[])

        // Select the first set if none is selected
        const state = this.localStorage.getState()
        if (!state.currentSetId && state.flashcardSets.length > 0) {
          this.gridService.selectSet(state.flashcardSets[0].id)
        }
      }
      // If no sets exist, that's fine - user will see empty state and can create their first set
    } catch (error) {
      console.error('Failed to load flashcard sets:', error)
      // Don't create sample data - let user see the error or empty state
    } finally {
      this._isInitialized.set(true)
    }
  }

  // 🎯 Public API - methods for UI & outside
  onGridReady(event: GridReadyEvent): void {
    this.gridService.setGridApi(event.api)

    // Force column sizing after a short delay to ensure proper flex distribution
    setTimeout(() => {
      // First auto-size columns to fit content
      event.api.sizeColumnsToFit()

      // Then force the flex sizing to work properly
      event.api.resetRowHeights()
    }, 100)

    // Also resize when window is resized
    window.addEventListener('resize', () => {
      event.api.sizeColumnsToFit()
    })
  }

  onCellValueChanged(event: CellValueChangedEvent): void {
    if (!event.data || !event.newValue || event.newValue === event.oldValue) {
      return
    }

    const updates = {
      [event.colDef.field!]: event.newValue,
    }

    this.gridService.updateCard(event.data.flashcardId, updates)
  }

  getRowId = (params: GetRowIdParams) => params.data.flashcardId

  // UI Methods
  toggleSidebar(): void {
    this._showSidebar.set(!this._showSidebar())
  }

  selectSet(setId: string): void {
    this.gridService.selectSet(setId)
    this._showSidebar.set(false) // Close sidebar on mobile after selection
  }

  editSet(_set: FlashcardSetWithCards, event: Event): void {
    event.stopPropagation()
    // TODO: Implement set editing functionality
  }

  createNewSet(): void {
    if (!this._newSetName().trim()) return

    const newSet = {
      id: crypto.randomUUID(),
      title: this._newSetName().trim(),
      description: this._newSetDescription().trim(),
      iconId: '📚',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'user',
      flashcards: [],
    }

    // Add to local storage
    this.localStorage.updateState((state) => ({
      ...state,
      flashcardSets: [...state.flashcardSets, newSet],
      currentSetId: newSet.id,
    }))

    // Close dialog and reset form
    this.cancelNewSet()
  }

  cancelNewSet(): void {
    this._showNewSetDialog.set(false)
    this._newSetName.set('')
    this._newSetDescription.set('')
  }

  updateNewSetName(newName: string): void {
    this._newSetName.set(newName)
  }

  updateNewSetDescription(newDescription: string): void {
    this._newSetDescription.set(newDescription)
  }

  setShowNewSetDialog(show: boolean): void {
    this._showNewSetDialog.set(show)
  }

  onSplitterResize(): void {
    // Flex columns will automatically adjust to new container size
    // No need to manually resize columns
  }

  // Drag and Drop Methods
  handleCardDrop(dropData: { event: CdkDragDrop<any[]>; isMovingToSet: boolean }): void {
    const { event, isMovingToSet } = dropData

    console.log('Card drop event:', {
      previousIndex: event.previousIndex,
      currentIndex: event.currentIndex,
      previousContainer: event.previousContainer.id,
      currentContainer: event.container.id,
      isMovingToSet
    })

    if (isMovingToSet && event.previousContainer.id === 'newCardsList') {
      // Moving from generated cards to set
      const card = this.newCards()[event.previousIndex]
      if (card) {
        // Add the card to the set at the specific position
        this.gridService.addGeneratedCardAtPosition(card, event.currentIndex)
      }
    } else if (!isMovingToSet && event.previousContainer.id === 'setCardsList') {
      // Moving from set back to generated cards
      const setCards = this.gridService.currentSetCards()
      const cardToMove = setCards[event.previousIndex]
      if (cardToMove) {
        // Remove from set and add back to generated cards
        this.gridService.moveCardBackToGenerated(cardToMove, event.currentIndex)
      }
    } else if (event.previousContainer === event.container) {
      // Reordering within the same list
      if (event.container.id === 'setCardsList') {
        // Reordering within the set
        this.gridService.reorderSetCards(event.previousIndex, event.currentIndex)
      } else {
        // Reordering within generated cards
        this.gridService.reorderGeneratedCards(event.previousIndex, event.currentIndex)
      }
    }
  }

  addAllCardsToSet(): void {
    const cards = this.newCards()
    if (cards.length > 0) {
      this.gridService.addGeneratedCardsToSet(cards)
    }
  }

  clearErrorMessage(): void {
    this.gridService.errorMessage.set(null)
  }
}
