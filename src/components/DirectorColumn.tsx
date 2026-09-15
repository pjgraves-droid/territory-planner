import { useDroppable } from '@dnd-kit/core'
import { MoreHorizontal, Pencil, Plus, Trash2, UserPlus } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '../store'
import { UNASSIGNED, type Account, type Director } from '../types'
import { AccountCard } from './AccountCard'

interface Props {
  director: Director
  selectedIds: Set<string>
  onSelect: (id: string, e: React.MouseEvent) => void
}

export function useAccountsFor(directorId: string): Account[] {
  const accounts = useStore((s) => s.accounts)
  const assignments = useStore((s) => s.assignments)
  return useMemo(
    () =>
      accounts
        .filter((a) => (assignments[a.id] ?? UNASSIGNED) === directorId)
        .sort((a, b) => (b.details?.icp ?? -1) - (a.details?.icp ?? -1) || a.name.localeCompare(b.name)),
    [accounts, assignments, directorId],
  )
}

export function DirectorColumn({ director, selectedIds, onSelect }: Props) {
  const mine = useAccountsFor(director.id)
  const { setNodeRef, isOver } = useDroppable({ id: director.id })
  const au = mine.filter((a) => a.region === 'AU').length
  const nz = mine.filter((a) => a.region === 'NZ').length
  const other = mine.length - au - nz
  const initials = director.name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()
  const renameDirector = useStore((s) => s.renameDirector)
  const removeDirector = useStore((s) => s.removeDirector)
  const [menu, setMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!menu) return
    const h = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [menu])

  return (
    <section
      ref={setNodeRef}
      className={[
        'flex min-h-[320px] flex-col rounded-xl border bg-white/70 transition',
        isOver ? 'border-blue-400 bg-blue-50/60 ring-2 ring-blue-200' : 'border-slate-200',
      ].join(' ')}
    >
      <header className="flex items-center gap-2.5 border-b border-slate-100 px-3 py-2.5">
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
          style={{ background: director.color }}
        >
          {initials}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold leading-snug text-slate-800">{director.name}</h2>
          <p className="text-[11px] text-slate-500">
            {au} AU · {nz} NZ{other ? ` · ${other} other` : ''}
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">{mine.length}</span>
        <div ref={menuRef} className="relative">
          <button
            onClick={() => setMenu((m) => !m)}
            aria-label={`Options for ${director.name}`}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <MoreHorizontal size={14} />
          </button>
          {menu && (
            <div className="absolute right-0 top-full z-30 mt-1 w-44 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 text-sm shadow-lg">
              <button
                onClick={() => {
                  setMenu(false)
                  const name = window.prompt('Rename Account Director', director.name)
                  if (name?.trim()) renameDirector(director.id, name)
                }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-slate-50"
              >
                <Pencil size={13} /> Rename
              </button>
              <button
                onClick={() => {
                  setMenu(false)
                  const msg = mine.length
                    ? `Remove ${director.name}? ${mine.length} account${mine.length === 1 ? '' : 's'} will move to Unassigned.`
                    : `Remove ${director.name}?`
                  if (window.confirm(msg)) removeDirector(director.id)
                }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-red-600 hover:bg-red-50"
              >
                <Trash2 size={13} /> Remove
              </button>
            </div>
          )}
        </div>
      </header>
      <div className="scrollbar-thin flex flex-1 flex-col gap-1.5 p-2">
        {mine.length === 0 && (
          <div className="flex flex-1 items-center justify-center rounded-lg border-2 border-dashed border-slate-200 p-4 text-center text-xs text-slate-400">
            Drop accounts here
          </div>
        )}
        {mine.map((a) => (
          <AccountCard
            key={a.id}
            account={a}
            accent={director.color}
            selected={selectedIds.has(a.id)}
            onSelect={(e) => onSelect(a.id, e)}
          />
        ))}
      </div>
    </section>
  )
}

export function AddDirectorCard({ onAdd }: { onAdd: (name: string) => void }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const submit = () => {
    if (name.trim()) onAdd(name)
    setName('')
    setOpen(false)
  }
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex min-h-[320px] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 text-slate-400 transition hover:border-slate-300 hover:bg-white/60 hover:text-slate-600"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100">
          <UserPlus size={16} />
        </span>
        <span className="text-sm font-medium">Add Account Director</span>
      </button>
    )
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
      className="flex min-h-[320px] flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3"
    >
      <label className="text-xs font-medium text-slate-600">New Account Director</label>
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
        placeholder="Full name"
        className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm focus:border-blue-400 focus:outline-none"
      />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={!name.trim()}
          className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700 disabled:bg-slate-200 disabled:text-slate-400"
        >
          <Plus size={14} /> Add
        </button>
        <button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50">
          Cancel
        </button>
      </div>
    </form>
  )
}
