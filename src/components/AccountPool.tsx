import { useDroppable } from '@dnd-kit/core'
import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useStore } from '../store'
import { UNASSIGNED } from '../types'
import { AccountCard } from './AccountCard'
import { useAccountsFor } from './DirectorColumn'

interface Props {
  selectedIds: Set<string>
  onSelect: (id: string, e: React.MouseEvent) => void
  onClearSelection: () => void
}

export function AccountPool({ selectedIds, onSelect, onClearSelection }: Props) {
  const total = useStore((s) => s.accounts.length)
  const unassigned = useAccountsFor(UNASSIGNED)
  const [query, setQuery] = useState('')
  const [region, setRegion] = useState<string | null>(null)
  const { setNodeRef, isOver } = useDroppable({ id: UNASSIGNED })

  const regions = useMemo(() => Array.from(new Set(unassigned.map((a) => a.region))).sort(), [unassigned])
  const visible = useMemo(
    () =>
      unassigned.filter(
        (a) => (!region || a.region === region) && a.name.toLowerCase().includes(query.trim().toLowerCase()),
      ),
    [unassigned, region, query],
  )

  return (
    <aside
      ref={setNodeRef}
      className={[
        'flex w-72 shrink-0 flex-col border-r border-slate-200 bg-white transition',
        isOver ? 'bg-blue-50/60' : '',
      ].join(' ')}
    >
      <div className="border-b border-slate-100 px-3 pt-3 pb-2">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold text-slate-800">Unassigned accounts</h2>
          <span className="text-xs text-slate-500">
            {unassigned.length} of {total}
          </span>
        </div>
        <label className="mt-2 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 focus-within:border-blue-400 focus-within:bg-white">
          <Search size={14} className="text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search accounts"
            className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
          />
        </label>
        {regions.length > 1 && (
          <div className="mt-2 flex flex-wrap gap-1">
            <Chip active={region === null} onClick={() => setRegion(null)}>All</Chip>
            {regions.map((r) => (
              <Chip key={r} active={region === r} onClick={() => setRegion(region === r ? null : r)}>{r}</Chip>
            ))}
          </div>
        )}
        {selectedIds.size > 0 && (
          <div className="mt-2 flex items-center justify-between rounded-md bg-blue-50 px-2 py-1 text-xs text-blue-700">
            <span>{selectedIds.size} selected — drag to move together</span>
            <button onClick={onClearSelection} className="font-medium hover:underline">Clear</button>
          </div>
        )}
      </div>
      <div className="scrollbar-thin flex flex-1 flex-col gap-1.5 overflow-y-auto p-2">
        {visible.length === 0 && (
          <div className="flex flex-1 items-center justify-center rounded-lg border-2 border-dashed border-slate-200 p-6 text-center text-xs text-slate-400">
            {unassigned.length === 0 ? 'Everything is allocated. Drop accounts here to unassign.' : 'No matches'}
          </div>
        )}
        {visible.map((a) => (
          <AccountCard key={a.id} account={a} selected={selectedIds.has(a.id)} onSelect={(e) => onSelect(a.id, e)} />
        ))}
      </div>
      <p className="border-t border-slate-100 px-3 py-2 text-[11px] text-slate-400">
        Tip: click to select, Shift/Ctrl-click for multiple, then drag.
      </p>
    </aside>
  )
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition ${
        active ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
      }`}
    >
      {children}
    </button>
  )
}
