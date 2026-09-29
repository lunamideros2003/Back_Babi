import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyQuestion } from '../src/services/ai/classifier.js';

const CASES = [
  ['me duele la espalda y no puedo dormir', 'sintomas'],
  ['Que puedo comer en el embarazo', 'alimentacion'],
  ['tengo nauseas todas las mañanas', 'sintomas'],
  ['cuando es mi proximo control', 'controles'],
  ['puedo hacer yoga o pilates', 'ejercicio'],
  ['como va el desarrollo de mi bebe', 'desarrollo'],
  ['me siento ansiosa y nerviosa', 'emocional'],
  ['que llevo al hospital en la maleta', 'parto'],
  ['tengo reflujo y heartburn', 'sintomas'],
  ['cuando parto y como sera', 'parto'],
  ['cuanto peso puedo ganar', 'alimentacion'],
  ['tengo estreñimiento', 'sintomas'],
  ['hola', 'general'],
  ['   ', 'general'],
];

for (const [message, expected] of CASES) {
  test(`classifica "${message}" como ${expected}`, () => {
    const result = classifyQuestion(message);
    assert.equal(result.category, expected);
    assert.ok(result.confidence >= 0.25 && result.confidence <= 0.95);
  });
}
