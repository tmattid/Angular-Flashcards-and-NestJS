import { Component, inject, OnInit, signal } from '@angular/core'
import { CommonModule } from '@angular/common'
import {
  ReactiveFormsModule,
  FormGroup,
  FormControl,
  Validators,
} from '@angular/forms'
import { LocalStorageService } from '../services/state/local-storage.service'
import { Flashcard, FlashcardSetWithCards } from '../api'
import { FlashcardFormComponent } from './components/flashcard-form.component'
import { FlashcardTableComponent } from './components/flashcard-table.component'

@Component({
  selector: 'app-flashcard-create-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FlashcardFormComponent,
    FlashcardTableComponent,
  ],
  template: `
    <div class="max-w-7xl mx-auto p-4">
      <h1 class="text-2xl font-bold mb-4">
        {{ selectedCard() ? 'Edit' : 'Create' }} Flashcard
      </h1>

      <div class="flex">
        <div class="w-1/2 pr-4">
          <app-flashcard-form
            [form]="flashcardForm"
            [flashcardSets]="flashcardSets()"
            [isEditing]="!!selectedCard()"
            (onSubmit)="onSubmit()"
            (onCancel)="cancelEdit()"
          />
        </div>
        <div class="w-1/2 pl-4">
          <app-flashcard-table
            [flashcardSet]="selectedFlashcardSet()"
            (cardSelect)="onCardSelect($event)"
          />
        </div>
      </div>
    </div>
  `,
})
export class FlashcardCreatePage implements OnInit {
  flashcardSets = signal<FlashcardSetWithCards[]>([])
  selectedFlashcardSet = signal<FlashcardSetWithCards | undefined>(undefined)
  selectedCard = signal<Flashcard | undefined>(undefined)
  flashcardForm: FormGroup<{
    flashcardSetId: FormControl<string | null>
    front: FormControl<string>
    back: FormControl<string>
    difficulty: FormControl<number | null>
    tags: FormControl<string>
  }> = new FormGroup({
    flashcardSetId: new FormControl<string | null>(null, {
      validators: [Validators.required],
    }),
    front: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    back: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    difficulty: new FormControl<number | null>(null),
    tags: new FormControl<string>('', { nonNullable: true }),
  })

  localStorageService = inject(LocalStorageService)

  ngOnInit(): void {
    this.flashcardSets.set(this.localStorageService.getState().flashcardSets)

    if (this.flashcardSets().length > 0) {
      const defaultSet = this.flashcardSets()[0]
      this.selectedFlashcardSet.set(defaultSet)
      this.flashcardForm.controls.flashcardSetId.setValue(defaultSet.id)
    }

    this.flashcardForm.controls.flashcardSetId.valueChanges.subscribe(
      (setId) => {
        if (setId) {
          const selectedSet = this.flashcardSets().find(
            (set) => set.id === setId,
          )
          this.selectedFlashcardSet.set(selectedSet)
        } else {
          this.selectedFlashcardSet.set(undefined)
        }
      },
    )
  }

  onCardSelect(
    card: Omit<Flashcard, 'flashcard_set_id'> & { position?: number },
  ): void {
    const fullCard: Flashcard = {
      ...card,
      setId: this.selectedFlashcardSet()?.id ?? '',
      position: card.position ?? 0,
    }
    this.selectedCard.set(fullCard)
    this.flashcardForm.patchValue({
      flashcardSetId: fullCard.setId,
      front: fullCard.front,
      back: fullCard.back,
      difficulty: fullCard.difficulty?.['value'] ?? null,
      tags: fullCard.tags?.join(', ') ?? '',
    })
  }

  cancelEdit(): void {
    this.selectedCard.set(undefined)
    this.resetForm()
  }

  resetForm(): void {
    const currentSetId = this.flashcardForm.get('flashcardSetId')?.value
    this.flashcardForm.reset({ flashcardSetId: currentSetId })
  }

  onSubmit(): void {
    if (this.flashcardForm.invalid) return

    const formValue = this.flashcardForm.getRawValue()
    const selectedCard = this.selectedCard()

    if (selectedCard) {
      // Update existing card
      this.updateCard(selectedCard.id, formValue)
    } else {
      // Create new card
      this.createCard(formValue)
    }

    this.selectedCard.set(undefined)
    this.resetForm()
  }

  private createCard(formValue: any): void {
    const { front, back, difficulty, tags, flashcardSetId } = formValue
    if (!flashcardSetId) return

    const selectedSet = this.flashcardSets().find(
      (set) => set.id === flashcardSetId,
    )
    if (!selectedSet) return

    // Calculate the next position
    const nextPosition = selectedSet.flashcards.length

    const newFlashcard: Flashcard = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      setId: flashcardSetId,
      front,
      back,
      difficulty: difficulty ? { value: difficulty } : undefined,
      tags: tags
        ? tags
            .split(',')
            .map((tag: string) => tag.trim())
            .filter((tag: string) => tag.length > 0)
        : undefined,
      position: nextPosition,
    }

    // Mark the set as dirty
    this.localStorageService.markDirty(flashcardSetId)

    // Update state
    this.localStorageService.updateState((state) => ({
      ...state,
      flashcardSets: state.flashcardSets.map((set) => {
        if (set.id === flashcardSetId) {
          return {
            ...set,
            flashcards: [...set.flashcards, newFlashcard],
          }
        }
        return set
      }),
    }))

    // Keep the current set selected
    const currentSetId = this.flashcardForm.get('flashcardSetId')?.value

    // Reset form but maintain the selected set
    this.flashcardForm.reset({ flashcardSetId: currentSetId })

    // Update the selected set view with fresh data
    const updatedSet = this.localStorageService
      .getState()
      .flashcardSets.find((set) => set.id === flashcardSetId)

    if (updatedSet) {
      this.selectedFlashcardSet.set(updatedSet)
      this.flashcardSets.set(this.localStorageService.getState().flashcardSets)
    }
  }

  private updateCard(cardId: string, formValue: any): void {
    const { flashcardSetId, front, back, difficulty, tags } = formValue

    this.localStorageService.updateState((state) => ({
      ...state,
      flashcardSets: state.flashcardSets.map((set) => ({
        ...set,
        flashcards: set.flashcards.map((card) =>
          card.id === cardId
            ? {
                ...card,
                front,
                back,
                difficulty: difficulty ?? null,
                tags: tags
                  ? tags
                      .split(',')
                      .map((t: string) => t.trim())
                      .filter(Boolean)
                  : null,
                updated_at: new Date().toISOString(),
              }
            : card,
        ),
      })),
    }))

    // Mark the set as dirty
    this.localStorageService.markDirty(flashcardSetId)

    // Update the view
    const updatedSet = this.localStorageService
      .getState()
      .flashcardSets.find((set) => set.id === flashcardSetId)

    if (updatedSet) {
      this.selectedFlashcardSet.set(updatedSet)
      this.flashcardSets.set(this.localStorageService.getState().flashcardSets)
    }
  }
}
