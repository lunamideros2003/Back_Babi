// End-to-end test of the pregnancy questionnaire bot.
// Run with the backend active: node scripts/smoke-bot.mjs
const BASE = process.env.API_URL ?? 'http://localhost:4001/api';

let passed = 0;
let failed = 0;

async function call(path, { method = 'GET', body, token } = {}) {
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: response.status, json: await response.json().catch(() => ({})) };
}

function check(label, condition, extra = '') {
  if (condition) {
    passed += 1;
    console.log(`  OK   ${label}`);
  } else {
    failed += 1;
    console.log(`  FAIL ${label} ${extra}`);
  }
}

const ANSWERS = [
  { questionId: 'q_week', value: '14-27' },
  { questionId: 'q_first', value: 'yes' },
  { questionId: 'q_energy', value: 2 },
  { questionId: 'q_symptoms', value: ['nauseas', 'insomnio'] },
  { questionId: 'q_food', value: '1-2' },
  { questionId: 'q_vitamins', value: 'no' },
  { questionId: 'q_exercise', value: 'sometimes' },
  { questionId: 'q_concern', value: 'health' },
  { questionId: 'q_checkup', value: 'no' },
  { questionId: 'q_note', text: 'Me cuesta dormir por las noches' },
];

const run = async () => {
  console.log('\nBabyTrack IA - prueba del bot de preguntas\n');

  const health = await call('/health');
  check('health responde 200', health.status === 200);

  const email = `bot${Date.now()}@babytrack.dev`;
  const register = await call('/auth/register', {
    method: 'POST',
    body: { name: 'Bot', email, password: 'secreta123', currentWeek: 20 },
  });
  check('registro 201', register.status === 201, JSON.stringify(register.json).slice(0, 120));
  const token = register.json.token;

  const questions = await call('/bot/questions', { token });
  check('banco de preguntas', questions.json.questions?.length === 10, `${questions.json.questions?.length}`);
  check('tipos variados', new Set(questions.json.questions?.map((q) => q.type)).size >= 4);

  const start = await call('/bot/sessions', { method: 'POST', token });
  check('sesion creada', start.status === 201, JSON.stringify(start.json).slice(0, 150));
  check('primera pregunta', start.json.question?.id === 'q_week', start.json.question?.id);
  check('progreso inicial', start.json.question?.progress > 0);

  const sessionId = start.json.session.id;
  let last = start.json;

  for (let index = 0; index < ANSWERS.length; index += 1) {
    const answer = ANSWERS[index];
    const isLast = index === ANSWERS.length - 1;

    const response = await call(`/bot/sessions/${sessionId}/answers`, {
      method: 'POST',
      token,
      body: answer,
    });

    const expectId = questions.json.questions[index + 1]?.id;
    const label = `responde ${answer.questionId}`;

    if (response.status !== 200) {
      check(label, false, JSON.stringify(response.json).slice(0, 200));
      break;
    }

    check(`${label} devuelve feedback`, Boolean(response.json.feedback?.length > 10), response.json.feedback);
    check(`${label} sin diagnostico`, !/diagnostic|recet|medicament/i.test(response.json.feedback ?? ''));

    if (isLast) {
      check('ultima respuesta completa la sesion', response.json.is_complete === true);
      check('resumen generado', Boolean(response.json.summary?.length > 40));
      check('puntaje numerico', Number.isFinite(response.json.score), String(response.json.score));
      check('sin preguntas pendientes', response.json.question === null);
    } else {
      check(`${label} avanza a ${expectId}`, response.json.question?.id === expectId, response.json.question?.id);
    }

    last = response.json;
  }

  check('resumen con puntaje bajo', /por mejorar|Buen autocuidado/.test(last.summary ?? ''), last.summary?.slice(0, 60));
  check('menciona sintomas', /sintoma/i.test(last.summary ?? ''));

  const fetchSession = await call(`/bot/sessions/${sessionId}`, { token });
  check('sesion recuperable', fetchSession.status === 200 && fetchSession.json.session.status === 'completed');
  check('respuestas guardadas', fetchSession.json.answers?.length === 10, `${fetchSession.json.answers?.length}`);

  const sessions = await call('/bot/sessions', { token });
  check('historial de sesiones', sessions.json.sessions?.length >= 1);

  const bad = await call(`/bot/sessions/${sessionId}/answers`, {
    method: 'POST',
    token,
    body: { questionId: 'q_week', value: 'inventado' },
  });
  check('rechaza opcion invalida', bad.status === 422, String(bad.status));

  const badId = await call(`/bot/sessions/${sessionId}/answers`, {
    method: 'POST',
    token,
    body: { questionId: 'no_existe', value: 'x' },
  });
  check('rechaza pregunta inexistente', badId.status === 422, String(badId.status));

  const noAuth = await call('/bot/sessions');
  check('sin token da 401', noAuth.status === 401);

  const reset = await call('/bot/reset', { method: 'POST', token });
  check('reset funciona', reset.status === 200);
  const afterReset = await call('/bot/sessions', { token });
  check('sesiones borradas', afterReset.json.sessions?.length === 0, `${afterReset.json.sessions?.length}`);

  console.log(`\nResultado: ${passed} correctos, ${failed} fallidos\n`);
  process.exit(failed === 0 ? 0 : 1);
};

run().catch((error) => {
  console.error('Error:', error.message);
  process.exit(1);
});
