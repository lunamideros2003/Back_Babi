const TIMESTAMP_PATTERN = /datetime\(\s*'now'\s*\)/gi;

const PARAM_PATTERN = /(^|[^:'\w]):([a-zA-Z_][a-zA-Z0-9_]*)/g;

export function translateTimestamps(sql) {
  return sql.replace(TIMESTAMP_PATTERN, 'CURRENT_TIMESTAMP');
}

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

export function isMutationWithoutReturning(sql) {
  return /^\s*(update|delete)\s/i.test(sql);
}