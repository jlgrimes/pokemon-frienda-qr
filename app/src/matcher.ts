import type { PickEntry } from './types'

export function matchSignature(signature: string | undefined, entries: PickEntry[]) {
  if (!signature) return null

  const scored = entries
    .map((entry) => ({ entry, score: similarity(signature, entry.signature ?? '') }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)

  return scored[0] ?? null
}

function similarity(a: string, b: string) {
  if (!a || !b || a.length !== b.length) return 0
  let matches = 0
  for (let i = 0; i < a.length; i++) {
    if (a[i] === b[i]) matches += 1
  }
  return matches / a.length
}
