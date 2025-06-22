# Simplified Grid Architecture

GOAL: application is flashcards system where the user uses ai to create, edit and even delete flashcards via the llms from openrouter using structured outputs.

## Design Philosophy

Keep the flashcards application simple and easy to reason about by following the **Single Responsibility Principle** and **Clear Service Boundaries**.

## Problem Statement

Complex applications often suffer from:

- Too many interconnected services
- Unclear data flow and state management
- Difficult debugging and maintenance
- High cognitive load for developers

## Architecture Solution

Use exactly **3 core services** with crystal-clear responsibilities:

### 1. LocalStorageService

**Single Purpose**: IndexedDB-based offline storage with efficient sync

- IndexedDB storage for flashcard sets and cards
- Dirty tracking for changed/new/deleted cards
- Periodic background sync of only dirty records
- User preferences and app settings
- Sync status and conflict resolution
- State change notifications via signals

### 2. FlashcardsService (Generated API Client)

**Single Purpose**: All HTTP communication

- Flashcard and set CRUD operations
- AI generation and update requests
- User authentication flows
- Server synchronization

### 3. GridService

**Single Purpose**: Grid operations and UI state

- AG Grid configuration and API management
- Card operations (add, edit, delete, reorder)
- Selection state and bulk operations
- Mode switching (edit vs generate)
- Grid-specific UI interactions

## Component Design Principles

### FlashcardGridComponent Structure

1. **Minimal Dependencies**: Only inject necessary services (GridService, LocalStorageService)
2. **No Component State**: All state managed by services, accessed via computed signals
3. **Pure Event Handling**: Component only handles user events and delegates to services
4. **Template-Driven**: Reactive templates using signals, minimal imperative code

### Architecture Benefits

1. **Predictable Data Flow**: LocalStorage → GridService → Component
2. **Easy Testing**: Mock individual services, test behavior in isolation
3. **Maintainable**: Changes to one feature affect only one service
4. **Debuggable**: Clear service boundaries make issue tracking straightforward
5. **Readable**: New developers can understand the system quickly

## Implementation Guidelines

### Service Interaction Rules

1. **LocalStorageService** provides IndexedDB data, tracks dirty state, handles periodic sync
2. **GridService** handles all grid operations, marks cards as dirty on changes
3. **FlashcardsService** handles HTTP only, called by LocalStorageService for sync
4. **Components** react to service signals, delegate actions to services

### Dirty Tracking & Sync Strategy

- **Immediate Local Updates**: All changes saved to IndexedDB instantly
- **Dirty Flagging**: Cards marked with `isDirty: true, lastModified: timestamp`
- **Periodic Sync**: Background process syncs dirty cards every 30 seconds
- **Efficient Network**: Only changed records sent to server
- **Conflict Resolution**: Server timestamp wins, local changes preserved as drafts

### Signal Usage Patterns

- Use `signal()` for mutable service state
- Use `computed()` for derived state (selections, filtering, etc.)
- Use `effect()` for side effects (API calls, local storage updates)
- Components access service state via computed signals only

## Code Examples

### Simplified Component Structure

```typescript
@Component({...})
export class FlashcardGridComponent {
  // 1. Minimal service dependencies
  private readonly gridService = inject(GridService);
  private readonly localStorage = inject(LocalStorageService);

  // 2. Computed signals for template
  protected readonly currentSet = computed(() => this.localStorage.currentSet());
  protected readonly selectedCards = computed(() => this.gridService.selectedRows());
  protected readonly canEdit = computed(() => this.selectedCards().length > 0);
  protected readonly syncStatus = computed(() => this.localStorage.syncStatus());

  // 3. Simple event handlers
  onCardSelect(event: SelectionChangedEvent) {
    this.gridService.updateSelection(event.api.getSelectedRows());
  }

  onDeleteSelected() {
    // GridService marks as deleted, LocalStorageService handles sync
    this.gridService.deleteCards(this.selectedCards());
  }

  onCardEdit(card: Flashcard, field: string, newValue: string) {
    // Immediate local update + dirty flagging
    this.gridService.updateCard(card.id, { [field]: newValue });
  }
}
```

### Service Responsibility Examples

```typescript
// LocalStorageService - IndexedDB + sync management
class LocalStorageService {
  private dirtyCards = signal<Set<string>>(new Set())
  syncStatus = signal<'synced' | 'syncing' | 'offline'>('synced')

  async updateCard(id: string, changes: Partial<Flashcard>) {
    // 1. Update IndexedDB immediately
    await this.idbService.updateCard(id, {
      ...changes,
      isDirty: true,
      lastModified: Date.now(),
    })

    // 2. Mark as dirty for next sync
    this.dirtyCards.update((dirty) => dirty.add(id))
  }

  private async syncDirtyCards() {
    const dirty = Array.from(this.dirtyCards())
    if (dirty.length === 0) return

    this.syncStatus.set('syncing')
    const dirtyCardData = await this.idbService.getCards(dirty)

    try {
      await this.flashcardsService.bulkUpdate(dirtyCardData)
      this.dirtyCards.set(new Set()) // Clear dirty flags
      this.syncStatus.set('synced')
    } catch (error) {
      this.syncStatus.set('offline')
    }
  }
}

// GridService - delegates to LocalStorageService for persistence
class GridService {
  selectedRows = signal<Flashcard[]>([])

  updateSelection(cards: Flashcard[]) {
    this.selectedRows.set(cards)
  }

  async updateCard(id: string, changes: Partial<Flashcard>) {
    // Delegate to LocalStorageService for persistence + dirty tracking
    await this.localStorage.updateCard(id, changes)
  }

  async deleteCards(cards: Flashcard[]) {
    for (const card of cards) {
      await this.localStorage.markDeleted(card.id)
    }
  }
}
```

## Complete File Structure & Purpose

```
Frontend/src/app/
├── shared/services/
│   ├── local-storage.service.ts    → IndexedDB operations, dirty tracking, periodic sync
│   └── idb.service.ts             → Low-level IndexedDB wrapper (transactions, queries)
│
├── dashboard/
│   ├── dashboard.component.ts      → Main layout with grid + AI chat panels
│   └── grid/
│       ├── flashcard-grid.component.ts → AG Grid setup, event handling, templates
│       ├── flashcard-grid.component.html → Grid template with reactive bindings
│       └── services/
│           └── grid.service.ts     → Grid state, selections, card operations
│
├── ai-chat/
│   ├── ai-chat.component.ts        → Chat interface, message handling
│   └── ai-chat.service.ts          → AI provider integration, message state
│
├── auth/
│   ├── auth.component.ts           → Login/logout UI
│   └── auth.service.ts             → Google OAuth, JWT handling
│
└── api/                            → Generated from backend OpenAPI (NEVER EDIT)
    ├── models/
    │   ├── flashcard.ts            → Flashcard type definitions
    │   ├── flashcard-set.ts        → FlashcardSet type definitions
    │   └── ...                     → Other generated types
    └── services/
        ├── flashcards.service.ts   → HTTP client for flashcard operations
        ├── auth.service.ts         → HTTP client for authentication
        └── ...                     → Other generated HTTP clients
```

## Core Rules

1. **3 Services Only**: LocalStorage (IndexedDB), Grid (operations), API (HTTP)
2. **IndexedDB First**: All changes go to IndexedDB, sync dirty records periodically
3. **Generated Types**: Always use `/api/models/` types
4. **Signals**: Use signals for state, computed for derived state
5. **Offline First**: App works offline, syncs when online
