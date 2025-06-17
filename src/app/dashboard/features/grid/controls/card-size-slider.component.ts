import { Component, input, output, model } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'

@Component({
  selector: 'app-card-size-slider',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="size-control flex items-center gap-3">
      <label class="text-sm font-medium text-gray-700 dark:text-gray-300">
        Card Size:
      </label>
      <div class="flex items-center gap-2">
        <svg
          class="w-4 h-4 text-gray-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M20 12H4"
          />
        </svg>
        <input
          type="range"
          [min]="minSize()"
          [max]="maxSize()"
          [step]="step()"
          [(ngModel)]="size"
          (ngModelChange)="onSizeChange($event)"
          class="size-slider"
        />
        <svg
          class="w-4 h-4 text-gray-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 6v6m0 0v6m0-6h6m-6 0H6"
          />
        </svg>
      </div>
      <span class="text-xs text-gray-500 dark:text-gray-400 min-w-[4rem]">
        {{ size() === minSize() ? 'Table' : size() + 'px' }}
      </span>
    </div>
  `,
  styles: [
    `
      .size-control {
        @apply flex items-center gap-3;
      }

      .size-slider {
        @apply w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer;
      }

      .size-slider::-webkit-slider-thumb {
        @apply appearance-none w-4 h-4 bg-blue-600 rounded-full cursor-pointer;
      }

      .size-slider::-moz-range-thumb {
        @apply w-4 h-4 bg-blue-600 rounded-full cursor-pointer border-0;
      }
    `,
  ],
})
export class CardSizeSliderComponent {
  // Input signals for configuration
  readonly minSize = input<number>(40) // 40px = table mode
  readonly maxSize = input<number>(300)
  readonly step = input<number>(20)

  // Two-way binding for the size value
  readonly size = model<number>(120)

  // Output event for size changes
  readonly sizeChanged = output<number>()

  onSizeChange(newSize: number) {
    this.sizeChanged.emit(newSize)
  }
}
