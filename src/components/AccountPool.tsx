import { useDroppable } from '@dnd-kit/core'
import { ArrowDownWideNarrow, Check, FileUp, Plus, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { AddAccountDialog, ImportAccountsDialog } from './AccountDialogs'
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
  const [sort, setSort] = useState<'name' | 'icp'>('name')
  const { setNodeRef, isOver } = useDroppable({ id: UNASSIGNED })
  const [dialog, setDialog] = useState<'add' | 'import' | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(t)
  }, [toast])

  const regions = useMemo(() => Array.from(new Set(unassigned.map((a) => a.region))).sort(), [unassigned])
  const visible = useMemo(
    () =>
      unassigned
        .filter((a) => (!region || a.region === region) && a.name.toLowerCase().includes(query.trim().toLowerCase()))
        .sort((a, b) =>
          sort === 'icp' ? (b.details?.icp ?? -1) - (a.details?.icp ?? -1) || a.name.localeCompare(b.name) : a.name.localeCompare(b.name),
        ),
    [unassigned, region, query, sort],
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
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800">Unassigned accounts</h2>
          <div className="flex items-center gap-1">
            <span className="mr-1 text-xs text-slate-500">
              {unassigned.length} of {total}
            </span>
            <button
              onClick={() => setDialog('import')}
              title="Import accounts from CSV / Excel"
              className="rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            >
              <FileUp size={15} />
            </button>
            <button
              onClick={() => setDialog('add')}
              title="Add account"
              className="rounded-md bg-slate-900 p-1 text-white hover:bg-slate-700"
            >
              <Plus size={15} />
            </button>
          </div>
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
        <div className="mt-2 flex items-center gap-1">
          {regions.length > 1 && (
            <div className="flex flex-1 flex-wrap gap-1">
              <Chip active={region === null} onClick={() => setRegion(null)}>All</Chip>
              {regions.map((r) => (
                <Chip key={r} active={region === r} onClick={() => setRegion(region === r ? null : r)}>{r}</Chip>
              ))}
            </div>
          )}
          <button
            onClick={() => setSort(sort === 'name' ? 'icp' : 'name')}
            title={sort === 'icp' ? 'Sorted by ICP score (high to low) — click for A–Z' : 'Sorted A–Z — click to sort by ICP score'}
            className={`ml-auto flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium transition ${
              sort === 'icp' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <ArrowDownWideNarrow size={12} /> {sort === 'icp' ? 'ICP' : 'A–Z'}
          </button>
        </div>
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
      {dialog === 'add' && <AddAccountDialog onClose={() => setDialog(null)} onDone={setToast} />}
      {dialog === 'import' && <ImportAccountsDialog onClose={() => setDialog(null)} onDone={setToast} />}
      {toast && (
        <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-slate-900 px-4 py-2 text-sm text-white shadow-lg">
          <Check size={14} className="mr-1.5 inline" /> {toast}
        </div>
      )}
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
