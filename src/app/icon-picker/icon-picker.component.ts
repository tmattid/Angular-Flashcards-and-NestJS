import { Component, Output, EventEmitter } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'

@Component({
  selector: 'app-icon-picker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="flex flex-col gap-2">
      <label for="icon-input" class="block text-sm font-medium text-gray-700">
        Set Icon (optional)
      </label>
      <div class="mt-1 relative rounded-md shadow-sm">
        <input
          type="text"
          name="icon-input"
          id="icon-input"
          class="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-3 pr-12 sm:text-sm border-gray-300 rounded-md"
          placeholder="e.g., tuiIconFileLarge"
          [(ngModel)]="selectedIcon"
          (ngModelChange)="iconChanged.emit($event)"
        />
      </div>
      <div *ngIf="selectedIcon" class="text-gray-500 text-sm">
        Preview:
        <span class="tui-icon" [class]="selectedIcon"></span>
        {{ selectedIcon }}
      </div>
    </div>
  `,
  styles: [
    `
      .tui-icon {
        display: inline-block;
        width: 1em;
        height: 1em;
        background-size: contain;
        background-repeat: no-repeat;
        background-position: center;
        mask-size: contain;
        mask-repeat: no-repeat;
        mask-position: center;
        -webkit-mask-size: contain;
        -webkit-mask-repeat: no-repeat;
        -webkit-mask-position: center;
        vertical-align: middle; /* Align icon with text */
      }
    `,
  ],
})
export class IconPickerComponent {
  selectedIcon: string = ''
  @Output() iconChanged = new EventEmitter<string>()
}
