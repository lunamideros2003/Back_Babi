// End-to-end smoke test against a running API. Run: node scripts/smoke.mjs
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
  const json = await response.json();
  return { status: response.status, json };
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

const run = async () => {
  console.log('\nBabyTrack IA - prueba de humo\n');

  const health = await call('/health');
  check('health responde 200', health.status === 200);
  check('semanas cargadas', health.json.weeks_loaded >= 35, `(${health.json.weeks_loaded})`);
  console.log(`       IA activa: ${health.json.ai?.active}`);

  const weeks = await call('/weeks');
  check('lista de semanas', weeks.json.weeks?.length >= 35);

  const calc = await call('/weeks/calculate?week=20');
  check('calculo de semana', calc.json.pregnancy?.current_week === 20, JSON.stringify(calc.json.pregnancy));

  const email = `test${Date.now()}@babytrack.dev`;
  const register = await call('/auth/register', {
    method: 'POST',
    body: { name: 'Prueba', email, password: 'secreta123', currentWeek: 20 },
  });
  check('registro 201', register.status === 201, JSON.stringify(register.json));
  check('token entregado', Boolean(register.json.token));
  const token = register.json.token;

  const me = await call('/auth/me', { token });
  check('perfil con embarazo', me.json.pregnancy?.current_week === 20, JSON.stringify(me.json.pregnancy));

  const pregnancy = await call('/pregnancy', { token });
  check('embarazo creado', pregnancy.json.pregnancy?.current_week === 20);
  check('trimestre correcto', pregnancy.json.pregnancy?.trimester === 2);
  check('semana de la bd', Boolean(pregnancy.json.pregnancy?.week?.title));

  const appt = await call('/appointments', {
    method: 'POST',
    token,
    body: { title: 'Control mensual', scheduled_at: '2026-10-15T09:30:00', location: 'Clinica Norte' },
  });
  check('cita creada', appt.status === 201, JSON.stringify(appt.json));

  const listAppt = await call('/appointments?scope=upcoming', { token });
  check('citas listadas', listAppt.json.appointments?.length === 1);

  const reminders = await call('/reminders/generate', { method: 'POST', token, body: { count: 4 } });
  check('recordatorios generados', reminders.json.reminders?.length === 4, JSON.stringify(reminders.json).slice(0, 200));

  if (reminders.json.reminders?.length) {
    const id = reminders.json.reminders[0].id;
    const toggled = await call(`/reminders/${id}/toggle`, { method: 'PATCH', token });
    check('recordatorio completado', toggled.json.reminder?.is_completed === 1);
  }

  const chat = await call('/chat', {
    method: 'POST',
    token,
    body: { message: 'Que puedo comer en el embarazo?' },
  });
  check('chat responde', chat.status === 200, JSON.stringify(chat.json).slice(0, 200));
  check('categoria alimentacion', chat.json.reply?.category === 'alimentacion', chat.json.reply?.category);
  check('respuesta en espanol', /embarazo|cafeina|verdura|folico|lacteo/i.test(chat.json.reply?.content ?? ''));
  console.log(`       proveedor: ${chat.json.reply?.provider}`);

  const chat2 = await call('/chat', {
    method: 'POST',
    token,
    body: { message: 'Estoy sangrando mucho, que hago?' },
  });
  check('emergencia detectada', chat2.json.reply?.is_emergency === true, JSON.stringify(chat2.json.reply).slice(0, 200));

  const chat3 = await call('/chat', {
    method: 'POST',
    token,
    body: { message: 'Me puedes recetar paracetamol?' },
  });
  check('receta rechazada', chat3.json.reply?.is_redirect === true, JSON.stringify(chat3.json.reply).slice(0, 150));

  const chat4 = await call('/chat', {
    method: 'POST',
    token,
    body: { message: 'Que pasa en la semana 20?' },
  });
  check('pregunta de semana usa contexto', /semana 20/i.test(chat4.json.reply?.content ?? ''), chat4.json.reply?.content?.slice(0, 120));

  const history = await call('/chat/history', { token });
  check('historial guardado', history.json.messages?.length === 8, `(${history.json.messages?.length})`);

  const classified = await call('/chat/classify', { method: 'POST', token, body: { message: 'me duele la espalda y no puedo dormir' } });
  check('clasificador funciona', Boolean(classified.json.category), classified.json.category);

  const checkup = await call('/tracking/checkups', {
    method: 'POST',
    token,
    body: { pregnancy_week: 20, weight_kg: 68.5, blood_pressure: '110/70' },
  });
  check('control registrado', checkup.status === 201);

  const symptom = await call('/tracking/symptoms', {
    method: 'POST',
    token,
    body: { pregnancy_week: 20, symptom: 'Nauseas matutinas', severity: 2 },
  });
  check('sintoma registrado', symptom.status === 201);

  const timeline = await call('/tracking/timeline', { token });
  check('timeline completo', Boolean(timeline.json.pregnancy && timeline.json.week));

  const unauthorized = await call('/pregnancy');
  check('sin token da 401', unauthorized.status === 401);

  const badLogin = await call('/auth/login', { method: 'POST', body: { email, password: 'incorrecta' } });
  check('login incorrecto 401', badLogin.status === 401);

  const goodLogin = await call('/auth/login', { method: 'POST', body: { email, password: 'secreta123' } });
  check('login correcto 200', goodLogin.status === 200);

  console.log(`\nResultado: ${passed} correctos, ${failed} fallidos\n`);
  process.exit(failed === 0 ? 0 : 1);
};

run().catch((error) => {
  console.error('Error en la prueba:', error.message);
  process.exit(1);
});
