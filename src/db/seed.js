import { createTables, seedWeeks } from './index.js';
import { closeDatabase } from './connection.js';

createTables();
const result = seedWeeks();

console.log(`Semanas cargadas: ${result.total}`);
closeDatabase();
