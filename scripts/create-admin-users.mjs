// Crea usuarios directamente en Supabase Auth (no hay registro público: el admin
// los precarga aquí). Usa la Service Role Key, nunca la anon key.
//
// Uso:
//   cp .env.admin.example .env.admin   (y llena SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)
//   npm run create-admins

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

// 3 usuarios precargados de ejemplo. Cambia el correo/contraseña como quieras
// antes de correr el script, o entra después a Authentication > Users en
// Supabase y edítalos / agrega más.
const USERS = [
  { email: 'admin1@territorios.local', password: '#qdKq3XiKTyASy' },
  { email: 'admin2@territorios.local', password: 'ZKGm9%MZ2wmhR9' },
  { email: 'admin3@territorios.local', password: 'anr7swEZT#zLg3' },
];

async function run() {
  for (const u of USERS) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
    });
    if (error) {
      console.error(`✗ ${u.email}: ${error.message}`);
    } else {
      console.log(`✓ ${u.email} creado (id: ${data.user.id})`);
    }
  }
}

run();
