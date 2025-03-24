import { Injectable, inject, signal } from '@angular/core'
import { FlashcardSetWithCards } from '../api'
import { FlashcardCDKService } from '../ai-chat/services/flashcard-cdk-service.service'
import { Subject } from 'rxjs'
import { LocalStorageService } from './state/local-storage.service'

@Injectable({
  providedIn: 'root',
})
export class SetSelectionService {
  private readonly flashcardService = inject(FlashcardCDKService)
  private readonly localStorageService = inject(LocalStorageService)
  private selectedSet = signal<FlashcardSetWithCards | null>(null)
  private isManagingSet = signal(false)

  // Subject to notify subscribers when the selected set changes
  private selectedSetChange = new Subject<FlashcardSetWithCards | null>()

  // Observable that components can subscribe to
  readonly selectedSetChanged$ = this.selectedSetChange.asObservable()

  getSelectedSet(): FlashcardSetWithCards | null {
    return this.selectedSet()
  }

  setSelectedSet(set: FlashcardSetWithCards | null): void {
    // Only notify subscribers if there's a real change in the selection or the set's data
    const currentSet = this.selectedSet()
    const hasChanged =
      !currentSet ||
      currentSet.id !== set?.id ||
      (set && JSON.stringify(currentSet) !== JSON.stringify(set))

    // Set the selected set in the signal
    this.selectedSet.set(set)

    // Update localStorage with the current set ID
    if (set) {
      this.localStorageService.updateState((state) => ({
        ...state,
        currentSetId: set.id,
      }))
    }

    // Notify subscribers about the change if we detected a meaningful change
    if (hasChanged) {
      console.log('DEBUG: Set selection changed, notifying subscribers', set)
      this.selectedSetChange.next(set)
    }
  }

  getIsManagingSet(): boolean {
    return this.isManagingSet()
  }

  setIsManagingSet(managing: boolean): void {
    this.isManagingSet.set(managing)
  }
}
