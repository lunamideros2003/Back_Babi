import test from 'node:test';
import assert from 'node:assert/strict';
import { buildGuide } from '../src/services/guideService.js';
import { knowledgeBase } from '../src/services/ai/knowledgeBase.js';

test('la guia tiene las cuatro categorias previstas', () => {
  const guide = buildGuide();

  assert.equal(guide.categories.length, 4);
  assert.deepEqual(
    guide.categories.map((c) => c.id),
    ['alimentacion', 'sintomas', 'controles', 'emocional'],
  );
});

test('cada categoria trae titulo, descripcion y articulos', () => {
  for (const category of buildGuide().categories) {
    assert.ok(category.label.length > 0);
    assert.ok(category.description.length > 0);
    assert.ok(category.items.length > 0, `la categoria ${category.id} no puede quedar vacia`);
  }
});

test('ningun articulo de la base se pierde al agrupar', () => {
  const guide = buildGuide();
  const total = guide.categories.reduce((sum, c) => sum + c.items.length, 0);

  assert.equal(total, knowledgeBase.length);
  assert.equal(guide.total, knowledgeBase.length);
});

test('los articulos tienen id, titulo, contenido y etiquetas', () => {
  for (const category of buildGuide().categories) {
    for (const item of category.items) {
      assert.ok(item.id.length > 0);
      assert.ok(item.title.length > 0);
      assert.ok(item.content.length > 0);
      assert.ok(Array.isArray(item.tags));
    }
  }
});

test('los titulos no se quedan en minusculas', () => {
  for (const category of buildGuide().categories) {
    for (const item of category.items) {
      assert.match(item.title, /[A-Z]/, `el titulo "${item.title}" debe empezar en mayuscula`);
    }
  }
});

test('los ids de los articulos no se repiten', () => {
  const ids = buildGuide().categories.flatMap((c) => c.items.map((i) => i.id));

  assert.equal(new Set(ids).size, ids.length);
});
