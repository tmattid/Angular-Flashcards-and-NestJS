import { Component, inject } from '@angular/core'
import { ICellRendererAngularComp } from 'ag-grid-angular'
import { ICellRendererParams } from 'ag-grid-community'
import { GridRow } from '../grid.types'
import { GridService } from '../services/grid.service'

@Component({
  standalone: true,
  template: `
    <div class="card-container">
      <div class="card-content">
        @if (gridStateService.gridMode() === 'edit') {
          <textarea
            class="card-textarea"
            [class.text-center]="isFrontColumn"
            [class.text-left]="!isFrontColumn"
            [value]="value"
            (input)="onTextChange($event)"
            (blur)="onTextCommit()"
            placeholder="Click to edit..."
          ></textarea>
        } @else {
          <div
            class="card-text"
            [class.text-center]="isFrontColumn"
            [class.text-left]="!isFrontColumn"
          >
            {{ value }}
          </div>
        }
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
        min-height: 60px;
        box-sizing: border-box;
      }

      .card-container {
        width: 100%;
        padding: 8px;
        box-sizing: border-box;
        display: flex;
        align-items: stretch;
      }

      .card-content {
        width: 100%;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: stretch;
        border-radius: 12px;
        border: 1px solid rgb(229 231 235);
        background-color: white;
        box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
        transition: all 0.3s ease;
        overflow: hidden;
        position: relative;
        box-sizing: border-box;
      }

      :host-context(.dark) .card-content {
        border-color: rgb(31 41 55);
        background-color: rgb(17 24 39);
      }

      .card-text {
        padding: 12px;
        width: 100%;
        height: 100%;
        overflow-y: auto;
        overflow-x: hidden;
        word-wrap: break-word;
        word-break: break-word;
        hyphens: auto;
        line-height: 1.4;
        white-space: normal;
        display: flex;
        align-items: center;
        box-sizing: border-box;

        /* Responsive font sizing based on card height */
        font-size: clamp(
          0.75rem,
          calc(var(--card-height, 120px) * 0.08),
          1.5rem
        );

        /* Custom scrollbar */
        scrollbar-width: thin;
        scrollbar-color: rgb(156 163 175) transparent;
      }

      .card-text.text-center {
        text-align: center;
        justify-content: center;
      }

      .card-text.text-left {
        text-align: left;
        justify-content: flex-start;
      }

      .card-text::-webkit-scrollbar {
        width: 4px;
      }

      .card-text::-webkit-scrollbar-track {
        background: transparent;
      }

      .card-text::-webkit-scrollbar-thumb {
        background: rgb(156 163 175);
        border-radius: 2px;
      }

      .card-text::-webkit-scrollbar-thumb:hover {
        background: rgb(107 114 128);
      }

      /* Dark mode scrollbar */
      :host-context(.dark) .card-text {
        scrollbar-color: rgb(75 85 99) transparent;
      }

      :host-context(.dark) .card-text::-webkit-scrollbar-thumb {
        background: rgb(75 85 99);
      }

      :host-context(.dark) .card-text::-webkit-scrollbar-thumb:hover {
        background: rgb(107 114 128);
      }

      /* Textarea styles */
      .card-textarea {
        padding: 12px;
        width: 100%;
        height: 100%;
        border: none;
        outline: none;
        background: transparent;
        resize: none;
        overflow-y: auto;
        overflow-x: hidden;
        word-wrap: break-word;
        word-break: break-word;
        hyphens: auto;
        line-height: 1.4;
        white-space: normal;
        box-sizing: border-box;
        font-family: inherit;
        color: inherit;

        /* Responsive font sizing based on card height */
        font-size: clamp(
          0.75rem,
          calc(var(--card-height, 120px) * 0.08),
          1.5rem
        );

        /* Custom scrollbar */
        scrollbar-width: thin;
        scrollbar-color: rgb(156 163 175) transparent;
      }

      .card-textarea.text-center {
        text-align: center;
      }

      .card-textarea.text-left {
        text-align: left;
      }

      .card-textarea::-webkit-scrollbar {
        width: 4px;
      }

      .card-textarea::-webkit-scrollbar-track {
        background: transparent;
      }

      .card-textarea::-webkit-scrollbar-thumb {
        background: rgb(156 163 175);
        border-radius: 2px;
      }

      .card-textarea::-webkit-scrollbar-thumb:hover {
        background: rgb(107 114 128);
      }

      /* Dark mode scrollbar */
      :host-context(.dark) .card-textarea {
        scrollbar-color: rgb(75 85 99) transparent;
      }

      :host-context(.dark) .card-textarea::-webkit-scrollbar-thumb {
        background: rgb(75 85 99);
      }

      :host-context(.dark) .card-textarea::-webkit-scrollbar-thumb:hover {
        background: rgb(107 114 128);
      }

      .card-textarea::placeholder {
        color: rgb(156 163 175);
        opacity: 0.7;
      }

      :host-context(.dark) .card-textarea::placeholder {
        color: rgb(107 114 128);
      }

      /* Hover effects */
      .card-content:hover {
        box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1),
          0 2px 4px -2px rgb(0 0 0 / 0.1);
        transform: translateY(-1px);
      }
    `,
  ],
})
export class CardCellRendererComponent implements ICellRendererAngularComp {
  readonly gridStateService = inject(GridService)

  value = ''
  params!: ICellRendererParams<GridRow>
  isFrontColumn = false
  private currentValue = ''

  agInit(params: ICellRendererParams<GridRow>): void {
    this.params = params
    this.value = params.value
    this.currentValue = params.value
    this.isFrontColumn = params.column?.getColId() === 'front'
  }

  refresh(params: ICellRendererParams<GridRow>): boolean {
    this.params = params
    this.value = params.value
    this.currentValue = params.value
    return true
  }

  onTextChange(event: Event): void {
    const target = event.target as HTMLTextAreaElement
    this.currentValue = target.value
  }

  onTextCommit(): void {
    if (this.currentValue !== this.value) {
      this.value = this.currentValue
      if (this.params.setValue) {
        this.params.setValue(this.currentValue)
      }
    }
  }
}
