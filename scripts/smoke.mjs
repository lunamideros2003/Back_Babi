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
  console.log('\nBabyTrack IA - smoke test\n');

  const health = await call('/health');
  check('health returns 200', health.status === 200);
  check('weeks loaded', health.json.weeks_loaded >= 35, `(${health.json.weeks_loaded})`);
  console.log(`       AI active: ${health.json.ai?.active}`);

  const weeks = await call('/weeks');
  check('weeks list', weeks.json.weeks?.length >= 35);

  const calc = await call('/weeks/calculate?week=20');
  check('week calculation', calc.json.pregnancy?.current_week === 20, JSON.stringify(calc.json.pregnancy));

  const email = `test${Date.now()}@babytrack.dev`;
  const register = await call('/auth/register', {
    method: 'POST',
    body: { name: 'Prueba', email, password: 'secreta123', currentWeek: 20 },
  });
  check('registration 201', register.status === 201, JSON.stringify(register.json));
  check('token delivered', Boolean(register.json.token));
  const token = register.json.token;

  const me = await call('/auth/me', { token });
  check('profile with pregnancy', me.json.pregnancy?.current_week === 20, JSON.stringify(me.json.pregnancy));

  const pregnancy = await call('/pregnancy', { token });
  check('pregnancy created', pregnancy.json.pregnancy?.current_week === 20);
  check('correct trimester', pregnancy.json.pregnancy?.trimester === 2);
  check('week from the database', Boolean(pregnancy.json.pregnancy?.week?.title));

  const appt = await call('/appointments', {
    method: 'POST',
    token,
    body: { title: 'Control mensual', scheduled_at: '2026-10-15T09:30:00', location: 'Clinica Norte' },
  });
  check('appointment created', appt.status === 201, JSON.stringify(appt.json));

  const listAppt = await call('/appointments?scope=upcoming', { token });
  check('appointments listed', listAppt.json.appointments?.length === 1);

  const reminders = await call('/reminders/generate', { method: 'POST', token, body: { count: 4 } });
  check('reminders generated', reminders.json.reminders?.length === 4, JSON.stringify(reminders.json).slice(0, 200));

  if (reminders.json.reminders?.length) {
    const id = reminders.json.reminders[0].id;
    const toggled = await call(`/reminders/${id}/toggle`, { method: 'PATCH', token });
    check('reminder completed', toggled.json.reminder?.is_completed === 1);
  }

  const chat = await call('/chat', {
    method: 'POST',
    token,
    body: { message: 'Que puedo comer en el embarazo?' },
  });
  check('chat responds', chat.status === 200, JSON.stringify(chat.json).slice(0, 200));
  check('nutrition category', chat.json.reply?.category === 'alimentacion', chat.json.reply?.category);
  check('response in Spanish', /embarazo|cafeina|verdura|folico|lacteo/i.test(chat.json.reply?.content ?? ''));
  console.log(`       provider: ${chat.json.reply?.provider}`);

  const chat2 = await call('/chat', {
    method: 'POST',
    token,
    body: { message: 'Estoy sangrando mucho, que hago?' },
  });
  check('emergency detected', chat2.json.reply?.is_emergency === true, JSON.stringify(chat2.json.reply).slice(0, 200));

  const chat3 = await call('/chat', {
    method: 'POST',
    token,
    body: { message: 'Me puedes recetar paracetamol?' },
  });
  check('prescription rejected', chat3.json.reply?.is_redirect === true, JSON.stringify(chat3.json.reply).slice(0, 150));

  const chat4 = await call('/chat', {
    method: 'POST',
    token,
    body: { message: 'Que pasa en la semana 20?' },
  });
  check('week question uses context', /semana 20/i.test(chat4.json.reply?.content ?? ''), chat4.json.reply?.content?.slice(0, 120));

  const history = await call('/chat/history', { token });
  check('history saved', history.json.messages?.length === 8, `(${history.json.messages?.length})`);

  const classified = await call('/chat/classify', { method: 'POST', token, body: { message: 'me duele la espalda y no puedo dormir' } });
  check('classifier works', Boolean(classified.json.category), classified.json.category);

  const checkup = await call('/tracking/checkups', {
    method: 'POST',
    token,
    body: { pregnancy_week: 20, weight_kg: 68.5, blood_pressure: '110/70' },
  });
  check('checkup recorded', checkup.status === 201);

  const symptom = await call('/tracking/symptoms', {
    method: 'POST',
    token,
    body: { pregnancy_week: 20, symptom: 'Nauseas matutinas', severity: 2 },
  });
  check('symptom recorded', symptom.status === 201);

  const timeline = await call('/tracking/timeline', { token });
  check('complete timeline', Boolean(timeline.json.pregnancy && timeline.json.week));

  const unauthorized = await call('/pregnancy');
  check('without token returns 401', unauthorized.status === 401);

  const badLogin = await call('/auth/login', { method: 'POST', body: { email, password: 'incorrecta' } });
  check('wrong login 401', badLogin.status === 401);

  const goodLogin = await call('/auth/login', { method: 'POST', body: { email, password: 'secreta123' } });
  check('correct login 200', goodLogin.status === 200);

  console.log(`\nResult: ${passed} passed, ${failed} failed\n`);
  process.exit(failed === 0 ? 0 : 1);
};

run().catch((error) => {
  console.error('Test error:', error.message);
  process.exit(1);
});
