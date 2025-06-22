import { Component } from '@angular/core'
import { ICellRendererAngularComp } from 'ag-grid-angular'
import { ICellRendererParams } from 'ag-grid-community'
import { CommonModule } from '@angular/common'

interface IconParams extends ICellRendererParams {
  icon?: string
  buttonClass?: string
}

@Component({
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex items-center justify-center w-full h-full">
      @if (isValidIcon) {
      <i
        [class]="getIconClass(iconToShow)"
        [ngClass]="params.buttonClass ?? 'text-xl'"
        class="cursor-pointer"
      ></i>
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

    // If it's already in PrimeNG format, use it directly
    if (typeof rawIcon === 'string' && rawIcon.startsWith('pi pi-')) {
      this.iconToShow = rawIcon
      this.isValidIcon = true
      return
    }

    // Convert from old Taiga UI format to PrimeNG
    if (typeof rawIcon === 'string' && rawIcon.startsWith('@tui.')) {
      this.iconToShow = this.convertTuiToPrimeIcon(rawIcon)
      this.isValidIcon = true
      return
    }

    // If it's in tuiIcon format, convert it
    if (typeof rawIcon === 'string' && rawIcon.startsWith('tuiIcon')) {
      const iconName = rawIcon.replace('tuiIcon', '').toLowerCase()
      this.iconToShow = this.convertTuiToPrimeIcon(`@tui.${iconName}`)
      console.log('Converted tuiIcon format to:', this.iconToShow)
      this.isValidIcon = true
      return
    }

    // For the actions column with 'trash' icon
    if (typeof rawIcon === 'string' && rawIcon === 'trash') {
      this.iconToShow = 'pi pi-trash'
      console.log('Using trash icon:', this.iconToShow)
      this.isValidIcon = true
      return
    }

    // Default case - try to convert to PrimeNG icon
    if (typeof rawIcon === 'string') {
      this.iconToShow = this.convertTuiToPrimeIcon(`@tui.${rawIcon.toLowerCase()}`)
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

  getIconClass(icon: string): string {
    return icon
  }

  private convertTuiToPrimeIcon(tuiIcon: string): string {
    const iconMap: Record<string, string> = {
      '@tui.book': 'pi pi-book',
      '@tui.bookopen': 'pi pi-folder-open',
      '@tui.star': 'pi pi-star',
      '@tui.heart': 'pi pi-heart',
      '@tui.brain': 'pi pi-user',
      '@tui.folder': 'pi pi-folder',
      '@tui.settings': 'pi pi-cog',
      '@tui.home': 'pi pi-home',
      '@tui.calendar': 'pi pi-calendar',
      '@tui.bell': 'pi pi-bell',
      '@tui.user': 'pi pi-user',
      '@tui.check': 'pi pi-check',
      '@tui.edit': 'pi pi-pencil',
      '@tui.trash': 'pi pi-trash'
    }
    
    return iconMap[tuiIcon] || 'pi pi-circle'
  }
}
