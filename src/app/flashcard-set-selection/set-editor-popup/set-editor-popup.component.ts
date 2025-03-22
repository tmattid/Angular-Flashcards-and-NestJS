import { Component, inject, signal } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { ButtonModule } from 'primeng/button'
import { InputTextModule } from 'primeng/inputtext'
import { DynamicDialogRef, DynamicDialogConfig } from 'primeng/dynamicdialog'
import { FlashcardSetWithCards } from '../../models/flashcards.models'
import { FlashcardCDKService } from '../../ai-chat/services/flashcard-cdk-service.service'
import { IconPickerComponent } from '../../icon-picker/icon-picker.component'

@Component({
  selector: 'app-set-editor-popup',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    InputTextModule,
    IconPickerComponent,
  ],
  template: `
    <div class="flex flex-col gap-4 p-4">
      <div class="flex flex-col gap-2">
        <span class="p-float-label">
          <input
            pInputText
            id="title"
            [(ngModel)]="titleValue"
            class="w-full"
          />
          <label for="title">Set Title</label>
        </span>
      </div>

      <app-icon-picker (iconChanged)="onIconChanged($event)"></app-icon-picker>

      <div class="flex gap-2 justify-end mt-4">
        <p-button
          label="Save"
          (click)="onSubmit()"
          severity="primary"
        ></p-button>
        <p-button
          label="Cancel"
          (click)="onCancel()"
          severity="secondary"
        ></p-button>
      </div>
    </div>
  `,
  styles: [
    `
      :host ::ng-deep {
        .p-inputtext {
          width: 100%;
        }

        .p-float-label {
          width: 100%;
        }
      }
    `,
  ],
})
export class SetEditorPopupComponent {
  private readonly flashcardCDKService = inject(FlashcardCDKService)

  constructor(
    public ref: DynamicDialogRef,
    public config: DynamicDialogConfig,
  ) {
    if (this.config.data) {
      this.titleValue = this.config.data.title
      this.selectedIcon = this.config.data.icon_id
    }
  }

  titleValue = ''
  selectedIcon = ''

  onIconChanged(icon: string): void {
    this.selectedIcon = icon
  }

  onSubmit(): void {
    const newSet: FlashcardSetWithCards = {
      id: crypto.randomUUID(),
      title: this.titleValue || 'New Set',
      icon_id: this.selectedIcon,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      description: '',
      flashcards: [],
      set_position: 0,
    }
    this.ref.close(newSet)
  }

  onCancel(): void {
    this.ref.close()
  }
}
