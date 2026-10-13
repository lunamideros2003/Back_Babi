import { exec, run, all, ping, closeDatabase, DRIVER } from './connection.js';
import { postgresSchema } from './schema.postgres.js';
import { createTables, seedWeeks, ensureDatabase } from './index.js';
import env from '../config/env.js';

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
  console.log('Tablas vaciadas.');
}

async function report() {
  const status = await ping();
  console.log(`Driver: ${status.driver}`);
  console.log('Conexion: OK');

  const tables = await all(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' ORDER BY table_name`,
  );

  console.log(`Tablas en public: ${tables.length}`);
  for (const table of tables) console.log(`  - ${table.table_name}`);

  const users = await get('SELECT COUNT(*) AS total FROM users');
  const weeks = await get('SELECT COUNT(*) AS total FROM weeks');
  console.log(`Semanas: ${weeks.total}`);
  console.log(`Usuarios: ${users.total}`);
}

async function get(sql, params) {
  const rows = await all(sql, params);
  return rows[0];
}

async function main() {
  const args = process.argv.slice(2);

  if (DRIVER !== 'postgres') {
    console.error('Este comando necesita DATABASE_URL apuntando a Supabase o Postgres.');
    console.error('');
    console.error('Agrega esto a Back_Babi/.env:');
    console.error('  DATABASE_URL=postgresql://usuario:clave@host:5432/postgres');
    console.error('');
    console.error('La cadena completa la copias en Supabase > Project Settings > Database.');
    process.exit(1);
  }

  console.log(`Objetivo: ${env.databaseUrl.replace(/:[^:@/]+@/, ':****@')}`);
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

  console.log('1/3 Creando tablas...');
  await createTables();
  console.log('    Listo.');

  console.log('2/3 Cargando las 40 semanas...');
  const seeded = await seedWeeks();
  console.log(`    ${seeded.total} semanas en la base.`);

  console.log('3/3 Verificando...');
  const info = await ensureDatabase();
  console.log(`    Driver ${info.driver}, ${info.weeks} semanas disponibles.`);

  console.log('');
  console.log('Migracion completada. Tu proyecto ya usa Supabase.');
}

try {
  await main();
  await closeDatabase();
} catch (error) {
  console.error('');
  console.error('La migracion fallo:', error.message);
  console.error('');
  console.error('Revisa estos puntos:');
  console.error('  - La cadena de conexion es correcta y no expira');
  console.error('  - El proyecto de Supabase esta activo');
  console.error('  - Tu red permite salir al puerto 5432');
  console.error('');
  await closeDatabase();
  process.exit(1);
}

void run;
void postgresSchema;