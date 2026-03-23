import { openDB } from 'idb'
import type { PickEntry } from './types'

const DB_NAME = 'frienda-home'
const STORE = 'picks'

export const dbPromise = openDB(DB_NAME, 1, {
  upgrade(db) {
    if (!db.objectStoreNames.contains(STORE)) {
      db.createObjectStore(STORE, { keyPath: 'id' })
    }
  },
})

export async function listPicks(): Promise<PickEntry[]> {
  const db = await dbPromise
  const picks = await db.getAll(STORE)
  return picks.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export async function savePick(entry: PickEntry): Promise<void> {
  const db = await dbPromise
  await db.put(STORE, entry)
}

export async function deletePick(id: string): Promise<void> {
  const db = await dbPromise
  await db.delete(STORE, id)
}
