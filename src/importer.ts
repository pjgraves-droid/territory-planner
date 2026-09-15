import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import type { NewAccount } from './store'
import type { Director } from './types'

type RawRow = Record<string, unknown>

const NAME_KEYS = ['account', 'account name', 'name', 'company', 'customer', 'organisation', 'organization']
const REGION_KEYS = ['region', 'country', 'market', 'geo']
const DIRECTOR_KEYS = ['ae lead', 'account director', 'director', 'owner', 'ad', 'lead', 'ae']
const NOTE_KEYS = ['justification', 'note', 'notes', 'comment', 'comments']

function pick(row: RawRow, keys: string[]): string {
  for (const [k, v] of Object.entries(row)) {
    if (keys.includes(k.trim().toLowerCase()) && v != null && String(v).trim()) return String(v).trim()
  }
  return ''
}

export function matchDirector(value: string, directors: Director[]): string | undefined {
  const v = value.trim().toLowerCase().replace(/\.$/, '')
  if (!v) return undefined
  return (
    directors.find((d) => d.name.toLowerCase() === v)?.id ??
    directors.find((d) => d.short.toLowerCase() === v)?.id ??
    directors.find((d) => d.name.toLowerCase().split(/\s+/)[0] === v.split(/\s+/)[0] && (v.split(/\s+/).length === 1 || d.name.toLowerCase().startsWith(v)))?.id
  )
}

export interface ImportResult {
  rows: NewAccount[]
  unmatchedDirectors: string[]
  sheetName?: string
}

function rowsToAccounts(rows: RawRow[], directors: Director[]): ImportResult {
  const out: NewAccount[] = []
  const unmatched = new Set<string>()
  for (const row of rows) {
    const name = pick(row, NAME_KEYS) || String(Object.values(row)[0] ?? '').trim()
    if (!name) continue
    const region = pick(row, REGION_KEYS)
    const dirRaw = pick(row, DIRECTOR_KEYS)
    const directorId = dirRaw ? matchDirector(dirRaw, directors) : undefined
    if (dirRaw && !directorId) unmatched.add(dirRaw)
    out.push({ name, region, directorId, note: pick(row, NOTE_KEYS) || undefined })
  }
  return { rows: out, unmatchedDirectors: Array.from(unmatched) }
}

export async function parseAccountsFile(file: File, directors: Director[]): Promise<ImportResult> {
  const ext = file.name.split('.').pop()?.toLowerCase()
  if (ext === 'xlsx' || ext === 'xls') {
    const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' })
    const sheetName = wb.SheetNames[0]
    const rows = XLSX.utils.sheet_to_json<RawRow>(wb.Sheets[sheetName], { defval: '' })
    return { ...rowsToAccounts(rows, directors), sheetName }
  }
  const text = await file.text()
  const { data } = Papa.parse<RawRow>(text, { header: true, skipEmptyLines: true })
  return rowsToAccounts(data, directors)
}
