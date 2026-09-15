import Papa from 'papaparse'
import { CSV_LEAD_TO_DIRECTOR, UNASSIGNED, type Account, type AccountDetails } from './types'

type Row = Record<string, string | undefined>

const DETAIL_COLUMNS: Record<keyof Omit<AccountDetails, 'icp' | 'sources'>, string[]> = {
  revenue: ['revenue', 'annual revenue'],
  employees: ['employees', 'headcount', 'staff'],
  hq: ['hq office location', 'hq', 'headquarters', 'hq location', 'location'],
  engineers: ['est. software engineers', 'software engineers', 'engineers'],
  itSpend: ['est. annual it spend', 'it spend', 'annual it spend', 'tech spend'],
  notes: ['notes', 'note', 'intel', 'summary'],
}
const ICP_COLUMNS = ['icp score (/100)', 'icp score', 'icp']
const SOURCE_COLUMNS = ['sources', 'source', 'links', 'references']

export function pickColumn(row: Record<string, unknown>, keys: string[]): string {
  for (const [k, v] of Object.entries(row)) {
    if (keys.includes(k.trim().toLowerCase()) && v != null && String(v).trim()) return String(v).trim()
  }
  return ''
}

export function parseDetails(row: Record<string, unknown>): AccountDetails | undefined {
  const d: AccountDetails = {}
  const icp = pickColumn(row, ICP_COLUMNS)
  if (icp && !Number.isNaN(Number(icp))) d.icp = Math.round(Number(icp))
  for (const key of Object.keys(DETAIL_COLUMNS) as (keyof typeof DETAIL_COLUMNS)[]) {
    const v = pickColumn(row, DETAIL_COLUMNS[key])
    if (v) d[key] = v
  }
  const sources = pickColumn(row, SOURCE_COLUMNS)
  if (sources) {
    d.sources = sources
      .split(/\s*\|\s*|\s*[\n;]\s*|\s+(?=https?:\/\/)/)
      .map((x) => x.trim())
      .filter(Boolean)
  }
  return Object.keys(d).length ? d : undefined
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
    const details = parseDetails(row)
    accounts.push({ id, name, region: row.Region?.trim() || '—', ...(details ? { details } : {}) })
    const lead = row['AE Lead']?.trim().toLowerCase() ?? ''
    assignments[id] = CSV_LEAD_TO_DIRECTOR[lead] ?? UNASSIGNED
    const note = row.Justification?.trim()
    if (note) notes[id] = note
  }
  return { accounts, assignments, notes }
}
