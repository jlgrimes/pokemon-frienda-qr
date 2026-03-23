import { z } from 'zod'
import type { PickEntry, ScanDraft } from './types'

const draftSchema = z.object({
  nickname: z.string(),
  pokemonName: z.string(),
  series: z.string(),
  grade: z.string(),
  notes: z.string(),
  imageDataUrl: z.string().min(1),
})

export function createEmptyDraft(imageDataUrl: string, signature = ''): ScanDraft {
  return {
    nickname: '',
    pokemonName: '',
    series: 'Frienda 1',
    grade: '',
    notes: '',
    imageDataUrl,
    signature,
  }
}

export async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function guessPokemonName(fileName: string): string {
  const stem = fileName.replace(/\.[^.]+$/, '')
  return stem
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

export function buildEntry(draft: ScanDraft): PickEntry {
  const parsed = draftSchema.parse(draft)
  return {
    ...parsed,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  }
}

export function summarizeCollection(entries: PickEntry[]) {
  const uniquePokemon = new Set(entries.map((entry) => entry.pokemonName.trim()).filter(Boolean))
  const grades = entries.reduce<Record<string, number>>((acc, entry) => {
    const key = entry.grade.trim() || 'Unknown'
    acc[key] = (acc[key] ?? 0) + 1
    return acc
  }, {})

  return {
    total: entries.length,
    uniquePokemon: uniquePokemon.size,
    grades,
  }
}
