import type { RegionBox } from './scanner'

const FINDER_PATTERN = [
  '111111',
  '100000',
  '101110',
  '101110',
  '101110',
  '100000',
]

export type FinderMatch = {
  box: RegionBox
  score: number
  threshold: number
  sampled: string[]
}

export function findFinderAnchoredRegion(image: ImageData): FinderMatch | null {
  const scales = [96, 108, 120, 132, 144, 156, 168, 180, 192, 204, 216, 228]
  const thresholds = [80, 96, 112, 128, 144, 160, 176]
  let best: FinderMatch | null = null

  for (const size of scales) {
    const step = Math.max(6, Math.floor(size / 12 / 2))
    for (let top = 0; top <= image.height - size; top += step) {
      for (let left = 0; left <= image.width - size; left += step) {
        const box = { left, top, size }
        for (const threshold of thresholds) {
          const sampled = sampleBottomRightFinder(image, box, threshold)
          const score = comparePattern(sampled, FINDER_PATTERN)
          if (!best || score > best.score) {
            best = { box, score, threshold, sampled }
          }
        }
      }
    }
  }

  return best && best.score >= 0.8 ? best : best
}

export function sampleBottomRightFinder(image: ImageData, box: RegionBox, threshold: number): string[] {
  const fullGrid = sampleGrid(image, box, 12)
  const finderRows = fullGrid.slice(6).map((row) => row.slice(6))
  return finderRows.map((row) => row.map((value) => (value < threshold ? '1' : '0')).join(''))
}

function comparePattern(actual: string[], expected: string[]): number {
  let matches = 0
  let total = 0
  for (let row = 0; row < expected.length; row++) {
    for (let col = 0; col < expected[row].length; col++) {
      total += 1
      if (actual[row]?.[col] === expected[row][col]) matches += 1
    }
  }
  return total ? matches / total : 0
}

function sampleGrid(image: ImageData, box: RegionBox, gridSize: number) {
  const rows: number[][] = []
  for (let gy = 0; gy < gridSize; gy++) {
    const row: number[] = []
    for (let gx = 0; gx < gridSize; gx++) {
      let sum = 0
      let count = 0
      const startX = Math.floor(box.left + (gx / gridSize) * box.size)
      const endX = Math.floor(box.left + ((gx + 1) / gridSize) * box.size)
      const startY = Math.floor(box.top + (gy / gridSize) * box.size)
      const endY = Math.floor(box.top + ((gy + 1) / gridSize) * box.size)
      for (let y = startY; y < endY; y++) {
        for (let x = startX; x < endX; x++) {
          const px = (y * image.width + x) * 4
          sum += (image.data[px] + image.data[px + 1] + image.data[px + 2]) / 3
          count += 1
        }
      }
      row.push(sum / Math.max(count, 1))
    }
    rows.push(row)
  }
  return rows
}
