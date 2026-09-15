import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Info, MessageSquare, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useStore } from '../store'
import type { Account } from '../types'
import { AccountDetailsPanel, icpStyle } from './AccountDetailsPanel'

const HOVER_OPEN_MS = 450
const HOVER_CLOSE_MS = 200

interface Props {
  account: Account
  selected?: boolean
  onSelect?: (e: React.MouseEvent) => void
  overlay?: boolean
  accent?: string
}

const regionStyle: Record<string, string> = {
  AU: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  NZ: 'bg-sky-50 text-sky-700 ring-sky-200',
  US: 'bg-amber-50 text-amber-700 ring-amber-200',
}

export function AccountCard({ account, selected, onSelect, overlay, accent }: Props) {
  const note = useStore((s) => s.notes[account.id])
  const setNote = useStore((s) => s.setNote)
  const removeAccount = useStore((s) => s.removeAccount)
  const [editing, setEditing] = useState(false)
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: account.id,
    disabled: overlay || editing,
  })

  const [cardEl, setCardEl] = useState<HTMLDivElement | null>(null)
  const timer = useRef<number | null>(null)
  const [panel, setPanel] = useState<'closed' | 'hover' | 'pinned'>('closed')
  const clearTimer = () => {
    if (timer.current) window.clearTimeout(timer.current)
    timer.current = null
  }
  const openSoon = () => {
    if (overlay || panel === 'pinned') return
    clearTimer()
    timer.current = window.setTimeout(() => setPanel('hover'), HOVER_OPEN_MS)
  }
  const closeSoon = () => {
    clearTimer()
    if (panel === 'pinned') return
    timer.current = window.setTimeout(() => setPanel((p) => (p === 'hover' ? 'closed' : p)), HOVER_CLOSE_MS)
  }
  const closePanel = useCallback(() => setPanel('closed'), [])
  useEffect(() => clearTimer, [])

  const icp = account.details?.icp

  return (
    <div
      ref={(el) => {
        setNodeRef(el)
        setCardEl(el)
      }}
      style={{ transform: CSS.Translate.toString(transform), borderLeftColor: accent }}
      onClick={onSelect}
      onMouseEnter={openSoon}
      onMouseLeave={closeSoon}
      className={[
        'group relative flex items-start gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm shadow-sm transition',
        accent ? 'border-l-[3px]' : '',
        overlay ? 'rotate-1 shadow-xl ring-2 ring-blue-400' : 'hover:border-slate-300 hover:shadow',
        isDragging ? 'opacity-30' : '',
        selected ? 'ring-2 ring-blue-500 border-blue-300' : '',
      ].join(' ')}
    >
      <button
        {...listeners}
        {...attributes}
        onPointerDown={(e) => {
          clearTimer()
          setPanel('closed')
          listeners?.onPointerDown?.(e)
        }}
        aria-label={`Drag ${account.name}`}
        className="mt-0.5 -ml-1 cursor-grab touch-none rounded p-0.5 text-slate-300 hover:text-slate-500 active:cursor-grabbing focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
      >
        <GripVertical size={14} />
      </button>
      <div className="min-w-0 flex-1">
        <p className="font-medium leading-snug text-slate-800 [overflow-wrap:anywhere]">
          {account.name}
          <span className={`ml-1.5 inline-block align-middle rounded px-1.5 py-px text-[10px] font-semibold leading-tight ring-1 ${regionStyle[account.region] ?? 'bg-slate-50 text-slate-600 ring-slate-200'}`}>
            {account.region}
          </span>
          {icp != null && (
            <span
              title={`ICP score ${icp}/100`}
              className={`ml-1 inline-block align-middle rounded px-1.5 py-px text-[10px] font-bold leading-tight ring-1 ${icpStyle(icp)}`}
            >
              {icp}
            </span>
          )}
        </p>
        {editing ? (
          <input
            autoFocus
            defaultValue={note ?? ''}
            placeholder="Why this allocation?"
            onClick={(e) => e.stopPropagation()}
            onBlur={(e) => {
              setNote(account.id, e.target.value)
              setEditing(false)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
              if (e.key === 'Escape') setEditing(false)
            }}
            className="mt-1 w-full rounded border border-slate-200 px-1.5 py-0.5 text-xs focus:border-blue-400 focus:outline-none"
          />
        ) : note ? (
          <p className="mt-0.5 truncate text-xs text-slate-500" title={note}>{note}</p>
        ) : null}
      </div>
      {!overlay && (
        <div className="-mr-1 flex shrink-0 items-center">
          <button
            onClick={(e) => {
              e.stopPropagation()
              clearTimer()
              setPanel((p) => (p === 'pinned' ? 'closed' : 'pinned'))
            }}
            title="Account details"
            className={`rounded p-0.5 transition hover:bg-slate-100 hover:text-slate-600 ${
              panel === 'pinned' ? 'text-blue-600' : account.details ? 'text-slate-400' : 'text-slate-200 group-hover:text-slate-400'
            }`}
          >
            <Info size={13} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              setEditing(true)
            }}
            title="Add justification"
            className={`rounded p-0.5 transition hover:bg-slate-100 hover:text-slate-600 ${note ? 'text-slate-400' : 'text-slate-200 group-hover:text-slate-400'}`}
          >
            <MessageSquare size={13} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              if (window.confirm(`Remove ${account.name} from the board?`)) removeAccount(account.id)
            }}
            title="Remove account"
            className="rounded p-0.5 text-slate-200 transition group-hover:text-slate-400 hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 size={13} />
          </button>
        </div>
      )}
      {panel !== 'closed' && !isDragging && cardEl && (
        <AccountDetailsPanel
          account={account}
          anchor={cardEl}
          pinned={panel === 'pinned'}
          onPin={() => {
            clearTimer()
            setPanel('pinned')
          }}
          onClose={closePanel}
          onMouseEnter={clearTimer}
          onMouseLeave={closeSoon}
        />
      )}
    </div>
  )
}
