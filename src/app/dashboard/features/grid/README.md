# Grid Feature - Organized Structure

This folder contains the flashcard grid implementation with AG Grid, organized by functionality for better maintainability.

## 📁 Folder Structure

```
grid/
├── core/                          # Core grid functionality
│   ├── flashcard-grid.component.ts   # Main grid component (renamed from update-flashcards)
│   ├── grid-config.service.ts        # Grid configuration service (renamed from ag-grid-config)
│   └── grid.types.ts                 # TypeScript interfaces and module registration
├── cells/                         # AG Grid cell components
│   ├── card-cell-renderer.component.ts  # Displays flashcard content in card format
│   ├── icon-cell-renderer.component.ts  # Renders Taiga UI icons in cells
│   └── icon-cell-editor.component.ts    # Icon selection cell editor
├── controls/                      # UI control components
│   └── card-size-slider.component.ts    # Controls card size/table mode switching
├── sidebar/                       # Sidebar functionality
│   ├── sidebar-container.component.ts   # Sidebar layout container
│   └── set-management/
│       └── set-management-sidebar.component.ts  # Set CRUD operations
├── workspace/                     # Workspace/layout components
│   └── grid-workspace.component.ts      # Grid + chat workspace layout (renamed from grid-chat-box)
├── index.ts                       # Clean exports for easier imports
└── README.md                      # This documentation
```

## 🔧 Key Components

### Core Components

- **`FlashcardGridComponent`** - The main grid component with auto-height, multi-select checkboxes, and flashcard editing
- **`GridConfigService`** - Provides grid configuration, column definitions, themes, and display modes
- **`grid.types.ts`** - Contains `GridRow` interface and performance configuration types

### Cell Components

- **`CardCellRendererComponent`** - Custom cell renderer for displaying flashcard content with responsive card design
- **`IconCellRendererComponent`** - Renders Taiga UI icons with fallback handling
- **`IconCellEditorComponent`** - Allows users to select icons from a predefined set

### Controls

- **`CardSizeSliderComponent`** - Slider that controls card size and switches between card/table display modes

### Sidebar

- **`SidebarContainerComponent`** - Manages sidebar visibility and slide animations
- **`SetManagementSidebarComponent`** - Complete set management interface (create, edit, delete, search, select)

### Workspace

- **`GridWorkspaceComponent`** - Combines set management sidebar with AI chat in a resizable layout

## 📦 Usage

### Import Components

```typescript
// Clean imports using the index file
import { 
  FlashcardGridComponent, 
  GridConfigService, 
  CardSizeSliderComponent 
} from './features/grid'

// Or import types
import type { GridRow, GridPerformanceConfig } from './features/grid'
```

### Use Main Grid Component

```html
<app-flashcard-grid 
  (rowsSelected)="onRowsSelected($event)">
</app-flashcard-grid>
```

## 🎯 Key Features

- **Auto Row Heights**: Rows automatically adjust based on content
- **Multi-Select Checkboxes**: Proper AG Grid checkbox implementation
- **Responsive Design**: Card mode for large content, table mode for compact view
- **Theme Support**: Light and dark themes
- **Performance Optimized**: Row virtualization and caching
- **Type Safe**: Full TypeScript support with proper interfaces

## 🔄 Migration from Old Structure

The reorganization renamed and moved components:

| Old Path | New Path | Notes |
|----------|----------|-------|
| `update-flashcards/update-flashcards.component.ts` | `core/flashcard-grid.component.ts` | Main component with clearer name |
| `update-flashcards/services/ag-grid-config.service.ts` | `core/grid-config.service.ts` | Moved to core with simpler name |
| `update-flashcards/cell-renderer/*` | `cells/*` | All cell components in one folder |
| `update-flashcards/cell-editor/*` | `cells/*` | Moved to cells folder |
| `update-flashcards/card-size-slider/*` | `controls/*` | UI controls grouped together |
| `update-flashcards/set-sidebar/*` | `sidebar/*` | Sidebar components grouped |
| `grid-chat-box/grid-chat-box.component.ts` | `workspace/grid-workspace.component.ts` | Renamed for clarity |

All imports throughout the codebase have been updated to use the new paths and the cleaner `index.ts` exports.