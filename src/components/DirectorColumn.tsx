import { useDroppable } from '@dnd-kit/core'
import { useMemo } from 'react'
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
    () => accounts.filter((a) => (assignments[a.id] ?? UNASSIGNED) === directorId).sort((a, b) => a.name.localeCompare(b.name)),
    [accounts, assignments, directorId],
  )
}

export function DirectorColumn({ director, selectedIds, onSelect }: Props) {
  const mine = useAccountsFor(director.id)
  const { setNodeRef, isOver } = useDroppable({ id: director.id })
  const au = mine.filter((a) => a.region === 'AU').length
  const nz = mine.filter((a) => a.region === 'NZ').length
  const other = mine.length - au - nz
  const initials = director.name.split(' ').map((p) => p[0]).join('')

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
          <h2 className="truncate text-sm font-semibold text-slate-800">{director.name}</h2>
          <p className="text-[11px] text-slate-500">
            {au} AU · {nz} NZ{other ? ` · ${other} other` : ''}
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">{mine.length}</span>
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
