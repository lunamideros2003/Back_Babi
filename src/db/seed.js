import { createTables, seedWeeks, ensureDatabase } from './index.js';
import { closeDatabase, DRIVER } from './connection.js';

try {
  await createTables();

  const result = await seedWeeks();

  console.log(`Driver: ${DRIVER}`);
  console.log(`Semanas cargadas: ${result.total}`);
} catch (error) {
  console.error('No se pudieron cargar las semanas:', error.message);
  process.exitCode = 1;
} finally {
  await closeDatabase();
}