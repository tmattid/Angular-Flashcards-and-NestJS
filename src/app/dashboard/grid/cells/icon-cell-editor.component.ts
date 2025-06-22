import { Component } from '@angular/core'
import { ICellEditorAngularComp } from 'ag-grid-angular'
import { ICellEditorParams } from 'ag-grid-community'
import { CommonModule } from '@angular/common'
import { ButtonModule } from 'primeng/button'

@Component({
  standalone: true,
  imports: [CommonModule, ButtonModule],
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
        <i [class]="getIconClass(icon)" class="text-xl"></i>
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
    'pi pi-book',
    'pi pi-folder-open',
    'pi pi-star',
    'pi pi-heart',
    'pi pi-user',
    'pi pi-folder',
    'pi pi-cog',
    'pi pi-home',
    'pi pi-calendar',
    'pi pi-bell',
    'pi pi-user',
    'pi pi-check',
    'pi pi-pencil',
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

  getIconClass(icon: string): string {
    return icon
  }
}
