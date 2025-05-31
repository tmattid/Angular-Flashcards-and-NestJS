import { Component, signal, output, input } from '@angular/core'
import { CommonModule } from '@angular/common'
import { TuiSegmented } from '@taiga-ui/kit'

type Tab = 'grid' | 'flashcard-list' | 'sets' | 'profile'

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
        {{ getTabLabel(tab) }}
      </button>
    </tui-segmented>
  `,
  styles: [``],
})
export class TabSelectorComponent {
  protected readonly tabs: Tab[] = ['grid', 'flashcard-list', 'sets', 'profile']
  protected readonly activeTabIndex = signal(0)

  readonly tabChange = output<number>()

  onTabChange(index: number): void {
    this.activeTabIndex.set(index)
    this.tabChange.emit(index)
  }

  getTabLabel(tab: Tab): string {
    switch (tab) {
      case 'grid':
        return 'Grid'
      case 'flashcard-list':
        return 'Flashcards'
      case 'sets':
        return 'Sets'
      case 'profile':
        return 'Profile'
    }
  }
}
