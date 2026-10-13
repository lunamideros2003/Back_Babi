/**
 * Translates the shared SQL dialect into the target driver.
 *
 * The application writes one dialect: named parameters (`:userId`) and
 * `datetime('now')`. SQLite understands it natively; PostgreSQL needs named
 * parameters rewritten to positional ones and its own timestamp function.
 */

const TIMESTAMP_PATTERN = /datetime\(\s*'now'\s*\)/gi;

/** Matches `:name` but not `::` casts or text inside string literals. */
const PARAM_PATTERN = /(^|[^:'\w]):([a-zA-Z_][a-zA-Z0-9_]*)/g;

export function translateTimestamps(sql) {
  return sql.replace(TIMESTAMP_PATTERN, 'CURRENT_TIMESTAMP');
}

/**
 * Rewrites `:name` placeholders to `$1, $2, ...` and returns the values in the
 * same order. A name that appears more than once reuses the same position,
 * which is what PostgreSQL expects. Parameters absent from the object become
 * `null`, matching how both drivers treat a missing named parameter.
 */
export function toPositionalParameters(sql, params = {}) {
  const values = [];
  const positions = new Map();

  const rewritten = sql.replace(PARAM_PATTERN, (match, prefix, name) => {
    if (positions.has(name)) return `${prefix}$${positions.get(name)}`;

    if (name in params) values.push(params[name]);
    else values.push(null);

    const position = values.length;
    positions.set(name, position);

    return `${prefix}$${position}`;
  });

  return { sql: rewritten, values };
}

/**
 * SQLite returns the id of the new row through `lastInsertRowid`. PostgreSQL
 * needs it to be asked for explicitly, so INSERT statements get RETURNING id.
 */
export function addReturningId(sql) {
  if (!/^\s*insert\s/i.test(sql)) return sql;
  if (/\breturning\b/i.test(sql)) return sql;
  return `${sql}\nRETURNING id`;
}

export function toPostgres(sql, params = {}) {
  const withoutTimestamps = translateTimestamps(sql);
  const positional = toPositionalParameters(withoutTimestamps, params);
  return {
    sql: addReturningId(positional.sql),
    values: positional.values,
  };
}

/** True when the statement changes rows without inserting one. */
export function isMutationWithoutReturning(sql) {
  return /^\s*(update|delete)\s/i.test(sql);
}