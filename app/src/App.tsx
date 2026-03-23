import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { deletePick, listPicks, savePick } from './db'
import { buildEntry, createEmptyDraft, fileToDataUrl, guessPokemonName, summarizeCollection } from './lib'
import type { PickEntry, ScanDraft } from './types'

function App() {
  const [entries, setEntries] = useState<PickEntry[]>([])
  const [draft, setDraft] = useState<ScanDraft | null>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [query, setQuery] = useState('')

  useEffect(() => {
    void refreshEntries()
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
          <h1>Store your guys.</h1>
          <p className="hero-copy">
            Upload a pick photo, label it, and keep a personal local collection. Decoder research can come later.
          </p>
        </div>
        <label className="upload-box">
          <span>Pick a photo</span>
          <input type="file" accept="image/*" onChange={handleFileChange} />
        </label>
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
                    <div><dt>Saved</dt><dd>{new Date(entry.createdAt).toLocaleString()}</dd></div>
                  </dl>
                  {entry.notes ? <p className="notes">{entry.notes}</p> : null}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p>No picks yet. Upload your first one and start building the box.</p>
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
