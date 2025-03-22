import { Component } from '@angular/core'
import { ICellEditorAngularComp } from 'ag-grid-angular'
import { ICellEditorParams } from 'ag-grid-community'
import { TuiIcon } from '@taiga-ui/core'
import { CommonModule } from '@angular/common'

@Component({
  standalone: true,
  imports: [TuiIcon, CommonModule],
  template: `
    <div
      class="grid grid-cols-4 gap-2 p-2 bg-white dark:bg-gray-800 rounded shadow-lg"
    >
      @for (icon of icons; track icon) {
      <button
        class="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
        [class.bg-blue-100]="icon === currentValue"
        (click)="onIconSelect(icon)"
      >
        <tui-icon [icon]="icon" class="text-xl"></tui-icon>
      </button>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 200px;
      }
    `,
  ],
})
export class IconCellEditorComponent implements ICellEditorAngularComp {
  icons = [
    '@tui.book',
    '@tui.star',
    '@tui.heart',
    '@tui.brain',

    '@tui.folder',
    '@tui.settings',
    '@tui.home',
    '@tui.calendar',
    '@tui.bell',
    '@tui.user',
  ]
  currentValue!: string
  private params!: ICellEditorParams

  agInit(params: ICellEditorParams): void {
    this.params = params
    this.currentValue = params.value
  }

  getValue(): string {
    return this.currentValue
  }

  onIconSelect(icon: string): void {
    this.currentValue = icon
    // Stop editing after selection to close the dropdown
    if (this.params.api) {
      this.params.api.stopEditing()
    }
  }

  isPopup(): boolean {
    return true
  }
}
