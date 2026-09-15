# Territory Planner

Drag-and-drop tool for allocating ANZ accounts to Account Directors.

- Unassigned accounts on the left; one panel per Account Director (Peter Graves, Hayden Sherriff, Dean Noronha, Joey Heaney, Abi Nourai, Eric Norris, Blake Usenick).
- Drag single or multi-selected (Shift/Ctrl-click) accounts between panels; add a justification note per account.
- Save, rename, duplicate and delete named versions (stored in the browser; export/import as JSON to share).
- Export to CSV, Excel (.xlsx), PDF, or copy a table for pasting into Google Sheets.

Static web app — no backend. Seed data lives in `public/accounts.csv`.

```sh
npm install
npm run dev     # http://localhost:5173
npm run build   # static output in dist/
```
