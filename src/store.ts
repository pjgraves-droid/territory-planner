import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { parseAccountsCsv } from './csv'
import { UNASSIGNED, type Account, type Version } from './types'

interface State {
  accounts: Account[]
  assignments: Record<string, string>
  notes: Record<string, string>
  versions: Version[]
  activeVersionId: string | null
  dirty: boolean
  seeded: boolean

  seedFromCsv: (text: string, replaceAssignments: boolean) => void
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

const uid = () => Math.random().toString(36).slice(2, 10)

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      accounts: [],
      assignments: {},
      notes: {},
      versions: [],
      activeVersionId: null,
      dirty: false,
      seeded: false,

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
