import { Component } from '@angular/core'
import { ICellRendererAngularComp } from 'ag-grid-angular'
import { ICellRendererParams } from 'ag-grid-community'
import { GridRow } from '../update-flashcards.component'

@Component({
  standalone: true,
  template: `
    <div class="card-container">
      <div class="card-content">
        <div
          class="card-text"
          [class.text-center]="isFrontColumn"
          [class.text-left]="!isFrontColumn"
        >
          {{ value }}
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
        height: var(--card-height, 120px);
      }

      .card-container {
        height: 100%;
        width: 100%;
        padding: 8px;
        box-sizing: border-box;
      }

      .card-content {
        height: 100%;
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
      }

      :host-context(.dark) .card-content {
        border-color: rgb(31 41 55);
        background-color: rgb(17 24 39);
      }

      .card-text {
        display: flex;
        align-items: center;
        padding: 16px;
        width: 100%;
        max-height: 100%;
        overflow-y: auto;
        overflow-x: hidden;
        word-wrap: break-word;
        word-break: break-word;
        hyphens: auto;
        line-height: 1.4;

        /* Responsive font sizing based on card height */
        font-size: clamp(
          0.75rem,
          calc(var(--card-height, 120px) * 0.08),
          1.125rem
        );

        /* Custom scrollbar */
        scrollbar-width: thin;
        scrollbar-color: rgb(156 163 175) transparent;
      }

      .card-text.text-center {
        justify-content: center;
        text-align: center;
      }

      .card-text.text-left {
        justify-content: flex-start;
        text-align: left;
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

      /* Fade effect when content overflows */
      .card-text::after {
        content: '';
        position: absolute;
        bottom: 16px;
        left: 16px;
        right: 16px;
        height: 20px;
        background: linear-gradient(transparent, white);
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.3s ease;
      }

      :host-context(.dark) .card-text::after {
        background: linear-gradient(transparent, rgb(17 24 39));
      }

      /* Show fade effect only when scrollable */
      .card-text:not(.fully-visible)::after {
        opacity: 1;
      }

      /* Hover effects */
      .card-content:hover {
        box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1),
          0 2px 4px -2px rgb(0 0 0 / 0.1);
        transform: translateY(-1px);
      }

      :host ::ng-deep .ag-cell-wrapper {
        height: 100%;
        width: 100%;
      }
    `,
  ],
})
export class CardCellRendererComponent implements ICellRendererAngularComp {
  value: string = ''
  params!: ICellRendererParams<GridRow>
  isFrontColumn = false

  agInit(params: ICellRendererParams<GridRow>): void {
    this.params = params
    this.value = params.value
    this.isFrontColumn = params.column?.getColId() === 'front'
  }

  refresh(params: ICellRendererParams<GridRow>): boolean {
    this.params = params
    this.value = params.value
    return true
  }
}
