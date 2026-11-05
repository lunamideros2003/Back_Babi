import test from 'node:test';
import assert from 'node:assert/strict';
import { questions, getQuestionByIndex, getQuestionById, TOTAL_QUESTIONS } from '../src/services/bot/questionBank.js';
import {
  localFeedbackFor,
  weekForTrimester,
  scoreFromAnswers,
  buildSummaryText,
  getWeekData,
} from '../src/services/bot/botService.js';

test('the bank has 10 questions with unique ids and increasing order', () => {
  assert.equal(TOTAL_QUESTIONS, 10);
  assert.equal(new Set(questions.map((q) => q.id)).size, 10);

  questions.forEach((question, index) => {
    assert.equal(question.order, index + 1);
    assert.ok(question.text.length > 10);
    assert.ok(['single', 'multi', 'scale', 'text'].includes(question.type));
  });
});

test('getQuestionByIndex walks the whole bank', () => {
  for (let index = 0; index < TOTAL_QUESTIONS; index += 1) {
    const question = getQuestionByIndex(index);
    assert.ok(question, `sin pregunta en el indice ${index}`);
    assert.equal(question.order, index + 1);
  }
  assert.equal(getQuestionByIndex(99), null);
  assert.equal(getQuestionById('no_existe'), null);
});

test('choice questions bring a valid list', () => {
  for (const question of questions) {
    if (question.type === 'single' || question.type === 'multi') {
      assert.ok(Array.isArray(question.options), `${question.id} sin opciones`);
      assert.ok(question.options.length >= 2, `${question.id} necesita al menos dos opciones`);
      for (const option of question.options) {
        assert.ok(option.value);
        assert.ok(option.label);
      }
    }
  }
});

test('the energy scale goes from 1 to 5', () => {
  const energy = getQuestionById('q_energy');
  assert.equal(energy.min, 1);
  assert.equal(energy.max, 5);
  assert.equal(energy.type, 'scale');
});

test('local feedback responds based on the scale value', () => {
  const energy = getQuestionById('q_energy');
  const low = localFeedbackFor(energy, 1);
  const mid = localFeedbackFor(energy, 3);
  const high = localFeedbackFor(energy, 5);

  assert.match(low, /energia baja/i);
  assert.notEqual(low, mid);
  assert.notEqual(mid, high);
});

test('local feedback combines several symptoms', () => {
  const question = getQuestionById('q_symptoms');
  const single = localFeedbackFor(question, ['nauseas']);
  const multiple = localFeedbackFor(question, ['nauseas', 'insomnio']);

  assert.ok(single.length > 20);
  assert.ok(multiple.length > single.length, 'varios sintomas deben dar mas texto');
  assert.match(localFeedbackFor(question, ['ninguno']), /bien/i);
});

test('feedback never prescribes or diagnoses', () => {
  const banned = /diagnostic|recet|medicament|dosis|pastilla/;

  for (const question of questions) {
    if (question.type === 'single' || question.type === 'multi') {
      for (const option of question.options) {
        assert.doesNotMatch(localFeedbackFor(question, option.value), banned, question.id);
      }
    }
    if (question.type === 'scale') {
      for (let n = question.min; n <= question.max; n += 1) {
        assert.doesNotMatch(localFeedbackFor(question, n), banned, question.id);
      }
    }
    if (question.type === 'text') {
      assert.doesNotMatch(localFeedbackFor(question, 'estoy sangrando'), banned);
    }
  }
});

test('the trimester maps to a reference week', () => {
  assert.equal(weekForTrimester('1-13'), 8);
  assert.equal(weekForTrimester('14-27'), 20);
  assert.equal(weekForTrimester('28-40'), 34);
  assert.equal(weekForTrimester('otro'), null);
});

test('the score rises with better habits and never exceeds 12', () => {
  const bad = [
    { question_id: 'q_vitamins', answer_value: 'no' },
    { question_id: 'q_food', answer_value: '1-2' },
    { question_id: 'q_exercise', answer_value: 'no' },
    { question_id: 'q_checkup', answer_value: 'no' },
    { question_id: 'q_energy', answer_value: '1' },
  ];

  const good = [
    { question_id: 'q_vitamins', answer_value: 'yes' },
    { question_id: 'q_food', answer_value: '4-5' },
    { question_id: 'q_exercise', answer_value: 'yes' },
    { question_id: 'q_checkup', answer_value: 'yes' },
    { question_id: 'q_symptoms', answer_value: 'ninguno' },
    { question_id: 'q_energy', answer_value: '5' },
  ];

  assert.equal(scoreFromAnswers(bad), 0);
  assert.equal(scoreFromAnswers(good), 11);
  assert.ok(scoreFromAnswers(good) > scoreFromAnswers(bad));
  assert.ok(scoreFromAnswers([]) === 0);
});

test('the summary separates what is done well from what is missing', () => {
  const answers = [
    { question_id: 'q_vitamins', answer_value: 'yes' },
    { question_id: 'q_checkup', answer_value: 'no' },
    { question_id: 'q_symptoms', answer_value: 'nauseas' },
  ];

  const summary = buildSummaryText(answers, 4, getWeekData(20));

  assert.match(summary, /Buen autocuidado/);
  assert.match(summary, /vitaminas/i);
  assert.match(summary, /control/i);
  assert.match(summary, /sintoma/i);
  assert.doesNotMatch(summary, /diagnostic|recet/i);
});

test('the summary works without week information', () => {
  const summary = buildSummaryText([{ question_id: 'q_food', answer_value: '3' }], 1, null);
  assert.ok(summary.length > 20);
  assert.doesNotMatch(summary, /semana \d+/i);
});
