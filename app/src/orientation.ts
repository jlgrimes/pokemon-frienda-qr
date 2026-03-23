export type BitMatrix = string[]

const FINDER_PATTERN = [
  '111111',
  '100000',
  '101110',
  '101110',
  '101110',
  '100000',
]

export function getClockwiseRotationsToBottomRight(matrix: BitMatrix): 0 | 1 | 2 | 3 {
  assertMatrix(matrix)

  for (let rotations = 0 as 0 | 1 | 2 | 3; rotations < 4; rotations = ((rotations + 1) % 4) as 0 | 1 | 2 | 3) {
    const rotated = rotateClockwiseTimes(matrix, rotations)
    if (hasBottomRightFinder(rotated)) {
      return rotations
    }
  }

  throw new Error('Finder pattern not found in any orientation')
}

export function rotateClockwise(matrix: BitMatrix): BitMatrix {
  assertMatrix(matrix)
  const size = matrix.length
  const next = Array.from({ length: size }, () => Array.from({ length: size }, () => '0'))

  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      next[col][size - 1 - row] = matrix[row][col]
    }
  }

  return next.map((row) => row.join(''))
}

export function rotateClockwiseTimes(matrix: BitMatrix, times: number): BitMatrix {
  let next = matrix
  for (let i = 0; i < times % 4; i++) {
    next = rotateClockwise(next)
  }
  return next
}

export function hasBottomRightFinder(matrix: BitMatrix): boolean {
  assertMatrix(matrix)
  const size = matrix.length
  if (size < 6) return false

  for (let row = 0; row < 6; row++) {
    const expected = FINDER_PATTERN[row]
    const actual = matrix[row + size - 6].slice(size - 6)
    if (actual !== expected) return false
  }

  return true
}

function assertMatrix(matrix: BitMatrix) {
  if (!matrix.length) throw new Error('Matrix is empty')
  const width = matrix[0].length
  if (width !== matrix.length) throw new Error('Matrix must be square')
  if (!matrix.every((row) => row.length === width && /^[01]+$/.test(row))) {
    throw new Error('Matrix rows must be equal-length binary strings')
  }
}
