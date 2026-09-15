import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { parseAccountsCsv, slug } from './csv'
import { DIRECTORS, DIRECTOR_PALETTE, UNASSIGNED, type Account, type Director, type Version } from './types'

interface State {
  directors: Director[]
  accounts: Account[]
  assignments: Record<string, string>
  notes: Record<string, string>
  versions: Version[]
  activeVersionId: string | null
  dirty: boolean
  seeded: boolean

  addDirector: (name: string) => void
  renameDirector: (id: string, name: string) => void
  removeDirector: (id: string) => void
  seedFromCsv: (text: string, replaceAssignments: boolean) => void
  addAccounts: (items: NewAccount[]) => { added: number; skipped: number }
  removeAccount: (id: string) => void
  assign: (accountId: string, directorId: string) => void
  assignMany: (accountIds: string[], directorId: string) => void
  setNote: (accountId: string, note: string) => void
  saveVersion: () => void
  saveVersionAs: (name: string) => void
  loadVersion: (id: string) => void
  renameVersion: (id: string, name: string) => void
  deleteVersion: (id: string) => void
  duplicateVersion: (id: string) => void
  resetToCsv: () => Promise<void>
  importVersions: (versions: Version[]) => void
}

export interface NewAccount {
  name: string
  region: string
  directorId?: string
  note?: string
}

const uid = () => Math.random().toString(36).slice(2, 10)

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      directors: DIRECTORS,
      accounts: [],
      assignments: {},
      notes: {},
      versions: [],
      activeVersionId: null,
      dirty: false,
      seeded: false,

      addDirector: (name) =>
        set((s) => {
          const trimmed = name.trim()
          if (!trimmed) return {}
          const parts = trimmed.split(/\s+/)
          const short = parts[0]
          const color = DIRECTOR_PALETTE[s.directors.length % DIRECTOR_PALETTE.length]
          return { directors: [...s.directors, { id: `d-${uid()}`, name: trimmed, short, color }] }
        }),

      renameDirector: (id, name) =>
        set((s) => ({
          directors: s.directors.map((d) => (d.id === id ? { ...d, name: name.trim() || d.name, short: (name.trim() || d.name).split(/\s+/)[0] } : d)),
        })),

      removeDirector: (id) =>
        set((s) => {
          const assignments = { ...s.assignments }
          let changed = false
          for (const k of Object.keys(assignments)) {
            if (assignments[k] === id) {
              assignments[k] = UNASSIGNED
              changed = true
            }
          }
          return { directors: s.directors.filter((d) => d.id !== id), assignments, dirty: s.dirty || changed }
        }),

      seedFromCsv: (text, replaceAssignments) => {
        const parsed = parseAccountsCsv(text)
        const prev = get()
        const assignments = replaceAssignments
          ? parsed.assignments
          : Object.fromEntries(
              parsed.accounts.map((a) => [a.id, prev.assignments[a.id] ?? parsed.assignments[a.id] ?? UNASSIGNED]),
            )
        const notes = replaceAssignments ? parsed.notes : { ...parsed.notes, ...prev.notes }
        set({ accounts: parsed.accounts, assignments, notes, seeded: true, dirty: !replaceAssignments || prev.dirty })
      },

      addAccounts: (items) => {
        const s = get()
        const existing = new Set(s.accounts.map((a) => a.id))
        const directorIds = new Set(s.directors.map((d) => d.id))
        const accounts = [...s.accounts]
        const assignments = { ...s.assignments }
        const notes = { ...s.notes }
        let added = 0
        let skipped = 0
        for (const item of items) {
          const name = item.name.trim()
          const id = slug(name)
          if (!name || !id || existing.has(id)) {
            skipped++
            continue
          }
          existing.add(id)
          accounts.push({ id, name, region: item.region.trim() || '—' })
          assignments[id] = item.directorId && directorIds.has(item.directorId) ? item.directorId : UNASSIGNED
          if (item.note?.trim()) notes[id] = item.note.trim()
          added++
        }
        if (added) set({ accounts, assignments, notes, dirty: true })
        return { added, skipped }
      },

      removeAccount: (id) =>
        set((s) => {
          const assignments = { ...s.assignments }
          const notes = { ...s.notes }
          delete assignments[id]
          delete notes[id]
          return { accounts: s.accounts.filter((a) => a.id !== id), assignments, notes, dirty: true }
        }),

      assign: (accountId, directorId) => {
        if (get().assignments[accountId] === directorId) return
        set((s) => ({ assignments: { ...s.assignments, [accountId]: directorId }, dirty: true }))
      },

      assignMany: (accountIds, directorId) =>
        set((s) => {
          const next = { ...s.assignments }
          for (const id of accountIds) next[id] = directorId
          return { assignments: next, dirty: true }
        }),

      setNote: (accountId, note) =>
        set((s) => {
          const notes = { ...s.notes }
          if (note.trim()) notes[accountId] = note.trim()
          else delete notes[accountId]
          return { notes, dirty: true }
        }),

      saveVersion: () => {
        const { activeVersionId, assignments, notes, versions } = get()
        if (!activeVersionId) {
          get().saveVersionAs(`Version ${versions.length + 1}`)
          return
        }
        const now = new Date().toISOString()
        set({
          versions: versions.map((v) =>
            v.id === activeVersionId ? { ...v, assignments: { ...assignments }, notes: { ...notes }, updatedAt: now } : v,
          ),
          dirty: false,
        })
      },

      saveVersionAs: (name) => {
        const { assignments, notes } = get()
        const now = new Date().toISOString()
        const v: Version = { id: uid(), name, createdAt: now, updatedAt: now, assignments: { ...assignments }, notes: { ...notes } }
        set((s) => ({ versions: [...s.versions, v], activeVersionId: v.id, dirty: false }))
      },

      loadVersion: (id) => {
        const v = get().versions.find((x) => x.id === id)
        if (!v) return
        set({ assignments: { ...v.assignments }, notes: { ...v.notes }, activeVersionId: id, dirty: false })
      },

      renameVersion: (id, name) =>
        set((s) => ({ versions: s.versions.map((v) => (v.id === id ? { ...v, name } : v)) })),

      deleteVersion: (id) =>
        set((s) => ({
          versions: s.versions.filter((v) => v.id !== id),
          activeVersionId: s.activeVersionId === id ? null : s.activeVersionId,
          dirty: s.activeVersionId === id ? true : s.dirty,
        })),

      duplicateVersion: (id) => {
        const v = get().versions.find((x) => x.id === id)
        if (!v) return
        const now = new Date().toISOString()
        const copy: Version = { ...v, id: uid(), name: `${v.name} (copy)`, createdAt: now, updatedAt: now }
        set((s) => ({ versions: [...s.versions, copy], activeVersionId: copy.id, assignments: { ...copy.assignments }, notes: { ...copy.notes }, dirty: false }))
      },

      resetToCsv: async () => {
        const text = await fetch(`${import.meta.env.BASE_URL}accounts.csv`).then((r) => r.text())
        const parsed = parseAccountsCsv(text)
        set({ accounts: parsed.accounts, assignments: parsed.assignments, notes: parsed.notes, activeVersionId: null, dirty: true })
      },

      importVersions: (incoming) =>
        set((s) => {
          const ids = new Set(s.versions.map((v) => v.id))
          const added = incoming.map((v) => (ids.has(v.id) ? { ...v, id: uid(), name: `${v.name} (imported)` } : v))
          return { versions: [...s.versions, ...added] }
        }),
    }),
    { name: 'territory-planner-v1' },
  ),
)
