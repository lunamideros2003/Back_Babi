import { Router } from 'express';
import * as repo from '../repositories/index.js';
import { requireAuth } from '../middleware/auth.js';
import { getAssistantReply, persistMessage } from '../services/ai/chatService.js';
import { CATEGORIES, classifyQuestion } from '../services/ai/classifier.js';
import { faqQuestions } from '../services/ai/knowledgeBase.js';
import { ValidationError } from '../utils/errors.js';

const router = Router();
router.use(requireAuth);

router.get('/categories', (_req, res) => {
  res.json({
    ok: true,
    categories: CATEGORIES.map(({ key, label }) => ({ key, label })),
    faq: faqQuestions,
  });
});

router.get('/history', (req, res) => {
  const limit = Math.min(Number(req.query.limit ?? 50), 200);
  res.json({ ok: true, messages: repo.listChatHistory(req.user.id, limit) });
});

router.post('/', async (req, res, next) => {
  try {
    const message = String(req.body?.message ?? '').trim();

    if (message.length < 2) {
      throw new ValidationError([{ field: 'message', message: 'Escribe una pregunta.' }]);
    }
    if (message.length > 1000) {
      throw new ValidationError([
        { field: 'message', message: 'La pregunta es demasiado larga (maximo 1000).' },
      ]);
    }

    const pregnancy = repo.getPregnancy(req.user.id);

    const userMessageId = persistMessage({
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

    const assistantMessageId = persistMessage({
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
      reply: {
        id: assistantMessageId,
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
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post('/classify', (req, res) => {
  const result = classifyQuestion(String(req.body?.message ?? ''));
  res.json({ ok: true, ...result });
});

router.delete('/history', (req, res) => {
  repo.clearChatHistory(req.user.id);
  res.json({ ok: true });
});

export default router;
