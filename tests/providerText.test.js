import test from 'node:test';
import assert from 'node:assert/strict';

import { trimToLastSentence } from '../src/services/ai/openaiProvider.js';

test('recorta una respuesta cortada a mitad de frase', () => {
  const texto =
    'La alimentación variada es la base. Incluye proteínas magras y verduras. ' +
    'Evita los embutidos crudos porque pueden contener listeria y';

  assert.equal(
    trimToLastSentence(texto),
    'La alimentación variada es la base. Incluye proteínas magras y verduras.',
  );
});

test('deja intacta una respuesta que ya termina', () => {
  const texto = 'Come variado y bebe agua. Consulta siempre a tu obstetra.';

  assert.equal(trimToLastSentence(texto), texto);
});

test('no recorta si quedaria demasiado poco texto', () => {
  const texto = 'Ok. Y después de eso hay una explicación larga sin punto final';

  assert.equal(trimToLastSentence(texto), texto);
});

test('tolera entradas vacias', () => {
  assert.equal(trimToLastSentence(''), '');
  assert.equal(trimToLastSentence(null), '');
  assert.equal(trimToLastSentence(undefined), '');
});

test('reconoce preguntas y exclamaciones como final', () => {
  const texto =
    '¿Tienes alguna duda sobre lo que puedes comer? ' +
    'Escríbeme y lo vemos con calma sin cortar la frase';

  assert.equal(trimToLastSentence(texto), '¿Tienes alguna duda sobre lo que puedes comer?');
});
