import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import Papa from 'papaparse'
import { UNASSIGNED, type Account, type Director } from './types'

export interface ExportInput {
  accounts: Account[]
  assignments: Record<string, string>
  notes: Record<string, string>
  versionName: string
  directors: Director[]
}

interface Row {
  Account: string
  Region: string
  'ICP Score': number | ''
  'Account Director': string
  Justification: string
}


const nameOf = (directors: Director[], id: string) => directors.find((d) => d.id === id)?.name ?? 'Unassigned'

export function buildRows({ accounts, assignments, notes, directors }: ExportInput): Row[] {
  const order = [...directors.map((d) => d.id), UNASSIGNED]
  return [...accounts]
    .sort((a, b) => {
      const da = order.indexOf(assignments[a.id] ?? UNASSIGNED)
      const db = order.indexOf(assignments[b.id] ?? UNASSIGNED)
      return da - db || a.name.localeCompare(b.name)
    })
    .map((a) => ({
      Account: a.name,
      Region: a.region,
      'ICP Score': a.details?.icp ?? '',
      'Account Director': nameOf(directors, assignments[a.id] ?? UNASSIGNED),
      Justification: notes[a.id] ?? '',
    }))
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const fileBase = (name: string) => `territory-plan-${name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`

export function exportCsv(input: ExportInput) {
  const csv = Papa.unparse(buildRows(input))
  download(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `${fileBase(input.versionName)}.csv`)
}

export function exportExcel(input: ExportInput) {
  const rows = buildRows(input)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'All accounts')

  const summary = [...input.directors.map((d) => d.id), UNASSIGNED].map((id) => {
    const mine = input.accounts.filter((a) => (input.assignments[a.id] ?? UNASSIGNED) === id)
    return {
      'Account Director': nameOf(input.directors, id),
      Accounts: mine.length,
      AU: mine.filter((a) => a.region === 'AU').length,
      NZ: mine.filter((a) => a.region === 'NZ').length,
      Other: mine.filter((a) => a.region !== 'AU' && a.region !== 'NZ').length,
    }
  })
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summary), 'Summary')

  for (const d of input.directors) {
    const mine = rows.filter((r) => r['Account Director'] === d.name)
    if (mine.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(mine), d.name.slice(0, 31))
  }
  XLSX.writeFile(wb, `${fileBase(input.versionName)}.xlsx`)
}

export function exportPdf(input: ExportInput) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt' })
  doc.setFontSize(18)
  doc.text('Territory Plan', 40, 50)
  doc.setFontSize(11)
  doc.setTextColor(100)
  doc.text(`${input.versionName} · exported ${new Date().toLocaleString()}`, 40, 68)

  const summary = [...input.directors.map((d) => d.id), UNASSIGNED].map((id) => {
    const mine = input.accounts.filter((a) => (input.assignments[a.id] ?? UNASSIGNED) === id)
    return [nameOf(input.directors, id), String(mine.length), mine.map((a) => a.name).join(', ')]
  })
  autoTable(doc, {
    startY: 85,
    head: [['Account Director', '#', 'Accounts']],
    body: summary,
    styles: { fontSize: 9, cellPadding: 5 },
    headStyles: { fillColor: [30, 41, 59] },
    columnStyles: { 0: { cellWidth: 110 }, 1: { cellWidth: 30, halign: 'center' } },
  })

  doc.addPage()
  doc.setFontSize(14)
  doc.setTextColor(30)
  doc.text('All accounts', 40, 50)
  autoTable(doc, {
    startY: 65,
    head: [['Account', 'Region', 'ICP', 'Account Director', 'Justification']],
    body: buildRows(input).map((r) => [r.Account, r.Region, String(r['ICP Score']), r['Account Director'], r.Justification]),
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: [30, 41, 59] },
  })
  doc.save(`${fileBase(input.versionName)}.pdf`)
}

export async function copyForGoogleSheets(input: ExportInput): Promise<void> {
  const rows = buildRows(input)
  const header = Object.keys(rows[0] ?? { Account: '', Region: '', 'ICP Score': '', 'Account Director': '', Justification: '' })
  const tsv = [header.join('\t'), ...rows.map((r) => header.map((h) => r[h as keyof Row]).join('\t'))].join('\n')
  await navigator.clipboard.writeText(tsv)
}
