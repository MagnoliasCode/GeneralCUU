// Importa supabase-seed.json (14,707 filas, una por territorio) a la tabla
// public.assignments. Usa la Service Role Key para saltar RLS.
//
// Uso:
//   cp .env.admin.example .env.admin   (y llena SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)
//   npm run seed

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { config as loadEnv } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(__dirname, '..', '.env.admin') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Falta SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.admin');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const seedRows = JSON.parse(
  readFileSync(resolve(__dirname, '..', 'supabase-seed.json'), 'utf8')
);

const BATCH_SIZE = 500;

async function run() {
  console.log(`Importando ${seedRows.length} filas a "assignments"...`);
  for (let i = 0; i < seedRows.length; i += BATCH_SIZE) {
    const chunk = seedRows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('assignments').upsert(chunk, { onConflict: 'doc_id' });
    if (error) {
      console.error('Error en lote', i, error.message);
      process.exit(1);
    }
    console.log(`  ${Math.min(i + BATCH_SIZE, seedRows.length)} / ${seedRows.length}`);
  }
  console.log('Listo.');
}

run();
