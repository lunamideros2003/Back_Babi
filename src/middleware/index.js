import { AppError, ValidationError } from '../utils/errors.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DATETIME_PATTERN = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2})?/;

function isEmpty(value) {
  return value === undefined || value === null || value === '';
}

export function validate(schema) {
  return (req, _res, next) => {
    const body = req.body ?? {};
    const errors = [];
    const clean = {};

    for (const [field, rules] of Object.entries(schema)) {
      const raw = body[field];

      if (rules.required && isEmpty(raw)) {
        errors.push({ field, message: 'Este campo es obligatorio.' });
        continue;
      }

      if (isEmpty(raw)) {
        if (rules.default !== undefined) clean[field] = rules.default;
        continue;
      }

      switch (rules.type) {
        case 'email':
          if (!EMAIL_PATTERN.test(raw)) errors.push({ field, message: 'Correo no valido.' });
          else clean[field] = raw.toLowerCase().trim();
          break;
        case 'string':
          if (rules.min && raw.length < rules.min) {
            errors.push({ field, message: `Debe tener al menos ${rules.min} caracteres.` });
          } else if (rules.max && raw.length > rules.max) {
            errors.push({ field, message: `Debe tener maximo ${rules.max} caracteres.` });
          } else {
            clean[field] = String(raw).trim();
          }
          break;
        case 'date':
          if (!DATE_PATTERN.test(raw)) errors.push({ field, message: 'Usa el formato AAAA-MM-DD.' });
          else clean[field] = raw;
          break;
        case 'datetime':
          if (!DATETIME_PATTERN.test(raw)) {
            errors.push({ field, message: 'Usa el formato AAAA-MM-DDTHH:MM.' });
          } else {
            clean[field] = raw.replace(' ', 'T');
          }
          break;
        case 'number': {
          const parsed = Number(raw);
          if (Number.isNaN(parsed)) errors.push({ field, message: 'Debe ser un numero.' });
          else if (rules.min !== undefined && parsed < rules.min) {
            errors.push({ field, message: `El valor minimo es ${rules.min}.` });
          } else if (rules.max !== undefined && parsed > rules.max) {
            errors.push({ field, message: `El valor maximo es ${rules.max}.` });
          } else clean[field] = parsed;
          break;
        }
        case 'boolean':
          clean[field] = raw === true || raw === 'true' || raw === 1 || raw === '1';
          break;
        default:
          clean[field] = raw;
      }
    }

    if (errors.length > 0) return next(new ValidationError(errors));

    req.validated = clean;
    next();
  };
}

export function notFound(_req, _res, next) {
  next(new AppError('Ruta no encontrada.', 404, 'ROUTE_NOT_FOUND'));
}

export function errorHandler(error, _req, res, _next) {
  const statusCode = error.statusCode ?? 500;

  if (statusCode >= 500) {
    console.error('[error]', error);
  }

  res.status(statusCode).json({
    ok: false,
    error: {
      code: error.code ?? 'INTERNAL_ERROR',
      message:
        statusCode >= 500 ? 'Ocurrio un error inesperado. Intenta de nuevo.' : error.message,
      details: error.details ?? null,
    },
  });
}
