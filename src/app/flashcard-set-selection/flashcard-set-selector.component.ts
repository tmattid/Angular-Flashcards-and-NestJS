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
  effect,
} from '@angular/core'
import { CommonModule } from '@angular/common'
import {
  FormsModule,
  FormControl,
  ReactiveFormsModule,
  FormGroup,
  Validators,
} from '@angular/forms'
import { FlashcardCDKService } from '../ai-chat/services/flashcard-cdk-service.service'
import { LocalStorageService } from '../services/state/local-storage.service'
import { TuiSelectModule, TuiTextfieldControllerModule } from '@taiga-ui/legacy'
import { TuiButton, TuiDataList } from '@taiga-ui/core'
import { TuiDataListWrapper } from '@taiga-ui/kit'
import { TuiIcon } from '@taiga-ui/core'
import { TuiDialogService } from '@taiga-ui/core'
import { SetSelectionService } from '../services/set-selection.service'
import { ChangeDetectionStrategy } from '@angular/core'
import { SetEditorPopupComponent } from './set-editor-popup/set-editor-popup.component'
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog'
import { tuiItemsHandlersProvider } from '@taiga-ui/kit'
import { Router } from '@angular/router'
import { animate, style, transition, trigger } from '@angular/animations'
import { FlashcardSetWithCards } from '../api'

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
    TuiButton,
  ],
  providers: [
    DialogService,
    tuiItemsHandlersProvider({
      stringify: (item: FlashcardSetWithCards | null) =>
        item?.title ?? 'Select a Set',
    }),
  ],
  animations: [
    trigger('fadeSlide', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(-10px)' }),
        animate(
          '200ms ease-out',
          style({ opacity: 1, transform: 'translateX(0)' }),
        ),
      ]),
      transition(':leave', [
        animate(
          '200ms ease-in',
          style({ opacity: 0, transform: 'translateX(-10px)' }),
        ),
      ]),
    ]),
  ],
  template: `
    <div class="flex items-center gap-2">
      @if (!setSelectionService.getIsManagingSet()) {
      <tui-select
        [(ngModel)]="selectedSet"
        [tuiTextfieldLabelOutside]="true"
        class="w-full"
        (ngModelChange)="onSelectedSetChange($event)"
        [disabled]="setSelectionService.getIsManagingSet()"
      >
        Select a Set
        <input tuiTextfieldLegacy placeholder="Choose a set" />
        <tui-data-list-wrapper *tuiDataList [items]="availableSets()">
          <ng-template let-set>
            <div class="flex items-center gap-2">
              <tui-icon name="tuiIconBook"></tui-icon>
              {{ set.title }}
            </div>
          </ng-template>
        </tui-data-list-wrapper>
      </tui-select>
      } @if (activeTab === 0) {
      <div @fadeSlide>
        <button
          tuiButton
          type="button"
          appearance="secondary"
          size="m"
          (click)="toggleSetManager()"
        >
          <tui-icon
            [icon]="
              setSelectionService.getIsManagingSet()
                ? '@tui.check'
                : '@tui.settings'
            "
            class="mr-2"
          ></tui-icon>
          {{
            setSelectionService.getIsManagingSet()
              ? 'Finish Editing'
              : 'Edit Sets'
          }}
        </button>
      </div>
      }
    </div>
  `,
  styles: [
    `
      .unified-inner {
        @apply w-full flex flex-col gap-3;
      }

      button[tuiOption] {
        @apply px-3 py-2 text-sm hover:bg-gray-50 transition-colors duration-200;
      }

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
  private readonly dialogs = inject(TuiDialogService)
  private readonly flashcardCDKService = inject(FlashcardCDKService)
  readonly setSelectionService = inject(SetSelectionService)
  readonly localStorageService = inject(LocalStorageService)
  private dialogRef: DynamicDialogRef | undefined
  private readonly destroyRef = inject(DestroyRef)
  private readonly router = inject(Router)

  selectedSet = signal<FlashcardSetWithCards | null>(null)
  titleValue = signal('')
  selectedIcon = signal('')
  showNewSetInput = false
  private readonly defaultIcon = 'tuiIconPlus'

  availableSets = computed(() => {
    return this.localStorageService.getState().flashcardSets
  })

  ngOnInit() {
    // Set initial selection if we have sets
    const sets = this.availableSets()
    if (sets.length > 0 && !this.selectedSet()) {
      const firstSet = sets[0]
      this.selectedSet.set(firstSet)
      this.setSelectionService.setSelectedSet(firstSet)
    }

    // Listen for state changes using effect() to keep the selected set in sync
    effect(() => {
      const state = this.localStorageService.getState()
      const currentSelectedSet = this.selectedSet()

      if (currentSelectedSet) {
        // Find the updated version of the currently selected set
        const updatedSet = state.flashcardSets.find(
          (set) => set.id === currentSelectedSet.id,
        )
        if (updatedSet && updatedSet !== currentSelectedSet) {
          // Update the selected set with the latest data
          this.selectedSet.set(updatedSet)

          // Also update the selection service
          this.setSelectionService.setSelectedSet(updatedSet)
        }
      }
    })
  }

  showDialog(set?: FlashcardSetWithCards | null): void {
    this.dialogRef = this.dialogService.open(SetEditorPopupComponent, {
      header: set ? 'Edit Set' : 'Create New Set',
      width: '50%',
      data: set,
    })

    this.dialogRef.onClose.subscribe(
      (result: FlashcardSetWithCards | undefined) => {
        if (result) {
          this.selectedSet.set(result)
          this.setSelectionService.setSelectedSet(result)
        }
      },
    )
  }

  onSelectedSetChange(set: FlashcardSetWithCards | null) {
    if (set === null) {
      this.showNewSetInput = true
      setTimeout(() => this.newSetInput?.nativeElement?.focus())
      return
    }

    this.showNewSetInput = false
    this.setSelectionService.setSelectedSet(set)
  }

  createNewSet(title: string) {
    if (!title.trim()) return
    this.flashcardCDKService.createNewSet(title, this.defaultIcon)
    this.showNewSetInput = false
  }

  onIconChanged(icon: string): void {
    this.selectedIcon.set(icon)
  }

  setToString = (set: FlashcardSetWithCards | null): string => {
    return set?.title ?? 'Select a Set'
  }

  toggleSetManager(): void {
    const currentMode = this.setSelectionService.getIsManagingSet()
    this.setSelectionService.setIsManagingSet(!currentMode)
  }
}
