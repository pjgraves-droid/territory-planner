import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { useCallback, useEffect, useState } from 'react'
import { AccountCard } from './components/AccountCard'
import { AccountPool } from './components/AccountPool'
import { DirectorColumn } from './components/DirectorColumn'
import { TopBar } from './components/TopBar'
import { useStore } from './store'
import { DIRECTORS } from './types'

export default function App() {
  const accounts = useStore((s) => s.accounts)
  const seeded = useStore((s) => s.seeded)
  const seedFromCsv = useStore((s) => s.seedFromCsv)
  const assignMany = useStore((s) => s.assignMany)

  useEffect(() => {
    if (seeded) return
    fetch(`${import.meta.env.BASE_URL}accounts.csv`)
      .then((r) => r.text())
      .then((t) => seedFromCsv(t, true))
  }, [seeded, seedFromCsv])

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [activeId, setActiveId] = useState<string | null>(null)

  const onSelect = useCallback((id: string, e: React.MouseEvent) => {
    setSelected((prev) => {
      const next = new Set(e.shiftKey || e.ctrlKey || e.metaKey ? prev : [])
      if (prev.has(id) && (e.shiftKey || e.ctrlKey || e.metaKey)) next.delete(id)
      else if (prev.has(id) && prev.size === 1) next.clear()
      else next.add(id)
      return next
    })
  }, [])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor),
  )

  const onDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id))
  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null)
    const target = e.over?.id
    if (!target) return
    const dragged = String(e.active.id)
    const ids = selected.has(dragged) ? Array.from(selected) : [dragged]
    assignMany(ids, String(target))
    setSelected(new Set())
  }

  const activeAccount = activeId ? accounts.find((a) => a.id === activeId) : undefined
  const dragCount = activeId && selected.has(activeId) ? selected.size : 1

  return (
    <div className="flex h-full flex-col">
      <TopBar />
      <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setActiveId(null)}>
        <div className="flex min-h-0 flex-1">
          <AccountPool selectedIds={selected} onSelect={onSelect} onClearSelection={() => setSelected(new Set())} />
          <main className="scrollbar-thin grid min-w-0 flex-1 auto-rows-min grid-cols-[repeat(auto-fit,minmax(200px,1fr))] content-start gap-3 overflow-y-auto p-4">
            {DIRECTORS.map((d) => (
              <DirectorColumn key={d.id} director={d} selectedIds={selected} onSelect={onSelect} />
            ))}
          </main>
        </div>
        <DragOverlay dropAnimation={null}>
          {activeAccount && (
            <div className="relative w-60">
              <AccountCard account={activeAccount} overlay />
              {dragCount > 1 && (
                <span className="absolute -right-2 -top-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-blue-600 px-1.5 text-xs font-bold text-white shadow">
                  {dragCount}
                </span>
              )}
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
