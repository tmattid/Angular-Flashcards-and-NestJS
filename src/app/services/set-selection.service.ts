import { Injectable, inject, signal } from '@angular/core'
import { FlashcardSetWithCards } from '../api'
import { FlashcardCDKService } from '../ai-chat/services/flashcard-cdk-service.service'

@Injectable({
  providedIn: 'root',
})
export class SetSelectionService {
  private readonly flashcardService = inject(FlashcardCDKService)
  private selectedSet = signal<FlashcardSetWithCards | null>(null)
  private isManagingSet = signal(false)

  getSelectedSet(): FlashcardSetWithCards | null {
    return this.selectedSet()
  }

  setSelectedSet(set: FlashcardSetWithCards | null): void {
    this.selectedSet.set(set)
    
  }

  getIsManagingSet(): boolean {
    return this.isManagingSet()
  }

  setIsManagingSet(managing: boolean): void {
    this.isManagingSet.set(managing)
  }
}
