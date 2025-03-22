import { Component, signal, output, input } from '@angular/core'
import { CommonModule } from '@angular/common'
import { TuiSegmented } from '@taiga-ui/kit'

type Tab = 'grid' | 'flashcard-list' | 'profile'

@Component({
  selector: 'app-tab-selector',
  standalone: true,
  imports: [CommonModule, TuiSegmented],
  template: `

      <tui-segmented
        class="border-2 border-gray-300 rounded-lg"
        [size]="'l'"
        [activeItemIndex]="activeTabIndex()"
        (activeItemIndexChange)="onTabChange($event)"
      >
        <button *ngFor="let tab of tabs" tuiSegmentedItem class="tab-button ">
          {{ tab | titlecase }}
        </button>
      </tui-segmented>

  `,
  styles: [
    `

     
    `,
  ],
})
export class TabSelectorComponent {
  protected readonly tabs: Tab[] = ['grid', 'flashcard-list', 'profile']
  protected readonly activeTabIndex = signal(0)

  readonly tabChange = output<number>()

  onTabChange(index: number): void {
    this.activeTabIndex.set(index)
    this.tabChange.emit(index)
  }
}
