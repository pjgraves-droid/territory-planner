import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, MessageSquare, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useStore } from '../store'
import type { Account } from '../types'

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

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), borderLeftColor: accent }}
      onClick={onSelect}
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
        aria-label={`Drag ${account.name}`}
        className="mt-0.5 -ml-1 cursor-grab touch-none rounded p-0.5 text-slate-300 hover:text-slate-500 active:cursor-grabbing focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
      >
        <GripVertical size={14} />
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium text-slate-800">{account.name}</span>
          <span className={`shrink-0 rounded px-1.5 py-px text-[10px] font-semibold ring-1 ${regionStyle[account.region] ?? 'bg-slate-50 text-slate-600 ring-slate-200'}`}>
            {account.region}
          </span>
        </div>
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
        <div className="flex shrink-0 items-center">
          <button
            onClick={(e) => {
              e.stopPropagation()
              setEditing(true)
            }}
            title="Add justification"
            className={`rounded p-1 text-slate-300 transition hover:bg-slate-100 hover:text-slate-600 ${note ? 'text-slate-400' : 'opacity-0 group-hover:opacity-100'}`}
          >
            <MessageSquare size={13} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              if (window.confirm(`Remove ${account.name} from the board?`)) removeAccount(account.id)
            }}
            title="Remove account"
            className="rounded p-1 text-slate-300 opacity-0 transition group-hover:opacity-100 hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 size={13} />
          </button>
        </div>
      )}
    </div>
  )
}
