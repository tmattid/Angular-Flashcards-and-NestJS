import { FlashcardSetWithCards } from '../api/models/FlashcardSetWithCards'

export interface LocalStorageState {
  isDarkMode: boolean
  isCardView: boolean
  hasCompletedTutorial: boolean
  isFirstVisit: boolean
  flashcardSets: FlashcardSetWithCards[]
  currentSetId: string | null
}

export type StateUpdater = (current: LocalStorageState) => LocalStorageState
