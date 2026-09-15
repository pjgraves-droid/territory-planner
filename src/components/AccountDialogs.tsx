import { FileUp, Plus, X } from 'lucide-react'
import { useState } from 'react'
import { slug } from '../csv'
import { parseAccountsFile, type ImportResult } from '../importer'
import { useStore } from '../store'
import { UNASSIGNED } from '../types'

const REGIONS = ['AU', 'NZ', 'US', 'Other']

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-label={title}
        onMouseDown={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          <button onClick={onClose} aria-label="Close" className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

const field = 'w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm focus:border-blue-400 focus:outline-none'
const primary =
  'inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700 disabled:bg-slate-200 disabled:text-slate-400'
const secondary = 'rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50'

export function AddAccountDialog({ onClose, onDone }: { onClose: () => void; onDone: (msg: string) => void }) {
  const directors = useStore((s) => s.directors)
  const addAccounts = useStore((s) => s.addAccounts)
  const [name, setName] = useState('')
  const [region, setRegion] = useState('AU')
  const [customRegion, setCustomRegion] = useState('')
  const [directorId, setDirectorId] = useState(UNASSIGNED)
  const [error, setError] = useState<string | null>(null)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const r = region === 'Other' ? customRegion : region
    const { added } = addAccounts([{ name, region: r, directorId: directorId === UNASSIGNED ? undefined : directorId }])
    if (!added) {
      setError('An account with that name already exists.')
      return
    }
    onDone(`Added ${name.trim()}`)
    onClose()
  }

  return (
    <Modal title="Add account" onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          Account name
          <input autoFocus value={name} onChange={(e) => { setName(e.target.value); setError(null) }} placeholder="e.g. Xero" className={field} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
            Region
            <select value={region} onChange={(e) => setRegion(e.target.value)} className={field}>
              {REGIONS.map((r) => <option key={r}>{r}</option>)}
            </select>
          </label>
          {region === 'Other' ? (
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
              Region code
              <input value={customRegion} onChange={(e) => setCustomRegion(e.target.value.toUpperCase())} placeholder="e.g. SG" className={field} />
            </label>
          ) : (
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
              Account Director
              <select value={directorId} onChange={(e) => setDirectorId(e.target.value)} className={field}>
                <option value={UNASSIGNED}>Unassigned</option>
                {directors.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </label>
          )}
        </div>
        {region === 'Other' && (
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
            Account Director
            <select value={directorId} onChange={(e) => setDirectorId(e.target.value)} className={field}>
              <option value={UNASSIGNED}>Unassigned</option>
              {directors.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </label>
        )}
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="mt-1 flex justify-end gap-2">
          <button type="button" onClick={onClose} className={secondary}>Cancel</button>
          <button type="submit" disabled={!name.trim()} className={primary}><Plus size={14} /> Add account</button>
        </div>
      </form>
    </Modal>
  )
}

export function ImportAccountsDialog({ onClose, onDone }: { onClose: () => void; onDone: (msg: string) => void }) {
  const directors = useStore((s) => s.directors)
  const accounts = useStore((s) => s.accounts)
  const addAccounts = useStore((s) => s.addAccounts)
  const [file, setFile] = useState<File | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)

  const existing = new Set(accounts.map((a) => a.id))
  const newRows = result?.rows.filter((r) => !existing.has(slug(r.name))) ?? []
  const existingRows = result?.rows.filter((r) => existing.has(slug(r.name))) ?? []
  const updateRows = existingRows.filter((r) => r.details)
  const dupCount = existingRows.length - updateRows.length
  const assignedCount = newRows.filter((r) => r.directorId).length

  const load = async (f: File) => {
    setFile(f)
    setError(null)
    try {
      const res = await parseAccountsFile(f, directors)
      if (!res.rows.length) setError('No account rows found. Expected a header row with an "Account" (or "Name") column.')
      setResult(res)
    } catch {
      setError('Could not read that file.')
      setResult(null)
    }
  }

  const confirm = () => {
    const { added, updated } = addAccounts([...newRows, ...updateRows])
    onDone(
      `Imported ${added} account${added === 1 ? '' : 's'}${updated ? ` · ${updated} updated` : ''}${dupCount ? ` · ${dupCount} already existed` : ''}`,
    )
    onClose()
  }

  return (
    <Modal title="Import accounts" onClose={onClose}>
      <label
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          const f = e.dataTransfer.files[0]
          if (f) load(f)
        }}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-center transition ${
          dragOver ? 'border-blue-400 bg-blue-50' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
        }`}
      >
        <FileUp size={20} className="text-slate-400" />
        <span className="text-sm font-medium text-slate-700">{file ? file.name : 'Drop a .csv, .xlsx or .xls file, or click to browse'}</span>
        <span className="text-xs text-slate-400">Columns: Account (required), Region, AE Lead, Justification, ICP Score, Revenue, Employees, HQ, Est. Software Engineers, Est. Annual IT Spend, Notes, Sources</span>
        <input
          type="file"
          accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) load(f)
            e.target.value = ''
          }}
        />
      </label>

      {error && <p className="mt-3 text-xs text-red-600">{error}</p>}

      {result && result.rows.length > 0 && (
        <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm">
          <p className="font-medium text-slate-800">
            {newRows.length} new account{newRows.length === 1 ? '' : 's'} to add
            {result.sheetName ? <span className="font-normal text-slate-400"> · sheet “{result.sheetName}”</span> : null}
          </p>
          <ul className="mt-1 space-y-0.5 text-xs text-slate-500">
            <li>{assignedCount} pre-assigned to a director, {newRows.length - assignedCount} to Unassigned</li>
            {updateRows.length > 0 && <li>{updateRows.length} already on the board — details will be updated</li>}
            {dupCount > 0 && <li>{dupCount} already on the board — skipped</li>}
            {result.unmatchedDirectors.length > 0 && (
              <li className="text-amber-700">
                Unknown director{result.unmatchedDirectors.length === 1 ? '' : 's'} → Unassigned: {result.unmatchedDirectors.join(', ')}
              </li>
            )}
          </ul>
          {newRows.length > 0 && (
            <p className="scrollbar-thin mt-2 max-h-24 overflow-y-auto text-xs text-slate-600">
              {newRows.map((r) => r.name).join(' · ')}
            </p>
          )}
        </div>
      )}

      <div className="mt-4 flex justify-end gap-2">
        <button type="button" onClick={onClose} className={secondary}>Cancel</button>
        <button type="button" onClick={confirm} disabled={newRows.length + updateRows.length === 0} className={primary}>
          <FileUp size={14} /> {newRows.length === 0 && updateRows.length > 0 ? `Update ${updateRows.length}` : `Import ${newRows.length > 0 ? newRows.length : ''}`}
        </button>
      </div>
    </Modal>
  )
}
