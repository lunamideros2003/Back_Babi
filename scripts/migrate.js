import { exec, all, ping, closeDatabase, DRIVER } from '../src/db/connection.js';
import { createTables, seedWeeks, ensureDatabase } from '../src/db/index.js';
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
];

async function truncateAll() {
  await exec(`TRUNCATE TABLE ${TABLES.join(', ')} RESTART IDENTITY CASCADE;`);
  console.log('Tables truncated.');
}

async function report() {
  const status = await ping();
  console.log(`Driver: ${status.driver}`);
  console.log('Connection: OK');

  const tables = await all(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' ORDER BY table_name`,
  );

  console.log(`Tables in public: ${tables.length}`);
  for (const table of tables) console.log(`  - ${table.table_name}`);

  const users = await get('SELECT COUNT(*) AS total FROM users');
  const weeks = await get('SELECT COUNT(*) AS total FROM weeks');
  console.log(`Weeks: ${weeks.total}`);
  console.log(`Users: ${users.total}`);

  await reportSecurity();
}

async function reportSecurity() {
  const rows = await all(`
    SELECT c.relname AS table_name, c.relrowsecurity AS rls,
           (SELECT count(*)::int FROM pg_policies p
             WHERE p.schemaname = 'public' AND p.tablename = c.relname) AS policies
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
    ORDER BY c.relname
  `);

  const withoutRls = rows.filter((row) => row.rls !== true);

  console.log('');
  console.log('Security (RLS):');
  for (const row of rows) {
    console.log(`  ${row.rls === true ? 'OK  ' : 'MISSING'} ${row.table_name.padEnd(18)} policies=${row.policies}`);
  }
  console.log('');
  console.log(
    withoutRls.length === 0
      ? 'All tables are protected.'
      : `Still unprotected: ${withoutRls.map((row) => row.table_name).join(', ')}. Run: npm run db:security`,
  );
}

async function get(sql, params) {
  const rows = await all(sql, params);
  return rows[0];
}

async function main() {
  const args = process.argv.slice(2);

  if (DRIVER !== 'postgres') {
    console.error('This command needs DATABASE_URL pointing to Supabase or Postgres.');
    console.error('');
    console.error('Add this to Back_Babi/.env:');
    console.error('  DATABASE_URL=postgresql://user:password@host:5432/postgres');
    console.error('');
    console.error('Copy the full string from Supabase > Project Settings > Database.');
    process.exit(1);
  }

  console.log(`Target: ${env.databaseUrl.replace(/:[^:@/]+@/, ':****@')}`);
  console.log('');

  if (args.includes('--truncate')) {
    await truncateAll();
    return;
  }

  if (args.includes('--report')) {
    await report();
    return;
  }

  if (args.includes('--reset')) {
    await truncateAll();
  }

  console.log('1/3 Creating tables...');
  await createTables();
  console.log('    Done.');

  console.log('2/3 Loading weeks...');
  const seeded = await seedWeeks();
  console.log(`    ${seeded.total} weeks in the database.`);

  console.log('3/3 Verifying...');
  const info = await ensureDatabase();
  console.log(`    Driver ${info.driver}, ${info.weeks} weeks available.`);

  console.log('');
  console.log('Migration complete. Your project now uses Supabase.');
}

try {
  await main();
  await closeDatabase();
} catch (error) {
  console.error('');
  console.error('Migration failed:', error.message);
  console.error('');
  console.error('Check these points:');
  console.error('  - The connection string is correct and has not expired');
  console.error('  - The Supabase project is active');
  console.error('  - Your network allows outbound traffic on port 5432');
  console.error('');
  await closeDatabase();
  process.exit(1);
}
