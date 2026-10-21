import { exec, all, closeDatabase, DRIVER } from '../src/db/connection.js';
import env from '../src/config/env.js';

/*
  Activa Row Level Security en todas las tablas de public.

  Sin RLS, cualquier persona con la clave anon del proyecto puede leer y
  escribir las tablas directamente desde la API de Supabase, saltandose por
  completo el backend y sus comprobaciones.

  El backend entra como postgres, que tiene bypassrls, asi que sigue
  funcionando igual. Lo que se bloquea es el acceso directo por API.
*/

const TABLES = [
  'bot_answers',
  'bot_sessions',
  'symptom_logs',
  'checkup_logs',
  'chat_messages',
  'reminders',
  'appointments',
  'weeks',
  'pregnancies',
  'users',
  'journal_entries',
];

async function enableRls() {
  for (const table of TABLES) {
    await exec(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY;`);
    console.log(`  RLS activado: ${table}`);
  }
}

async function dropPolicies() {
  const policies = await all(
    `SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public'`,
  );

  for (const policy of policies) {
    await exec(
      `DROP POLICY IF EXISTS "${policy.policyname}" ON public."${policy.tablename}";`,
    );
    console.log(`  Politica eliminada: ${policy.policyname} (${policy.tablename})`);
  }
}

async function createPolicies() {
  for (const table of TABLES) {
    // Politica que no permite nada a anon ni a authenticated. El backend no
    // pasa por aqui: entra por la conexion de Postgres, con bypassrls.
    await exec(`
      CREATE POLICY "solo_el_backend" ON public.${table}
      AS RESTRICTIVE
      FOR ALL
      TO anon, authenticated
      USING (false)
      WITH CHECK (false);
    `);
  }
  console.log(`  Politica restrictiva creada en ${TABLES.length} tablas.`);
}

async function report() {
  const rows = await all(`
    SELECT c.relname AS tabla,
           c.relrowsecurity AS rls,
           (SELECT count(*)::int FROM pg_policies p
             WHERE p.schemaname = 'public' AND p.tablename = c.relname) AS politicas
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
    ORDER BY c.relname
  `);

  let pendientes = 0;
  console.log('');
  for (const row of rows) {
    const ok = row.rls === true;
    if (!ok) pendientes += 1;
    console.log(`  ${ok ? 'OK  ' : 'FALTA'} ${row.tabla.padEnd(18)} rls=${row.rls} politicas=${row.politicas}`);
  }
  console.log('');
  console.log(pendientes === 0 ? 'Todas las tablas tienen RLS activo.' : `${pendientes} tablas sin RLS.`);

  return pendientes;
}

async function main() {
  if (DRIVER !== 'postgres') {
    console.error('Este comando necesita DATABASE_URL apuntando a Supabase o Postgres.');
    process.exit(1);
  }

  console.log(`Objetivo: ${env.databaseUrl.replace(/:[^:@/]+@/, ':****@')}`);
  console.log('');

  const args = process.argv.slice(2);

  if (args.includes('--report')) {
    await report();
    return;
  }

  console.log('1/3 Activando RLS...');
  await enableRls();

  console.log('2/3 Limpiando politicas anteriores...');
  await dropPolicies();

  console.log('3/3 Creando politica restrictiva...');
  await createPolicies();

  console.log('');
  const pendientes = await report();
  if (pendientes > 0) process.exit(1);
}

try {
  await main();
  await closeDatabase();
} catch (error) {
  console.error('No se pudo aplicar la seguridad:', error.message);
  await closeDatabase();
  process.exit(1);
}
