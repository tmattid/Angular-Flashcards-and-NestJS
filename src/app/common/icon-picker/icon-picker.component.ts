import { Component, Output, EventEmitter } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { InputTextModule } from 'primeng/inputtext'

@Component({
  selector: 'app-icon-picker',
  standalone: true,
  imports: [CommonModule, FormsModule, InputTextModule],
  template: `
    <div class="flex flex-col gap-2">
      <label for="icon-input" class="block text-sm font-medium text-gray-700">
        Set Icon (optional)
      </label>
      <div class="mt-1 relative rounded-md shadow-sm">
        <input
          pInputText
          type="text"
          name="icon-input"
          id="icon-input"
          class="w-full"
          placeholder="e.g., pi pi-star"
          [(ngModel)]="selectedIcon"
          (ngModelChange)="iconChanged.emit($event)"
        />
      </div>
      <div *ngIf="selectedIcon" class="text-gray-500 text-sm flex items-center gap-2">
        <span>Preview:</span>
        <i [class]="selectedIcon"></i>
        <span>{{ selectedIcon }}</span>
      </div>
    </div>
  `,
  styles: [
    `
      i {
        font-size: 1em;
        vertical-align: middle;
      }
    `,
  ],
})
export class IconPickerComponent {
  selectedIcon = ''
  @Output() iconChanged = new EventEmitter<string>()
}
