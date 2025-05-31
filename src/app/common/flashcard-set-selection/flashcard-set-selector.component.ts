import {
  Component,
  ViewChild,
  ElementRef,
  inject,
  signal,
  computed,
  DestroyRef,
  OnInit,
  Input,
} from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { TuiSelectModule, TuiTextfieldControllerModule } from '@taiga-ui/legacy'
import { TuiDataList, TuiDialogService } from '@taiga-ui/core'
import { TuiDataListWrapper } from '@taiga-ui/kit'
import { TuiIcon } from '@taiga-ui/core'
import { ChangeDetectionStrategy } from '@angular/core'
import { SetEditorPopupComponent } from './set-editor-popup/set-editor-popup.component'
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog'
import { tuiItemsHandlersProvider } from '@taiga-ui/kit'
import { FlashcardCDKService } from '../../ai-chat/services/flashcard-cdk-service.service'
import { FlashcardSetWithCards } from '../../api'
import { SetSelectionService } from '../../services/set-selection.service'
import { LocalStorageService } from '../../services/state/local-storage.service'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'

@Component({
  selector: 'app-flashcard-set-selector',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TuiSelectModule,
    ...TuiDataList,
    ...TuiDataListWrapper,
    TuiTextfieldControllerModule,
    TuiIcon,
  ],
  providers: [
    DialogService,
    tuiItemsHandlersProvider({
      stringify: (item: FlashcardSetWithCards | null) =>
        item?.title ?? 'Select a Set',
    }),
  ],
  template: `
    <div class="flex items-center gap-2">
      <tui-select
        [ngModel]="selectedSet"
        [tuiTextfieldLabelOutside]="true"
        class="w-full"
        (ngModelChange)="onSelectedSetChange($event)"
      >
        Select a Set
        <input
          tuiTextfieldLegacy
          [placeholder]="selectedSet?.title || 'Choose a set'"
        />
        <tui-data-list-wrapper *tuiDataList [items]="availableSets">
          <ng-template let-set>
            <div class="flex items-center gap-2">
              <tui-icon [icon]="set.iconId || '@tui.book'"></tui-icon>
              {{ set.title }}
            </div>
          </ng-template>
        </tui-data-list-wrapper>
      </tui-select>
    </div>
  `,
  styles: [
    `
      :host ::ng-deep {
        .p-dropdown {
          width: 100%;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FlashcardSetSelectorComponent implements OnInit {
  @Input() activeTab = 0
  @ViewChild('newSetInput') newSetInput!: ElementRef<HTMLInputElement>

  private readonly dialogService = inject(DialogService)
  private readonly flashcardCDKService = inject(FlashcardCDKService)
  readonly setSelectionService = inject(SetSelectionService)
  private readonly localStorageService = inject(LocalStorageService)
  private readonly destroyRef = inject(DestroyRef)

  private static readonly DEFAULT_ICON = '@tui.book'

  // Simple properties instead of signals
  selectedSet: FlashcardSetWithCards | null = null
  availableSets: FlashcardSetWithCards[] = []

  ngOnInit() {
    // Initialize component
    this.loadSets()

    // Initialize with current selected set
    const currentSet = this.setSelectionService.getSelectedSet()
    if (currentSet) {
      this.selectedSet = currentSet
    } else if (this.availableSets.length > 0) {
      this.selectedSet = this.availableSets[0]
      this.setSelectionService.setSelectedSet(this.availableSets[0])
    }

    // Subscribe to state changes
    this.localStorageService.stateChanged$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.loadSets()
      })
  }

  onSelectedSetChange(set: FlashcardSetWithCards | null) {
    if (!set) return

    this.selectedSet = set
    this.setSelectionService.setSelectedSet(set)

    // Update CDK service
    this.flashcardCDKService.selectSet(set.id)
    this.flashcardCDKService.forceUpdateSelectedSetCards(set.flashcards)
  }

  createNewSet(title: string) {
    if (!title.trim()) return
    this.flashcardCDKService.createNewSet(
      title,
      FlashcardSetSelectorComponent.DEFAULT_ICON,
    )
  }

  showDialog(set?: FlashcardSetWithCards | null): void {
    const dialogRef = this.dialogService.open(SetEditorPopupComponent, {
      header: set ? 'Edit Set' : 'Create New Set',
      width: '50%',
      data: set,
    })

    dialogRef.onClose
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result: FlashcardSetWithCards | undefined) => {
        if (result) {
          this.selectedSet = result
          this.setSelectionService.setSelectedSet(result)
        }
      })
  }

  private loadSets(): void {
    const state = this.localStorageService.getState()
    this.availableSets = state.flashcardSets

    // Make sure selected set is still valid
    if (this.selectedSet) {
      const stillExists = this.availableSets.some(
        (set) => set.id === this.selectedSet?.id,
      )
      if (!stillExists && this.availableSets.length > 0) {
        this.selectedSet = this.availableSets[0]
        this.setSelectionService.setSelectedSet(this.availableSets[0])
      }
    }
  }
}
