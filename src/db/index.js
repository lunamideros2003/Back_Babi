import { db, run, get } from './connection.js';
import { schema } from './schema.js';
import weeks from './data/weeks.js';

export function createTables() {
  db.exec(schema);
}

export function seedWeeks() {
  const upsert = db.prepare(`
    INSERT INTO weeks (
      week_number, title, summary, baby_development, mother_changes,
      size_comparison, typical_weight, typical_length,
      tips, food_focus, exercise_tip, checkup_focus
    ) VALUES (
      :week_number, :title, :summary, :baby_development, :mother_changes,
      :size_comparison, :typical_weight, :typical_length,
      :tips, :food_focus, :exercise_tip, :checkup_focus
    )
    ON CONFLICT(week_number) DO UPDATE SET
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
      checkup_focus = excluded.checkup_focus
  `);

  for (const week of weeks) upsert.run(week);

  return get('SELECT COUNT(*) AS total FROM weeks');
}

export function ensureDatabase() {
  createTables();
  const existing = Number(get('SELECT COUNT(*) AS total FROM weeks')?.total ?? 0);
  if (existing < weeks.length) seedWeeks();
}

export { run, get };
export default ensureDatabase;
