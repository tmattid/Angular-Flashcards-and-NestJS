import { Component } from '@angular/core'
import { ICellRendererAngularComp } from 'ag-grid-angular'
import { ICellRendererParams } from 'ag-grid-community'
import { TuiIcon } from '@taiga-ui/core'

interface IconParams extends ICellRendererParams {
  icon?: string
  buttonClass?: string
}

@Component({
  standalone: true,
  imports: [TuiIcon],
  template: `
    <tui-icon
      [icon]="iconToShow"
      [class]="params.buttonClass || 'text-xl'"
    ></tui-icon>
  `,
})
export class IconCellRendererComponent implements ICellRendererAngularComp {
  params!: IconParams
  iconToShow!: string

  agInit(params: IconParams): void {
    this.params = params
    this.iconToShow = params.icon || params.value
  }

  refresh(): boolean {
    return false
  }
}
