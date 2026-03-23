import type { RegionBox } from './scanner'

export function extractRegionPreview(image: ImageData, box: RegionBox, scale = 2) {
  const canvas = document.createElement('canvas')
  canvas.width = box.size * scale
  canvas.height = box.size * scale
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''

  const temp = document.createElement('canvas')
  temp.width = image.width
  temp.height = image.height
  const tempCtx = temp.getContext('2d')
  if (!tempCtx) return ''
  tempCtx.putImageData(image, 0, 0)

  ctx.imageSmoothingEnabled = false
  ctx.drawImage(temp, box.left, box.top, box.size, box.size, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/png')
}

export function buildThresholdPreview(image: ImageData, box: RegionBox, threshold: number) {
  const grid = sampleGrid(image, box, box.size)
  const size = grid.length
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''

  const output = ctx.createImageData(size, size)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dark = grid[y][x] < threshold
      const px = (y * size + x) * 4
      const value = dark ? 0 : 255
      output.data[px] = value
      output.data[px + 1] = value
      output.data[px + 2] = value
      output.data[px + 3] = 255
    }
  }
  ctx.putImageData(output, 0, 0)
  return canvas.toDataURL('image/png')
}

export function buildGridText(image: ImageData, box: RegionBox, gridSize = 16) {
  const grid = sampleGrid(image, box, gridSize)
  return grid.map((row) => row.map((value) => (value < 128 ? '1' : '0')).join('')).join('\n')
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
