import jsQR from 'jsqr'

export type ScanResult = {
  kind: 'decoded' | 'detected'
  text?: string
  points?: Array<{ x: number; y: number }>
  signature?: string
}

export function sampleFrame(video: HTMLVideoElement, canvas: HTMLCanvasElement) {
  const width = video.videoWidth
  const height = video.videoHeight
  if (!width || !height) return null

  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return null

  ctx.drawImage(video, 0, 0, width, height)
  const image = ctx.getImageData(0, 0, width, height)
  return { ctx, image, width, height }
}

export function tryDecode(image: ImageData): ScanResult | null {
  const qr = jsQR(image.data, image.width, image.height, {
    inversionAttempts: 'attemptBoth',
  })

  if (!qr) return null

  return {
    kind: 'decoded',
    text: qr.data,
    points: [
      qr.location.topLeftCorner,
      qr.location.topRightCorner,
      qr.location.bottomRightCorner,
      qr.location.bottomLeftCorner,
    ],
  }
}

export function detectHighContrastRegion(image: ImageData): ScanResult | null {
  const { width, height, data } = image
  const block = 8
  const blocksX = Math.floor(width / block)
  const blocksY = Math.floor(height / block)
  let bestScore = 0
  let best = { x: 0, y: 0 }

  for (let by = 0; by < blocksY; by++) {
    for (let bx = 0; bx < blocksX; bx++) {
      let min = 255
      let max = 0
      for (let y = 0; y < block; y++) {
        for (let x = 0; x < block; x++) {
          const px = ((by * block + y) * width + (bx * block + x)) * 4
          const gray = (data[px] + data[px + 1] + data[px + 2]) / 3
          min = Math.min(min, gray)
          max = Math.max(max, gray)
        }
      }
      const score = max - min
      if (score > bestScore) {
        bestScore = score
        best = { x: bx * block, y: by * block }
      }
    }
  }

  if (bestScore < 80) return null

  const size = Math.min(220, width, height)
  const left = clamp(best.x - size / 2, 0, width - size)
  const top = clamp(best.y - size / 2, 0, height - size)
  const signature = buildSignature(image, left, top, size)

  return {
    kind: 'detected',
    points: [
      { x: left, y: top },
      { x: left + size, y: top },
      { x: left + size, y: top + size },
      { x: left, y: top + size },
    ],
    signature,
  }
}

function buildSignature(image: ImageData, left: number, top: number, size: number) {
  const grid = 16
  const bits: string[] = []
  for (let gy = 0; gy < grid; gy++) {
    for (let gx = 0; gx < grid; gx++) {
      let sum = 0
      let count = 0
      const startX = Math.floor(left + (gx / grid) * size)
      const endX = Math.floor(left + ((gx + 1) / grid) * size)
      const startY = Math.floor(top + (gy / grid) * size)
      const endY = Math.floor(top + ((gy + 1) / grid) * size)
      for (let y = startY; y < endY; y++) {
        for (let x = startX; x < endX; x++) {
          const px = (y * image.width + x) * 4
          sum += (image.data[px] + image.data[px + 1] + image.data[px + 2]) / 3
          count += 1
        }
      }
      bits.push(sum / Math.max(count, 1) < 128 ? '1' : '0')
    }
  }
  return bits.join('')
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

export function drawOverlay(canvas: HTMLCanvasElement, points?: Array<{ x: number; y: number }>) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  if (!points?.length) return

  ctx.strokeStyle = '#58f29a'
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.moveTo(points[0].x, points[0].y)
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y)
  ctx.closePath()
  ctx.stroke()
}
