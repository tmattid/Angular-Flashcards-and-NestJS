import { Component, Input } from '@angular/core'
import { ICellRendererAngularComp } from 'ag-grid-angular'
import { ICellRendererParams } from 'ag-grid-community'
import { GridRow } from '../ag-grid.component'

@Component({
  standalone: true,
  template: `
    <div class="group h-full w-full p-2">
      <div
        class="h-full w-full flex flex-col justify-center rounded-xl border
               border-gray-200 dark:border-gray-800 shadow-sm bg-white dark:bg-gray-900
               transition-all duration-300 overflow-auto"
      >
        <h3
          class="flex-grow-0 px-4 pt-4 pb-2 text-base leading-relaxed whitespace-normal break-words
                 w-full [text-align:inherit] min-h-0"
          [class.text-center]="isFrontColumn"
          [class.text-left]="!isFrontColumn"
        >
          {{ value }}
        </h3>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
        height: var(--height, 300px);
      }
    `,
  ],
})
export class CardCellRendererComponent implements ICellRendererAngularComp {
  value: string = ''
  params!: ICellRendererParams<GridRow>
  isFrontColumn = false

  @Input() set height(value: string) {
    document.documentElement.style.setProperty('--height', value || '300px')
  }

  agInit(params: ICellRendererParams<GridRow>): void {
    this.params = params
    this.value = params.value
    this.isFrontColumn = params.column?.getColId() === 'front'
  }

  refresh(params: ICellRendererParams<GridRow>): boolean {
    this.params = params
    this.value = params.value
    return true
  }
}
