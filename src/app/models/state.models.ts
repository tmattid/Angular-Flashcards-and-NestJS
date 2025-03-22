import { FlashcardSetWithCards } from '../api/models/FlashcardSetWithCards'

export interface LocalStorageState {
  isDarkMode: boolean
  isCardView: boolean
  hasCompletedTutorial: boolean
  isFirstVisit: boolean
  flashcardSets: Array<FlashcardSetWithCards>
  currentSetId: string | null
}

export type StateUpdater = (current: LocalStorageState) => LocalStorageState
