import fs from 'node:fs';
import env from '../config/env.js';

const targets = [
  env.databaseFile,
  `${env.databaseFile}-wal`,
  `${env.databaseFile}-shm`,
];

let removed = 0;

for (const file of targets) {
  if (fs.existsSync(file)) {
    fs.rmSync(file);
    removed += 1;
  }
}

if (env.databaseUrl) {
  console.log('DATABASE_URL esta definido: no se borra nada porque la base esta en Supabase.');
  console.log('Para vaciar la base remota, usa el SQL Editor de Supabase o ejecuta:');
  console.log('  npm run db:migrate -- --truncate');
} else {
  console.log(`Base de datos local eliminada (${removed} archivo/s).`);
  console.log('Se recreara automaticamente al iniciar el servidor con: npm run dev');
}

void ensureDatabase;