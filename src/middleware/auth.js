import { verifyToken } from '../utils/token.js';
import { UnauthorizedError } from '../utils/errors.js';
import * as repo from '../repositories/index.js';

export function requireAuth(req, _res, next) {
  try {
    const header = req.headers.authorization ?? '';
    const [scheme, token] = header.split(' ');

    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedError('Falta el token de autenticacion.');
    }

    const payload = verifyToken(token);
    const user = repo.findById(payload.sub);

    if (!user) throw new UnauthorizedError('La sesion ya no es valida.');

    req.user = user;
    next();
  } catch (error) {
    if (error instanceof UnauthorizedError) return next(error);
    return next(new UnauthorizedError('Token invalido o expirado.'));
  }
}
