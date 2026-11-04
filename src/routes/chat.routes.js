import { Router } from 'express';
import env from '../config/env.js';
import * as repo from '../repositories/index.js';
import { requireAuth } from '../middleware/auth.js';
import { getAssistantReply, persistMessage } from '../services/ai/chatService.js';
import { CATEGORIES, classifyQuestion } from '../services/ai/classifier.js';
import { faqQuestions } from '../services/ai/knowledgeBase.js';
import { buildWelcome } from '../services/ai/welcome.js';
import { isOpenAiConfigured } from '../services/ai/openaiProvider.js';
import { DISCLAIMER } from '../config/disclaimers.js';
import { ValidationError, AppError } from '../utils/errors.js';
import { consume, reintentarEn } from '../utils/rateLimit.js';

const router = Router();
router.use(requireAuth);

// La IA gratuita tiene un tope por minuto: se limita por usuaria.
const LIMITE_POR_MINUTO = 20;

// El chat de la pagina admite preguntas largas; la burbuja, respuestas cortas.
const MENSAJE_MAXIMO = 1000;
const MENSAJE_MAXIMO_RAPIDO = 500;

function readMessage(body, maxLength = MENSAJE_MAXIMO) {
  const message = String(body?.message ?? '').trim();

  if (message.length < 2) {
    throw new ValidationError([{ field: 'message', message: 'Escribe una pregunta.' }]);
  }

  if (message.length > maxLength) {
    throw new ValidationError([
      { field: 'message', message: `La pregunta es demasiado larga (máximo ${maxLength}).` },
    ]);
  }

  return message;
}

/**
 * El chat de la pagina y la burbuja comparten el mismo limite: preguntar en
 * un sitio tambien cuenta en el otro, asi no se duplica el consumo gratuito.
 */
function enforceRateLimit(req, res, scope = 'chat') {
  const key = `${scope}:${req.user.id}`;

  if (consume(key, LIMITE_POR_MINUTO)) return;

  const espera = reintentarEn(key);
  res.set('Retry-After', String(espera));
  throw new AppError(
    `Has hecho demasiadas preguntas seguidas. Espera ${espera} segundos y vuelve a intentarlo.`,
    429,
    'RATE_LIMITED',
  );
}

function replyBody(answer) {
  return {
    role: 'assistant',
    content: answer.content,
    category: answer.category,
    category_label: answer.categoryLabel,
    confidence: answer.confidence,
    provider: answer.provider,
    tokens_used: answer.tokensUsed,
    is_emergency: Boolean(answer.isEmergency),
    is_redirect: Boolean(answer.isRedirect),
    is_fallback: Boolean(answer.isFallback),
    disclaimer: answer.disclaimer,
    pregnancy_week: answer.pregnancyWeek,
  };
}

router.get('/categories', async (_req, res) => {
  res.json({
    ok: true,
    categories: CATEGORIES.map(({ key, label }) => ({ key, label })),
    faq: faqQuestions,
  });
});

router.get('/welcome', async (req, res) => {
  const pregnancy = await repo.getPregnancy(req.user.id);
  const week = pregnancy?.current_week;

  const welcome = buildWelcome({ name: req.user.name, week });
  const ready = isOpenAiConfigured();

  res.json({
    ok: true,
    ...welcome,
    ai: {
      ready,
      mode: ready ? 'model' : 'local',
      model: ready ? env.ai.model : null,
    },
    disclaimer: DISCLAIMER,
  });
});

router.get('/history', async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit ?? 50), 1), 200);
  const offset = Math.max(Number(req.query.offset ?? 0), 0);

  const [messages, total] = await Promise.all([
    repo.listChatHistory(req.user.id, limit, offset),
    repo.countChatMessages(req.user.id),
  ]);

  res.json({
    ok: true,
    messages,
    total,
    limit,
    offset,
    has_more: offset + messages.length < total,
  });
});

router.post('/', async (req, res, next) => {
  try {
    const message = readMessage(req.body);
    enforceRateLimit(req, res);

    const pregnancy = await repo.getPregnancy(req.user.id);

    const userMessageId = await persistMessage({
      userId: req.user.id,
      role: 'user',
      content: message,
      pregnancyWeek: pregnancy?.current_week ?? null,
    });

    const answer = await getAssistantReply({
      user: req.user,
      pregnancy,
      message,
    });

    const assistantMessageId = await persistMessage({
      userId: req.user.id,
      role: 'assistant',
      content: answer.content,
      category: answer.category,
      pregnancyWeek: answer.pregnancyWeek,
      provider: answer.provider,
      tokensUsed: answer.tokensUsed,
    });

    res.json({
      ok: true,
      user_message: { id: userMessageId, role: 'user', content: message },
      reply: { id: assistantMessageId, ...replyBody(answer) },
    });
  } catch (error) {
    next(error);
  }
});

router.post('/quick', async (req, res, next) => {
  try {
    const message = readMessage(req.body, MENSAJE_MAXIMO_RAPIDO);
    enforceRateLimit(req, res);

    const pregnancy = await repo.getPregnancy(req.user.id);

    await persistMessage({
      userId: req.user.id,
      role: 'user',
      content: message,
      pregnancyWeek: pregnancy?.current_week ?? null,
    });

    const answer = await getAssistantReply({
      user: req.user,
      pregnancy,
      message,
      historyLimit: 4,
      maxTokens: 280,
    });

    const assistantMessageId = await persistMessage({
      userId: req.user.id,
      role: 'assistant',
      content: answer.content,
      category: answer.category,
      pregnancyWeek: answer.pregnancyWeek,
      provider: answer.provider,
      tokensUsed: answer.tokensUsed,
    });

    res.json({
      ok: true,
      quick: true,
      reply: { id: assistantMessageId, ...replyBody(answer) },
    });
  } catch (error) {
    next(error);
  }
});

router.post('/classify', async (req, res) => {
  const result = classifyQuestion(String(req.body?.message ?? ''));
  res.json({ ok: true, ...result });
});

router.delete('/history', async (req, res) => {
  await repo.clearChatHistory(req.user.id);
  res.json({ ok: true });
});

export default router;
