import Papa from 'papaparse'
import { CSV_LEAD_TO_DIRECTOR, UNASSIGNED, type Account } from './types'

interface Row {
  Account?: string
  Region?: string
  'AE Lead'?: string
  Justification?: string
}

export interface ParsedCsv {
  accounts: Account[]
  assignments: Record<string, string>
  notes: Record<string, string>
}

export function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export function parseAccountsCsv(text: string): ParsedCsv {
  const { data } = Papa.parse<Row>(text, { header: true, skipEmptyLines: true })
  const accounts: Account[] = []
  const assignments: Record<string, string> = {}
  const notes: Record<string, string> = {}
  const seen = new Set<string>()
  for (const row of data) {
    const name = row.Account?.trim()
    if (!name) continue
    const id = slug(name)
    if (seen.has(id)) continue
    seen.add(id)
    accounts.push({ id, name, region: row.Region?.trim() || '—' })
    const lead = row['AE Lead']?.trim().toLowerCase() ?? ''
    assignments[id] = CSV_LEAD_TO_DIRECTOR[lead] ?? UNASSIGNED
    const note = row.Justification?.trim()
    if (note) notes[id] = note
  }
  return { accounts, assignments, notes }
}
