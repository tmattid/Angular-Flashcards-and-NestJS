import { Component, EventEmitter, Input, Output } from '@angular/core'
import { CommonModule } from '@angular/common'
import {
  ReactiveFormsModule,
  FormGroup,
  FormControl,
  Validators,
} from '@angular/forms'
import { FlashcardSetWithCards } from '../../api'

interface FlashcardForm {
  flashcardSetId: FormControl<string | null>
  front: FormControl<string>
  back: FormControl<string>
  difficulty: FormControl<number | null>
  tags: FormControl<string>
}

@Component({
  selector: 'app-flashcard-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <form [formGroup]="form" (ngSubmit)="onSubmit.emit(form)">
      <div class="mb-4">
        <label for="flashcardSetId" class="block  text-sm font-bold mb-2">
          Flashcard Set
        </label>
        <div
          class="border rounded p-2 w-full max-h-20 overflow-y-auto flex flex-wrap gap-2"
        >
          <button
            *ngFor="let set of flashcardSets"
            type="button"
            (click)="selectSet(set.id)"
            [class.bg-blue-200]="form.controls.flashcardSetId.value === set.id"
            class="bg-gray-200 hover:bg-gray-300  font-bold py-1 px-2 rounded-full focus:outline-none focus:shadow-outline text-sm"
          >
            {{ set.title }}
          </button>
        </div>
      </div>

      <div class="mb-4">
        <label for="front" class="block  text-sm font-bold mb-2">
          Front
        </label>
        <textarea
          id="front"
          formControlName="front"
          rows="3"
          class="shadow appearance-none border rounded w-full py-2 px-3 leading-tight focus:outline-none focus:shadow-outline"
          placeholder="Enter front text"
        ></textarea>
      </div>

      <div class="mb-4">
        <label for="back" class="block  text-sm font-bold mb-2">
          Back
        </label>
        <textarea
          id="back"
          formControlName="back"
          rows="3"
          class="shadow appearance-none border rounded w-full py-2 px-3 leading-tight focus:outline-none focus:shadow-outline"
          placeholder="Enter back text"
        ></textarea>
      </div>

      <div class="mb-4">
        <label for="difficulty" class="block  text-sm font-bold mb-2">
          Difficulty (optional)
        </label>
        <input
          type="number"
          id="difficulty"
          formControlName="difficulty"
          class="shadow appearance-none border rounded w-full py-2 px-3  leading-tight focus:outline-none focus:shadow-outline"
          placeholder="Enter difficulty level"
        />
      </div>

      <div class="mb-4">
        <label for="tags" class="block  text-sm font-bold mb-2">
          Tags (comma-separated)
        </label>
        <input
          type="text"
          id="tags"
          formControlName="tags"
          class="shadow appearance-none border rounded w-full py-2 px-3  leading-tight focus:outline-none focus:shadow-outline"
          placeholder="Enter tags"
        />
      </div>

      <div class="flex items-center justify-between">
        <button
          type="submit"
          class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          [disabled]="form.invalid"
        >
          {{ submitButtonText }}
        </button>
      </div>
    </form>
  `,
})
export class FlashcardFormComponent {
  @Input({ required: true }) form!: FormGroup<FlashcardForm>
  @Input({ required: true }) flashcardSets!: FlashcardSetWithCards[]
  @Input() isEditing = false
  @Output() onSubmit = new EventEmitter<FormGroup<FlashcardForm>>()
  @Output() onCancel = new EventEmitter<void>()

  selectSet(setId: string): void {
    this.form.controls.flashcardSetId.setValue(setId)
  }

  cancel(): void {
    this.onCancel.emit()
  }

  get submitButtonText(): string {
    return this.isEditing ? 'Update Flashcard' : 'Create Flashcard'
  }
}
