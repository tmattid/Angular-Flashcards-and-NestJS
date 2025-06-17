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
    <div class="flex items-center justify-center w-full h-full">
      @if (isValidIcon) {
      <tui-icon
        [icon]="iconToShow"
        [class]="params.buttonClass ?? 'text-xl'"
        class="cursor-pointer"
      ></tui-icon>
      } @else {
      <span>{{ params.value ?? '' }}</span>
      }
    </div>
  `,
})
export class IconCellRendererComponent implements ICellRendererAngularComp {
  params!: IconParams
  iconToShow!: string
  isValidIcon = false

  agInit(params: IconParams): void {
    this.params = params

    // Get the raw icon value
    const rawIcon = params.icon || params.value
    console.log('Icon renderer received:', rawIcon)

    // If we don't have an icon value, don't try to process it
    if (!rawIcon) {
      this.iconToShow = ''
      this.isValidIcon = false
      return
    }

    // If it's already in @tui format, use it directly
    if (typeof rawIcon === 'string' && rawIcon.startsWith('@tui.')) {
      this.iconToShow = rawIcon
      this.isValidIcon = true
      return
    }

    // If it's in tuiIcon format, convert it
    if (typeof rawIcon === 'string' && rawIcon.startsWith('tuiIcon')) {
      // Extract the icon name by removing the tuiIcon prefix
      const iconName = rawIcon.replace('tuiIcon', '').toLowerCase()
      this.iconToShow = `@tui.${iconName}`
      console.log('Converted tuiIcon format to:', this.iconToShow)
      this.isValidIcon = true
      return
    }

    // For the actions column with 'trash' icon
    if (typeof rawIcon === 'string' && rawIcon === 'trash') {
      this.iconToShow = '@tui.trash'
      console.log('Using trash icon:', this.iconToShow)
      this.isValidIcon = true
      return
    }

    // Default case - try to use the value directly as a tui icon name
    if (typeof rawIcon === 'string') {
      this.iconToShow = `@tui.${rawIcon.toLowerCase()}`
      console.log('Using raw icon name:', this.iconToShow)
      this.isValidIcon = true
      return
    }

    // Fallback - not a valid icon
    this.iconToShow = ''
    this.isValidIcon = false
    console.log('No valid icon format found')
  }

  refresh(): boolean {
    return false
  }
}
