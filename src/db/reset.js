import fs from 'node:fs';
import env from '../config/env.js';

const targets = [
  env.databaseFile,
  `${env.databaseFile}-wal`,
  `${env.databaseFile}-shm`,
];

if (env.databaseUrl) {
  console.log('DATABASE_URL is set: nothing is deleted because the database lives in Supabase.');
  console.log('To wipe the remote database, use the Supabase SQL Editor or run:');
  console.log('  npm run db:migrate -- --truncate');
} else {
  let removed = 0;

  for (const file of targets) {
    if (fs.existsSync(file)) {
      fs.rmSync(file);
      removed += 1;
    }
  }

  console.log(`Local database deleted (${removed} file/s).`);
  console.log('It will be recreated automatically when the server starts with: npm run dev');
}
