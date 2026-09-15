import { Check, ChevronDown, Copy, Download, FileSpreadsheet, FileText, Map, RotateCcw, Save, Trash2, Upload, Files, Pencil } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { copyForGoogleSheets, exportCsv, exportExcel, exportPdf, type ExportInput } from '../exports'
import { useStore } from '../store'
import type { Version } from '../types'

export function TopBar() {
  const s = useStore()
  const active = s.versions.find((v) => v.id === s.activeVersionId)
  const versionName = active?.name ?? 'Unsaved draft'
  const input: ExportInput = { accounts: s.accounts, assignments: s.assignments, notes: s.notes, versionName }

  const [toast, setToast] = useState<string | null>(null)
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2500)
    return () => clearTimeout(t)
  }, [toast])

  const saveAs = () => {
    const name = window.prompt('Version name', active ? `${active.name} v2` : `Version ${s.versions.length + 1}`)
    if (name?.trim()) s.saveVersionAs(name.trim())
  }

  return (
    <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-2.5">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white">
          <Map size={16} />
        </span>
        <div>
          <h1 className="text-sm font-semibold leading-tight text-slate-900">Territory Planner</h1>
          <p className="text-[11px] leading-tight text-slate-500">ANZ account allocation</p>
        </div>
      </div>

      <div className="mx-2 h-6 w-px bg-slate-200" />

      <VersionMenu active={active} versionName={versionName} dirty={s.dirty} />

      <button
        onClick={() => s.saveVersion()}
        disabled={!s.dirty && !!active}
        className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-default disabled:bg-slate-200 disabled:text-slate-400"
      >
        <Save size={14} /> Save
      </button>
      <button onClick={saveAs} className={btn}>
        <Files size={14} /> Save as…
      </button>

      <div className="flex-1" />

      <ExportMenu
        onCsv={() => exportCsv(input)}
        onExcel={() => exportExcel(input)}
        onPdf={() => exportPdf(input)}
        onSheets={async () => {
          await copyForGoogleSheets(input)
          setToast('Copied — paste into a Google Sheet (Ctrl/Cmd+V)')
        }}
      />

      {toast && (
        <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-slate-900 px-4 py-2 text-sm text-white shadow-lg">
          <Check size={14} className="mr-1.5 inline" /> {toast}
        </div>
      )}
    </header>
  )
}

const btn =
  'inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50'

function useOutside(onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [onClose])
  return ref
}

function VersionMenu({ active, versionName, dirty }: { active?: Version; versionName: string; dirty: boolean }) {
  const s = useStore()
  const [open, setOpen] = useState(false)
  const ref = useOutside(() => setOpen(false))
  const fileRef = useRef<HTMLInputElement>(null)

  const rename = (v: Version) => {
    const name = window.prompt('Rename version', v.name)
    if (name?.trim()) s.renameVersion(v.id, name.trim())
  }
  const remove = (v: Version) => {
    if (window.confirm(`Delete "${v.name}"?`)) s.deleteVersion(v.id)
  }
  const exportJson = () => {
    const blob = new Blob([JSON.stringify(s.versions, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'territory-plan-versions.json'
    a.click()
    URL.revokeObjectURL(url)
  }
  const importJson = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text()) as Version[]
      if (!Array.isArray(parsed)) throw new Error('bad')
      s.importVersions(parsed)
    } catch {
      window.alert('Could not read that file.')
    }
  }

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)} className={`${btn} min-w-48 justify-between`}>
        <span className="flex items-center gap-2 truncate">
          <span className={`h-2 w-2 shrink-0 rounded-full ${dirty ? 'bg-amber-400' : 'bg-emerald-500'}`} />
          <span className="truncate">{versionName}</span>
          {dirty && <span className="text-xs font-normal text-slate-400">· unsaved</span>}
        </span>
        <ChevronDown size={14} className="text-slate-400" />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-40 mt-1 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="max-h-72 overflow-y-auto py-1">
            {s.versions.length === 0 && <p className="px-3 py-3 text-sm text-slate-400">No saved versions yet.</p>}
            {s.versions.map((v) => (
              <div
                key={v.id}
                className={`group flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 ${v.id === active?.id ? 'bg-blue-50/70' : ''}`}
              >
                <button
                  onClick={() => {
                    if (dirty && !window.confirm('Discard unsaved changes?')) return
                    s.loadVersion(v.id)
                    setOpen(false)
                  }}
                  className="min-w-0 flex-1 text-left"
                >
                  <div className="truncate font-medium text-slate-800">{v.name}</div>
                  <div className="text-[11px] text-slate-400">Updated {new Date(v.updatedAt).toLocaleString()}</div>
                </button>
                <Icon title="Rename" onClick={() => rename(v)}><Pencil size={13} /></Icon>
                <Icon title="Duplicate" onClick={() => { s.duplicateVersion(v.id); setOpen(false) }}><Copy size={13} /></Icon>
                <Icon title="Delete" onClick={() => remove(v)} danger><Trash2 size={13} /></Icon>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-1 border-t border-slate-100 bg-slate-50 p-2 text-xs">
            <Small onClick={() => { if (window.confirm('Reset board to the original CSV allocation?')) s.resetToCsv(); setOpen(false) }}>
              <RotateCcw size={12} /> Reset to CSV
            </Small>
            <Small onClick={exportJson}><Download size={12} /> Export versions</Small>
            <Small onClick={() => fileRef.current?.click()}><Upload size={12} /> Import versions</Small>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) importJson(f)
                e.target.value = ''
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

function ExportMenu({ onCsv, onExcel, onPdf, onSheets }: { onCsv: () => void; onExcel: () => void; onPdf: () => void; onSheets: () => void }) {
  const [open, setOpen] = useState(false)
  const ref = useOutside(() => setOpen(false))
  const item = (label: string, hint: string, icon: React.ReactNode, fn: () => void) => (
    <button
      onClick={() => { fn(); setOpen(false) }}
      className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-slate-50"
    >
      <span className="text-slate-500">{icon}</span>
      <span className="flex-1">
        <span className="block font-medium text-slate-800">{label}</span>
        <span className="block text-[11px] text-slate-400">{hint}</span>
      </span>
    </button>
  )
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)} className={btn}>
        <Download size={14} /> Export <ChevronDown size={14} className="text-slate-400" />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-40 mt-1 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
          {item('CSV', 'Flat file, one row per account', <FileText size={16} />, onCsv)}
          {item('Excel (.xlsx)', 'Summary + one sheet per director', <FileSpreadsheet size={16} />, onExcel)}
          {item('PDF', 'Printable summary and full list', <FileText size={16} />, onPdf)}
          {item('Google Sheets', 'Copy table to clipboard, then paste', <Copy size={16} />, onSheets)}
        </div>
      )}
    </div>
  )
}

function Icon({ children, onClick, title, danger }: { children: React.ReactNode; onClick: () => void; title: string; danger?: boolean }) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={`rounded p-1 text-slate-400 opacity-0 transition group-hover:opacity-100 hover:bg-slate-200 ${danger ? 'hover:text-red-600' : 'hover:text-slate-700'}`}
    >
      {children}
    </button>
  )
}

function Small({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className="inline-flex items-center gap-1 rounded-md px-2 py-1 font-medium text-slate-600 hover:bg-white hover:text-slate-900">
      {children}
    </button>
  )
}
