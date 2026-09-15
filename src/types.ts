export const UNASSIGNED = 'unassigned'

export interface Director {
  id: string
  name: string
  short: string
  color: string
}

export const DIRECTORS: Director[] = [
  { id: 'peter', name: 'Peter Graves', short: 'Pete', color: '#2563eb' },
  { id: 'hayden', name: 'Hayden Sherriff', short: 'Hayden', color: '#7c3aed' },
  { id: 'dean', name: 'Dean Noronha', short: 'Dean', color: '#059669' },
  { id: 'joey', name: 'Joey Heaney', short: 'Joey', color: '#d97706' },
  { id: 'abi', name: 'Abi Nourai', short: 'Abi', color: '#db2777' },
  { id: 'eric', name: 'Eric Norris', short: 'Eric', color: '#0891b2' },
  { id: 'blake', name: 'Blake Usenick', short: 'Blake', color: '#dc2626' },
]

export const DIRECTOR_PALETTE = ['#4f46e5', '#0d9488', '#ea580c', '#9333ea', '#65a30d', '#be185d', '#0284c7', '#b45309']

export const CSV_LEAD_TO_DIRECTOR: Record<string, string> = {
  pete: 'peter',
  peter: 'peter',
  hayden: 'hayden',
  dean: 'dean',
  joey: 'joey',
  abi: 'abi',
  eric: 'eric',
  'blake u.': 'blake',
  blake: 'blake',
}

export interface Account {
  id: string
  name: string
  region: string
}

export interface Version {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  assignments: Record<string, string>
  notes: Record<string, string>
}
