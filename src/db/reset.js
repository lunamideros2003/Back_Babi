import fs from 'node:fs';
import env from '../config/env.js';

const targets = [env.databaseFile, `${env.databaseFile}-wal`, `${env.databaseFile}-shm`];
let removed = 0;

for (const file of targets) {
  if (fs.existsSync(file)) {
    fs.rmSync(file);
    removed += 1;
  }
}

console.log(`Base de datos eliminada (${removed} archivo/s).`);
console.log('Se recreara automaticamente al iniciar el servidor con: npm run dev');
