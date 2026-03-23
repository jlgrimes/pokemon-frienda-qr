import { buildGridText, buildThresholdPreview, extractRegionPreview } from './debug'
import { findFinderAnchoredRegion } from './finder'
import { tryDecode } from './scanner'

export type StaticDebugResult = {
  source: string
  decodedText: string
  crop: string
  threshold96: string
  threshold144: string
  grid: string
  signature: string
  status: string
}

export async function analyzeImageSource(source: string): Promise<StaticDebugResult> {
  const image = await loadImage(source)
  const canvas = document.createElement('canvas')
  canvas.width = image.naturalWidth || image.width
  canvas.height = image.naturalHeight || image.height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('Canvas unavailable')
  ctx.drawImage(image, 0, 0)
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

  const decoded = tryDecode(imageData)
  const match = findFinderAnchoredRegion(imageData)
  const region = match?.box

  if (!region) {
    return {
      source,
      decodedText: decoded?.text ?? '',
      crop: '',
      threshold96: '',
      threshold144: '',
      grid: '',
      signature: '',
      status: decoded ? 'Standard QR decoded, but no finder region matched' : 'No finder-like region detected',
    }
  }

  const detected = buildGridText(imageData, region, 12)
  const signature = detected.replace(/\s+/g, '')

  return {
    source,
    decodedText: decoded?.text ?? '',
    crop: extractRegionPreview(imageData, region),
    threshold96: buildThresholdPreview(imageData, region, 96),
    threshold144: buildThresholdPreview(imageData, region, 144),
    grid: detected,
    signature,
    status: decoded
      ? `Standard QR decoded and finder crop extracted (score ${match.score.toFixed(2)})`
      : `Finder-template crop extracted from static image (score ${match.score.toFixed(2)})`,
  }
}

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = reject
    image.src = source
  })
}
