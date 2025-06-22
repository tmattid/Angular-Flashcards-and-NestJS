import { Injectable } from '@angular/core'
import Dexie, { Table } from 'dexie'
import { FlashcardSetWithCards, Flashcard } from '../../api'

export interface AppState {
  id?: number
  key: string
  value: any
}

export interface DirtyItem {
  id?: number
  itemId: string
  type: 'set' | 'card'
  timestamp: number
}

export interface DirtyCard {
  id?: number
  setId: string
  cardId: string
  timestamp: number
}

@Injectable({
  providedIn: 'root',
})
export class DatabaseService extends Dexie {
  appState!: Table<AppState>
  flashcardSets!: Table<FlashcardSetWithCards>
  flashcards!: Table<Flashcard>
  dirtyItems!: Table<DirtyItem>
  dirtyCards!: Table<DirtyCard>

  constructor() {
    super('FlashcardAppDB')
    
    this.version(1).stores({
      appState: '++id, key',
      flashcardSets: 'id, name, createdAt, updatedAt',
      flashcards: 'id, setId, question, answer, position',
      dirtyItems: '++id, itemId, type, timestamp',
      dirtyCards: '++id, [setId+cardId], setId, cardId, timestamp',
    })
  }

  async getAppState(key: string): Promise<any> {
    const state = await this.appState.where('key').equals(key).first()
    return state?.value || null
  }

  async setAppState(key: string, value: any): Promise<void> {
    const existing = await this.appState.where('key').equals(key).first()
    if (existing) {
      await this.appState.update(existing.id!, { value })
    } else {
      await this.appState.add({ key, value })
    }
  }

  async removeAppState(key: string): Promise<void> {
    await this.appState.where('key').equals(key).delete()
  }

  async clearAllData(): Promise<void> {
    await this.transaction('rw', [this.appState, this.flashcardSets, this.flashcards, this.dirtyItems, this.dirtyCards], async () => {
      await Promise.all([
        this.appState.clear(),
        this.flashcardSets.clear(),
        this.flashcards.clear(),
        this.dirtyItems.clear(),
        this.dirtyCards.clear(),
      ])
    })
  }

  async markItemDirty(itemId: string, type: 'set' | 'card'): Promise<void> {
    const existing = await this.dirtyItems.where('itemId').equals(itemId).first()
    if (!existing) {
      await this.dirtyItems.add({
        itemId,
        type,
        timestamp: Date.now(),
      })
    }
  }

  async getDirtyItems(): Promise<string[]> {
    const items = await this.dirtyItems.toArray()
    return items.map(item => item.itemId)
  }

  async clearDirtyItems(itemIds: string[]): Promise<void> {
    await this.dirtyItems.where('itemId').anyOf(itemIds).delete()
  }

  async markCardDirty(setId: string, cardId: string): Promise<void> {
    const existing = await this.dirtyCards
      .where('[setId+cardId]')
      .equals([setId, cardId])
      .first()
    
    if (!existing) {
      await this.dirtyCards.add({
        setId,
        cardId,
        timestamp: Date.now(),
      })
    }
    
    await this.markItemDirty(setId, 'set')
  }

  async getDirtyCards(): Promise<Record<string, string[]>> {
    const cards = await this.dirtyCards.toArray()
    const result: Record<string, string[]> = {}
    
    cards.forEach(card => {
      if (!result[card.setId]) {
        result[card.setId] = []
      }
      result[card.setId].push(card.cardId)
    })
    
    return result
  }

  async clearDirtyCards(setIds: string[]): Promise<void> {
    await this.dirtyCards.where('setId').anyOf(setIds).delete()
  }

  async clearAllDirtyItems(): Promise<void> {
    await this.transaction('rw', [this.dirtyItems, this.dirtyCards], async () => {
      await Promise.all([
        this.dirtyItems.clear(),
        this.dirtyCards.clear(),
      ])
    })
  }
}