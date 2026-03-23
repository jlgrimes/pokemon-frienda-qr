export type PickEntry = {
  id: string
  nickname: string
  pokemonName: string
  series: string
  grade: string
  notes: string
  imageDataUrl: string
  createdAt: string
}

export type ScanDraft = Omit<PickEntry, 'id' | 'createdAt'>
