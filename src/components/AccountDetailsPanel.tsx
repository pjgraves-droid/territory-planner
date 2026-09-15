import { ExternalLink, Pin, X } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Account } from '../types'

export function icpStyle(score: number | undefined): string {
  if (score == null) return 'bg-slate-100 text-slate-500 ring-slate-200'
  if (score >= 80) return 'bg-emerald-600 text-white ring-emerald-600'
  if (score >= 60) return 'bg-emerald-50 text-emerald-700 ring-emerald-200'
  if (score >= 40) return 'bg-amber-50 text-amber-700 ring-amber-200'
  return 'bg-slate-100 text-slate-600 ring-slate-200'
}

const PANEL_W = 380
const GAP = 8

interface Props {
  account: Account
  anchor: HTMLElement
  pinned: boolean
  onPin: () => void
  onClose: () => void
  onMouseEnter?: () => void
  onMouseLeave?: () => void
}

export function AccountDetailsPanel({ account, anchor, pinned, onPin, onClose, onMouseEnter, onMouseLeave }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const d = account.details ?? {}

  useLayoutEffect(() => {
    const place = () => {
      const r = anchor.getBoundingClientRect()
      const h = ref.current?.offsetHeight ?? 320
      let left = r.right + GAP
      if (left + PANEL_W > window.innerWidth - GAP) left = r.left - PANEL_W - GAP
      if (left < GAP) left = GAP
      let top = r.top
      if (top + h > window.innerHeight - GAP) top = Math.max(GAP, window.innerHeight - h - GAP)
      setPos({ top, left })
    }
    place()
    window.addEventListener('scroll', place, true)
    window.addEventListener('resize', place)
    return () => {
      window.removeEventListener('scroll', place, true)
      window.removeEventListener('resize', place)
    }
  }, [anchor, account])

  useEffect(() => {
    if (!pinned) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node) && !anchor.contains(e.target as Node)) onClose()
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onDown)
    }
  }, [pinned, onClose, anchor])

  const stats: [string, string | undefined][] = [
    ['Revenue', d.revenue],
    ['Employees', d.employees],
    ['HQ', d.hq],
    ['Software engineers', d.engineers],
    ['Annual IT spend', d.itSpend],
  ]
  const hasAny = stats.some(([, v]) => v) || d.notes || d.sources?.length || d.icp != null

  return createPortal(
    <div
      ref={ref}
      role="dialog"
      aria-label={`${account.name} details`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={(e) => e.stopPropagation()}
      style={{ top: pos?.top ?? 0, left: pos?.left ?? 0, width: PANEL_W, visibility: pos ? 'visible' : 'hidden' }}
      className="fixed z-50 flex max-h-[80vh] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white text-sm shadow-2xl ring-1 ring-black/5"
    >
      <div className="flex items-start gap-3 border-b border-slate-100 px-4 py-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold leading-snug text-slate-900">{account.name}</h3>
          <p className="text-xs text-slate-500">{account.region}{d.hq ? ` · ${d.hq.split(',')[0]}` : ''}</p>
        </div>
        {d.icp != null && (
          <div className={`flex shrink-0 flex-col items-center rounded-lg px-2.5 py-1 ring-1 ${icpStyle(d.icp)}`}>
            <span className="text-lg font-bold leading-none">{d.icp}</span>
            <span className="text-[9px] font-semibold uppercase tracking-wide opacity-80">ICP</span>
          </div>
        )}
        <div className="flex shrink-0 items-center gap-0.5">
          <button
            onClick={pinned ? onClose : onPin}
            title={pinned ? 'Unpin' : 'Pin open'}
            className={`rounded p-1 hover:bg-slate-100 ${pinned ? 'text-blue-600' : 'text-slate-400 hover:text-slate-700'}`}
          >
            <Pin size={14} className={pinned ? 'fill-current' : ''} />
          </button>
          {pinned && (
            <button onClick={onClose} title="Close" className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {!hasAny && <p className="text-xs text-slate-400">No additional information for this account yet. Import an enriched CSV to add details.</p>}
        {stats.some(([, v]) => v) && (
          <dl className="space-y-2">
            {stats.map(([label, value]) =>
              value ? (
                <div key={label}>
                  <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</dt>
                  <dd className="leading-snug text-slate-700">{value}</dd>
                </div>
              ) : null,
            )}
          </dl>
        )}
        {d.notes && (
          <div className="mt-3 rounded-lg bg-slate-50 p-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Notes</p>
            <p className="mt-0.5 leading-snug text-slate-700">{d.notes}</p>
          </div>
        )}
        {d.sources && d.sources.length > 0 && (
          <div className="mt-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Sources</p>
            <ul className="mt-1 space-y-0.5">
              {d.sources.map((src) => (
                <li key={src}>
                  <a
                    href={src}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex max-w-full items-center gap-1 text-xs text-blue-600 hover:underline"
                  >
                    <ExternalLink size={11} className="shrink-0" />
                    <span className="truncate">{sourceLabel(src)}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      {!pinned && <p className="border-t border-slate-100 px-4 py-1.5 text-[10px] text-slate-400">Click the pin to keep this open</p>}
    </div>,
    document.body,
  )
}

function sourceLabel(url: string): string {
  try {
    const u = new URL(url)
    const path = decodeURIComponent(u.pathname).split('/').filter(Boolean).pop() ?? ''
    return path ? `${u.hostname.replace(/^www\./, '')} · ${path}` : u.hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}
