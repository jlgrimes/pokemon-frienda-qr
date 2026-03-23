import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { deletePick, listPicks, savePick } from './db'
import { buildGridText, buildThresholdPreview, extractRegionPreview } from './debug'
import { buildEntry, createEmptyDraft, fileToDataUrl, guessPokemonName, summarizeCollection } from './lib'
import { matchSignature } from './matcher'
import { detectHighContrastRegion, drawOverlay, findHighContrastRegion, sampleFrame, tryDecode } from './scanner'
import type { PickEntry, ScanDraft } from './types'

function App() {
  const [entries, setEntries] = useState<PickEntry[]>([])
  const [draft, setDraft] = useState<ScanDraft | null>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [query, setQuery] = useState('')
  const [scannerStatus, setScannerStatus] = useState('Camera idle')
  const [scannerMatch, setScannerMatch] = useState<string>('')
  const [debugCrop, setDebugCrop] = useState('')
  const [debugThresholdA, setDebugThresholdA] = useState('')
  const [debugThresholdB, setDebugThresholdB] = useState('')
  const [debugGrid, setDebugGrid] = useState('')
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const captureCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const frameLoopRef = useRef<number | null>(null)

  useEffect(() => {
    void refreshEntries()
    return () => stopScanner()
  }, [])

  async function refreshEntries() {
    setEntries(await listPicks())
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    const imageDataUrl = await fileToDataUrl(file)
    const nextDraft = createEmptyDraft(imageDataUrl)
    nextDraft.pokemonName = guessPokemonName(file.name)
    setDraft(nextDraft)
    setError('')
  }

  async function handleSave() {
    if (!draft) return
    setSaving(true)
    try {
      await savePick(buildEntry(draft))
      await refreshEntries()
      setDraft(null)
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save pick')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    await deletePick(id)
    await refreshEntries()
  }

  async function startScanner() {
    try {
      stopScanner()
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      })
      streamRef.current = stream
      const video = videoRef.current
      if (!video) return
      video.srcObject = stream
      await video.play()
      setScannerStatus('Scanning… point the weird code at the camera')
      tickScanner()
    } catch (err) {
      setScannerStatus('Camera failed to start')
      setError(err instanceof Error ? err.message : 'Camera access failed')
    }
  }

  function stopScanner() {
    if (frameLoopRef.current) cancelAnimationFrame(frameLoopRef.current)
    frameLoopRef.current = null
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    const overlay = overlayCanvasRef.current
    if (overlay) drawOverlay(overlay)
  }

  function tickScanner() {
    const video = videoRef.current
    const captureCanvas = captureCanvasRef.current
    const overlayCanvas = overlayCanvasRef.current
    if (!video || !captureCanvas || !overlayCanvas) return

    const sampled = sampleFrame(video, captureCanvas)
    if (!sampled) {
      frameLoopRef.current = requestAnimationFrame(tickScanner)
      return
    }

    overlayCanvas.width = sampled.width
    overlayCanvas.height = sampled.height

    const decoded = tryDecode(sampled.image)
    const region = findHighContrastRegion(sampled.image)

    if (region) {
      setDebugCrop(extractRegionPreview(sampled.image, region))
      setDebugThresholdA(buildThresholdPreview(sampled.image, region, 96))
      setDebugThresholdB(buildThresholdPreview(sampled.image, region, 144))
      setDebugGrid(buildGridText(sampled.image, region, 16))
    }

    if (decoded) {
      drawOverlay(overlayCanvas, decoded.points)
      setScannerStatus(`Decoded text: ${decoded.text}`)
      setScannerMatch('')
    } else {
      const detected = detectHighContrastRegion(sampled.image)
      drawOverlay(overlayCanvas, detected?.points)
      if (detected?.signature) {
        const match = matchSignature(detected.signature, entries)
        setScannerStatus('Detected a likely code region')
        setScannerMatch(match ? `${match.entry.pokemonName || 'Unknown'} (${Math.round(match.score * 100)}% match)` : 'No catalog match yet')
      } else {
        setScannerStatus('Looking for the symbol…')
        setScannerMatch('')
        setDebugCrop('')
        setDebugThresholdA('')
        setDebugThresholdB('')
        setDebugGrid('')
      }
    }

    frameLoopRef.current = requestAnimationFrame(tickScanner)
  }

  async function captureFromScanner() {
    const captureCanvas = captureCanvasRef.current
    if (!captureCanvas) return
    const dataUrl = captureCanvas.toDataURL('image/jpeg', 0.92)
    const sampled = captureCanvas.getContext('2d', { willReadFrequently: true })?.getImageData(0, 0, captureCanvas.width, captureCanvas.height)
    const detected = sampled ? detectHighContrastRegion(sampled) : null
    const nextDraft = createEmptyDraft(dataUrl, detected?.signature ?? '')
    setDraft(nextDraft)
    setScannerStatus('Frame captured')
  }

  const filteredEntries = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return entries
    return entries.filter((entry) => {
      return [entry.pokemonName, entry.nickname, entry.series, entry.grade, entry.notes]
        .join(' ')
        .toLowerCase()
        .includes(normalized)
    })
  }, [entries, query])

  const summary = useMemo(() => summarizeCollection(entries), [entries])

  return (
    <main className="app-shell">
      <section className="hero card">
        <div>
          <p className="eyebrow">Frienda Home</p>
          <h1>Debug the symbol live.</h1>
          <p className="hero-copy">
            Real-time camera scanner plus a debug panel that shows the detected crop, thresholded views, and a coarse 16×16 bit grid.
          </p>
        </div>
        <label className="upload-box">
          <span>Upload a photo instead</span>
          <input type="file" accept="image/*" onChange={handleFileChange} />
        </label>
      </section>

      <section className="card scanner-section">
        <div className="scanner-header">
          <div>
            <p className="eyebrow">Live scanner</p>
            <h2>Point the camera at the back code</h2>
            <p className="scanner-status">{scannerStatus}</p>
            {scannerMatch ? <p className="scanner-match">{scannerMatch}</p> : null}
          </div>
          <div className="actions">
            <button className="secondary" onClick={stopScanner}>Stop</button>
            <button onClick={() => void startScanner()}>Start camera</button>
            <button onClick={() => void captureFromScanner()}>Capture frame</button>
          </div>
        </div>
        <div className="scanner-stage">
          <video ref={videoRef} className="scanner-video" playsInline muted />
          <canvas ref={overlayCanvasRef} className="scanner-overlay" />
          <canvas ref={captureCanvasRef} className="hidden-canvas" />
        </div>
      </section>

      <section className="debug-grid">
        <article className="card debug-card">
          <p className="eyebrow">Detected crop</p>
          {debugCrop ? <img src={debugCrop} alt="Detected symbol crop" className="debug-image" /> : <div className="empty-state">No crop yet</div>}
        </article>
        <article className="card debug-card">
          <p className="eyebrow">Threshold 96</p>
          {debugThresholdA ? <img src={debugThresholdA} alt="Threshold preview 96" className="debug-image pixelated" /> : <div className="empty-state">No threshold yet</div>}
        </article>
        <article className="card debug-card">
          <p className="eyebrow">Threshold 144</p>
          {debugThresholdB ? <img src={debugThresholdB} alt="Threshold preview 144" className="debug-image pixelated" /> : <div className="empty-state">No threshold yet</div>}
        </article>
        <article className="card debug-card debug-card-wide">
          <p className="eyebrow">16×16 coarse grid</p>
          <pre className="grid-text">{debugGrid || 'No grid yet'}</pre>
        </article>
      </section>

      <section className="stats-grid">
        <StatCard label="Total picks" value={String(summary.total)} />
        <StatCard label="Unique Pokémon" value={String(summary.uniquePokemon)} />
        <StatCard label="Known grades" value={String(Object.keys(summary.grades).length)} />
      </section>

      {draft ? (
        <section className="card editor-grid">
          <img className="preview" src={draft.imageDataUrl} alt="Pick preview" />
          <div className="form-grid">
            <TextField label="Pokémon" value={draft.pokemonName} onChange={(value) => setDraft({ ...draft, pokemonName: value })} />
            <TextField label="Nickname" value={draft.nickname} onChange={(value) => setDraft({ ...draft, nickname: value })} />
            <TextField label="Series" value={draft.series} onChange={(value) => setDraft({ ...draft, series: value })} />
            <TextField label="Grade" value={draft.grade} onChange={(value) => setDraft({ ...draft, grade: value })} />
            <label className="field field-full">
              <span>Notes</span>
              <textarea value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} rows={4} />
            </label>
            <div className="actions field-full">
              <button className="secondary" onClick={() => setDraft(null)} disabled={saving}>Cancel</button>
              <button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save to collection'}</button>
            </div>
            {error ? <p className="error field-full">{error}</p> : null}
          </div>
        </section>
      ) : null}

      <section className="card collection-section">
        <div className="collection-header">
          <div>
            <p className="eyebrow">Collection</p>
            <h2>Your local Frienda box</h2>
          </div>
          <input
            className="search"
            placeholder="Search Pokémon, grade, notes..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>

        {filteredEntries.length ? (
          <div className="collection-grid">
            {filteredEntries.map((entry) => (
              <article key={entry.id} className="pick-card">
                <img src={entry.imageDataUrl} alt={entry.pokemonName || 'Frienda pick'} />
                <div className="pick-card-body">
                  <div className="pick-card-header">
                    <div>
                      <h3>{entry.pokemonName || 'Unknown pick'}</h3>
                      <p>{entry.nickname || 'No nickname'}</p>
                    </div>
                    <button className="ghost" onClick={() => void handleDelete(entry.id)}>Delete</button>
                  </div>
                  <dl>
                    <div><dt>Series</dt><dd>{entry.series || '—'}</dd></div>
                    <div><dt>Grade</dt><dd>{entry.grade || '—'}</dd></div>
                    <div><dt>Signature</dt><dd>{entry.signature ? 'Saved' : '—'}</dd></div>
                    <div><dt>Saved</dt><dd>{new Date(entry.createdAt).toLocaleString()}</dd></div>
                  </dl>
                  {entry.notes ? <p className="notes">{entry.notes}</p> : null}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p>No picks yet. Upload or capture one and start building the box.</p>
          </div>
        )}
      </section>
    </main>
  )
}

function TextField(props: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="field">
      <span>{props.label}</span>
      <input value={props.value} onChange={(event) => props.onChange(event.target.value)} />
    </label>
  )
}

function StatCard(props: { label: string; value: string }) {
  return (
    <article className="card stat-card">
      <p>{props.label}</p>
      <strong>{props.value}</strong>
    </article>
  )
}

export default App
