import test from 'node:test';
import assert from 'node:assert/strict';
import { buildGuide } from '../src/services/guideService.js';
import { knowledgeBase } from '../src/services/ai/knowledgeBase.js';

test('the guide has the four planned categories', () => {
  const guide = buildGuide();

  assert.equal(guide.categories.length, 4);
  assert.deepEqual(
    guide.categories.map((c) => c.id),
    ['alimentacion', 'sintomas', 'controles', 'emocional'],
  );
});

test('each category brings a title, description and articles', () => {
  for (const category of buildGuide().categories) {
    assert.ok(category.label.length > 0);
    assert.ok(category.description.length > 0);
    assert.ok(category.items.length > 0, `la categoria ${category.id} no puede quedar vacia`);
  }
});

test('no article from the base is lost when grouping', () => {
  const guide = buildGuide();
  const total = guide.categories.reduce((sum, c) => sum + c.items.length, 0);

  assert.equal(total, knowledgeBase.length);
  assert.equal(guide.total, knowledgeBase.length);
});

test('articles have id, title, content and tags', () => {
  for (const category of buildGuide().categories) {
    for (const item of category.items) {
      assert.ok(item.id.length > 0);
      assert.ok(item.title.length > 0);
      assert.ok(item.content.length > 0);
      assert.ok(Array.isArray(item.tags));
    }
  }
});

test('titles do not stay lowercase', () => {
  for (const category of buildGuide().categories) {
    for (const item of category.items) {
      assert.match(item.title, /[A-Z]/, `el titulo "${item.title}" debe empezar en mayuscula`);
    }
  }
});

test('article ids do not repeat', () => {
  const ids = buildGuide().categories.flatMap((c) => c.items.map((i) => i.id));

  assert.equal(new Set(ids).size, ids.length);
});
