/*
  Limite de peticiones por usuario.

  La IA gratuita de Groq tiene un tope de peticiones por minuto. Si alguien
  deja el bot dando vueltas, se quedan sin cuota las demas personas. Este
  modulo avisa con un 429 cuando se pasa del limite.

  El contador vive en memoria: al reiniciar el servidor empieza de cero, que
  es justo lo que interesa para no castigar a quien lleva un rato usando la
  aplicacion.
*/

const VENTANA_MS = 60_000;

const peticiones = new Map();

/** Limpia las entradas que ya han salido de la ventana de tiempo. */
function purgar(ahora) {
  for (const [clave, registro] of peticiones) {
    if (ahora - registro.inicio > VENTANA_MS) peticiones.delete(clave);
  }
}

/**
 * Devuelve true si la peticion puede pasar.
 *
 * @param {string} clave identifica a quien pregunta, por ejemplo el id de
 *   la usuaria. Se puede anteponer un prefijo para tener contadores
 *   separados por tipo de ruta.
 */
export function consume(clave, limite) {
  const ahora = Date.now();
  purgar(ahora);

  const registro = peticiones.get(clave);

  if (!registro || ahora - registro.inicio > VENTANA_MS) {
    peticiones.set(clave, { inicio: ahora, total: 1 });
    return true;
  }

  if (registro.total >= limite) return false;

  registro.total += 1;
  return true;
}

/** Devuelve cuanto falta para que se libere el limite. */
export function reintentarEn(clave) {
  const registro = peticiones.get(clave);
  if (!registro) return 0;

  const pasado = Date.now() - registro.inicio;
  return Math.max(0, Math.ceil((VENTANA_MS - pasado) / 1000));
}

/** Borra el contador de una clave. Se usa al cerrar sesion. */
export function olvidar(clave) {
  peticiones.delete(clave);
}

/** Vacia todos los contadores. */
export function resetear() {
  peticiones.clear();
}
