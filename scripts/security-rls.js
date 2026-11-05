import { exec, all, closeDatabase, DRIVER } from '../src/db/connection.js';
import env from '../src/config/env.js';

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
    console.log(`  RLS enabled: ${table}`);
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
    console.log(`  Policy removed: ${policy.policyname} (${policy.tablename})`);
  }
}

async function createPolicies() {
  for (const table of TABLES) {

    await exec(`
      CREATE POLICY "backend_only" ON public.${table}
      AS RESTRICTIVE
      FOR ALL
      TO anon, authenticated
      USING (false)
      WITH CHECK (false);
    `);
  }
  console.log(`  Restrictive policy created on ${TABLES.length} tables.`);
}

async function report() {
  const rows = await all(`
    SELECT c.relname AS table_name,
           c.relrowsecurity AS rls,
           (SELECT count(*)::int FROM pg_policies p
             WHERE p.schemaname = 'public' AND p.tablename = c.relname) AS policies
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
    ORDER BY c.relname
  `);

  let missing = 0;
  console.log('');
  for (const row of rows) {
    const ok = row.rls === true;
    if (!ok) missing += 1;
    console.log(`  ${ok ? 'OK  ' : 'MISSING'} ${row.table_name.padEnd(18)} rls=${row.rls} policies=${row.policies}`);
  }
  console.log('');
  console.log(missing === 0 ? 'All tables have RLS enabled.' : `${missing} tables without RLS.`);

  return missing;
}

async function main() {
  if (DRIVER !== 'postgres') {
    console.error('This command needs DATABASE_URL pointing to Supabase or Postgres.');
    process.exit(1);
  }

  console.log(`Target: ${env.databaseUrl.replace(/:[^:@/]+@/, ':****@')}`);
  console.log('');

  const args = process.argv.slice(2);

  if (args.includes('--report')) {
    await report();
    return;
  }

  console.log('1/3 Enabling RLS...');
  await enableRls();

  console.log('2/3 Dropping previous policies...');
  await dropPolicies();

  console.log('3/3 Creating the restrictive policy...');
  await createPolicies();

  console.log('');
  const missing = await report();
  if (missing > 0) process.exit(1);
}

try {
  await main();
  await closeDatabase();
} catch (error) {
  console.error('Could not apply security:', error.message);
  await closeDatabase();
  process.exit(1);
}
