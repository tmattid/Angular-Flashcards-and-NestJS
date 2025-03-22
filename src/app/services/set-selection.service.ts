import { Injectable, signal } from '@angular/core'
import { FlashcardSetWithCards } from '../models/flashcards.models'

@Injectable({
  providedIn: 'root',
})
export class SetSelectionService {
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
