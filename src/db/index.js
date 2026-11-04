import { exec, run, get, ping, withRetry, DRIVER } from './connection.js';
import { schema } from './schema.js';
import { postgresSchema } from './schema.postgres.js';
import weeks from './data/weeks.js';

/**
 * State of the database at boot.
 *
 * The HTTP service must come up even when the database is unreachable, so a
 * broken connection shows up as a readable diagnostic in `/api/health` and in
 * the logs instead of a container that keeps restarting.
 */
export const bootState = {
  database: { ready: false, driver: DRIVER, error: null, weeks: 0 },
};

export async function createTables() {
  const definition = DRIVER === 'postgres' ? postgresSchema : schema;
  await exec(definition);
}

export async function seedWeeks() {
  for (const week of weeks) {
    await run(
      `INSERT INTO weeks (
         week_number, title, summary, baby_development, mother_changes,
         size_comparison, typical_weight, typical_length,
         tips, food_focus, exercise_tip, checkup_focus
       ) VALUES (
         :week_number, :title, :summary, :baby_development, :mother_changes,
         :size_comparison, :typical_weight, :typical_length,
         :tips, :food_focus, :exercise_tip, :checkup_focus
       )
       ON CONFLICT (week_number) DO UPDATE SET
         title = excluded.title,
         summary = excluded.summary,
         baby_development = excluded.baby_development,
         mother_changes = excluded.mother_changes,
         size_comparison = excluded.size_comparison,
         typical_weight = excluded.typical_weight,
         typical_length = excluded.typical_length,
         tips = excluded.tips,
         food_focus = excluded.food_focus,
         exercise_tip = excluded.exercise_tip,
         checkup_focus = excluded.checkup_focus`,
      week,
    );
  }

  return await get('SELECT COUNT(*) AS total FROM weeks');
}

/**
 * Deja el contenido educativo al dia. Se ejecuta en cada arranque porque el
 * texto cambia con el tiempo (por ejemplo, los tamaños de comparación) y el
 * upsert no toca los datos de las usuarias.
 */
export async function refreshWeeks() {
  await seedWeeks();
  const result = await get('SELECT COUNT(*) AS total FROM weeks');
  return Number(result?.total ?? 0);
}

export async function ensureDatabase() {
  // The first connection after a cold start can be refused while the pooler
  // wakes up, so the whole bootstrap is retried instead of crashing at once.
  return await withRetry(async () => {
    await createTables();

    const total = await refreshWeeks();

    return { driver: DRIVER, weeks: total, connection: await ping() };
  });
}

export { DRIVER };
export default ensureDatabase;