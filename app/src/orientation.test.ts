import { describe, expect, it } from 'vitest'
import {
  getClockwiseRotationsToBottomRight,
  hasBottomRightFinder,
  rotateClockwise,
  rotateClockwiseTimes,
  type BitMatrix,
} from './orientation'

const shaymin: BitMatrix = [
  '110100011001',
  '001011110110',
  '110101110011',
  '111100110000',
  '010110001011',
  '001010000000',
  '000000111111',
  '110000100000',
  '110110101110',
  '100100101110',
  '101010101110',
  '011100100000',
]

describe('orientation helpers', () => {
  it('detects the Shaymin matrix as already bottom-right oriented', () => {
    expect(hasBottomRightFinder(shaymin)).toBe(true)
    expect(getClockwiseRotationsToBottomRight(shaymin)).toBe(0)
  })

  it('returns 1 when one clockwise rotation is needed', () => {
    const rotatedAway = rotateClockwiseTimes(shaymin, 3)
    expect(getClockwiseRotationsToBottomRight(rotatedAway)).toBe(1)
  })

  it('returns 2 when two clockwise rotations are needed', () => {
    const rotatedAway = rotateClockwiseTimes(shaymin, 2)
    expect(getClockwiseRotationsToBottomRight(rotatedAway)).toBe(2)
  })

  it('returns 3 when three clockwise rotations are needed', () => {
    const rotatedAway = rotateClockwise(shaymin)
    expect(getClockwiseRotationsToBottomRight(rotatedAway)).toBe(3)
  })

  it('throws when no valid finder exists', () => {
    const broken = shaymin.map((row, index) => (index === 6 ? row.slice(0, 6) + '000000' : row))
    expect(() => getClockwiseRotationsToBottomRight(broken)).toThrow(/Finder pattern/)
  })
})
