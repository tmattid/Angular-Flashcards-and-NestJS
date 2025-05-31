import { Component, EventEmitter, Input, Output } from '@angular/core'
import { CommonModule } from '@angular/common'
import { ReactiveFormsModule, FormGroup } from '@angular/forms'

@Component({
  selector: 'app-profile-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-4">
      <div>
        <label for="username" class="block text-sm font-medium ">
          Username
        </label>
        <input
          id="username"
          type="text"
          formControlName="username"
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        />
      </div>

      <div>
        <label for="website" class="block text-sm font-medium ">
          Website
        </label>
        <input
          id="website"
          type="url"
          formControlName="website"
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        />
      </div>

      <button
        type="submit"
        [disabled]="loading"
        class="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
      >
        {{ loading ? 'Updating...' : 'Update Profile' }}
      </button>
    </form>
  `,
})
export class ProfileFormComponent {
  @Input() form!: FormGroup
  @Input() loading: boolean = false
  @Output() submitForm = new EventEmitter<void>()

  onSubmit(): void {
    if (this.form.valid) {
      this.submitForm.emit()
    }
  }
}
