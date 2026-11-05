import test from 'node:test';
import assert from 'node:assert/strict';

import { trimToLastSentence } from '../src/services/ai/openaiProvider.js';

test('trims a response cut mid-sentence', () => {
  const text =
    'La alimentación variada es la base. Incluye proteínas magras y verduras. ' +
    'Evita los embutidos crudos porque pueden contener listeria y';

  assert.equal(
    trimToLastSentence(text),
    'La alimentación variada es la base. Incluye proteínas magras y verduras.',
  );
});

test('leaves a response that already ends untouched', () => {
  const text = 'Come variado y bebe agua. Consulta siempre a tu obstetra.';

  assert.equal(trimToLastSentence(text), text);
});

test('does not trim when too little text would remain', () => {
  const text = 'Ok. Y después de eso hay una explicación larga sin punto final';

  assert.equal(trimToLastSentence(text), text);
});

test('tolerates empty inputs', () => {
  assert.equal(trimToLastSentence(''), '');
  assert.equal(trimToLastSentence(null), '');
  assert.equal(trimToLastSentence(undefined), '');
});

test('recognizes question marks and exclamations as endings', () => {
  const text =
    '¿Tienes alguna duda sobre lo que puedes comer? ' +
    'Escríbeme y lo vemos con calma sin cortar la frase';

  assert.equal(trimToLastSentence(text), '¿Tienes alguna duda sobre lo que puedes comer?');
});
