// Convierte supabase-seed.json a supabase-seed.csv, para importarlo desde
// Supabase Dashboard > Table Editor > assignments > Insert > Import data from CSV
// (el importador de la interfaz solo acepta CSV, no JSON).
//
// Uso: npm run convert:csv

const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '..', 'supabase-seed.json');
const OUT = path.resolve(__dirname, '..', 'supabase-seed.csv');

const COLUMNS = [
  'doc_id',
  'layer',
  'territory_id',
  'label',
  'responsable',
  'prioritario',
  'pendiente',
  'updated_at',
  'updated_by',
];

function escapeCsv(value) {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

const rows = JSON.parse(fs.readFileSync(SRC, 'utf8'));
const lines = [COLUMNS.join(',')];
for (const row of rows) {
  lines.push(COLUMNS.map((c) => escapeCsv(row[c])).join(','));
}

fs.writeFileSync(OUT, lines.join('\n'));
console.log(`Escritas ${rows.length} filas en ${OUT}`);
console.log('Tamaño KB:', (fs.statSync(OUT).size / 1024).toFixed(1));
