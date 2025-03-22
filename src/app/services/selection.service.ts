import { Injectable, signal, effect } from '@angular/core'
import { GridRow } from '../ag-grid/ag-grid.component'

@Injectable({
  providedIn: 'root',
})
export class SelectionService {
  private selectedRows = signal<GridRow[]>([])

  constructor() {
    effect(() => {
      console.log('🎲 Selection Service - State Updated:', {
        count: this.selectedRows().length,
        rows: this.selectedRows(),
      })
    })
  }

  updateSelection(rows: GridRow[]) {
    console.log('🎲 Selection Service - Updating Selection:', {
      count: rows.length,
      rows: rows,
    })
    this.selectedRows.set(rows)
  }

  getSelectedRows = () => this.selectedRows.asReadonly()
}
