import { Component, inject, ChangeDetectionStrategy } from '@angular/core'
import { TuiDataList } from '@taiga-ui/core'
import { TuiDataListWrapper } from '@taiga-ui/kit'
import { TuiSelectModule } from '@taiga-ui/legacy'
import { ModelType } from '../../models/ai-http-service/ai-models.model'
import { AiService } from '../../services/ai-llms/ai.service'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { TuiTextfieldControllerModule } from '@taiga-ui/legacy'
import { TuiIcon } from '@taiga-ui/core'

@Component({
  selector: 'app-ai-model-selector',
  standalone: true,
  imports: [
    TuiSelectModule,
    TuiDataList,
    CommonModule,
    FormsModule,
    TuiTextfieldControllerModule,
    TuiIcon,
  ],
  template: `
    <tui-select
      [ngModel]="aiService.selectedModel().id"
      (ngModelChange)="onModelChange($event)"
      class="w-full"
      [tuiTextfieldLabelOutside]="true"
      [valueContent]="selectedModelContent"
      tuiTextfieldSize="l"
    >
      <ng-template tuiDataList>
        <tui-data-list>
          <button
            *ngFor="let model of aiService.models(); trackBy: trackById"
            tuiOption
            type="button"
            [value]="model.id"

          >
            <tui-icon
              [icon]="getModelIcon(model.id)"
              style="width: 24px; height: 24px; margin-right: 8px;"
            ></tui-icon>
            <span>{{ model.name }}</span>
          </button>
        </tui-data-list>
      </ng-template>
    </tui-select>

    <ng-template #selectedModelContent let-data>
      <div class="flex items-center gap-2">
        <tui-icon [icon]="getModelIcon(data)" class="!w-5 !h-5"></tui-icon>
        <span>{{ getModelName(data) }}</span>
      </div>
    </ng-template>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AiModelSelectorComponent {
  readonly aiService = inject(AiService)

  trackById(index: number, item: { id: string }): string {
    return item.id
  }

  onModelChange(modelId: ModelType): void {
    this.aiService.setModel(modelId)
  }

  getModelIcon(modelId: ModelType): string {
    // Map model IDs to Taiga UI icons
    const iconMap: Record<ModelType, string> = {
      'openai/gpt-4o-2024-11-20': 'bot',
      'google/gemini-2.0-flash-001': 'aperture',
      'google/gemini-2.0-flash-lite-preview-02-05:free': 'zap',
      // Add other models as needed
    }
    return iconMap[modelId] || 'tuiIconAiLarge'
  }

  getModelName(modelId: ModelType): string {
    return this.aiService.models().find((m) => m.id === modelId)?.name ?? ''
  }
}
