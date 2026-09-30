import { Router } from 'express';
import { all, get, run, transaction } from '../db/connection.js';
import * as repo from '../repositories/index.js';
import { requireAuth } from '../middleware/auth.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';
import { DISCLAIMER } from '../config/disclaimers.js';
import { questions, getQuestionByIndex, getQuestionById, TOTAL_QUESTIONS } from '../services/bot/questionBank.js';
import {
  buildFeedback,
  weekForTrimester,
  scoreFromAnswers,
  buildSummaryText,
  getWeekData,
} from '../services/bot/botService.js';

const router = Router();
router.use(requireAuth);

function shapeQuestion(question, currentIndex) {
  if (!question) return null;

  const base = {
    id: question.id,
    order: question.order,
    category: question.category,
    type: question.type,
    text: question.text,
    help: question.help ?? null,
    total: TOTAL_QUESTIONS,
    index: currentIndex,
    progress: Math.round(((currentIndex + 1) / TOTAL_QUESTIONS) * 100),
  };

  if (question.options) base.options = question.options;
  if (question.min !== undefined) {
    base.min = question.min;
    base.max = question.max;
    base.minLabel = question.minLabel;
    base.maxLabel = question.maxLabel;
  }
  if (question.placeholder) base.placeholder = question.placeholder;

  return base;
}

function getSession(userId, sessionId) {
  const session = get('SELECT * FROM bot_sessions WHERE id = :id AND user_id = :userId', {
    id: sessionId,
    userId,
  });
  if (!session) throw new NotFoundError('Sesion del bot');
  return session;
}

function getAnswers(sessionId) {
  return all(
    'SELECT * FROM bot_answers WHERE session_id = :sessionId ORDER BY id ASC',
    { sessionId },
  );
}

router.get('/questions', (_req, res) => {
  res.json({
    ok: true,
    total: TOTAL_QUESTIONS,
    categories: [...new Set(questions.map((q) => q.category))],
    questions: questions.map((q) => shapeQuestion(q, q.order - 1)),
  });
});

router.get('/sessions', (req, res) => {
  const sessions = all(
    'SELECT * FROM bot_sessions WHERE user_id = :userId ORDER BY id DESC LIMIT 10',
    { userId: req.user.id },
  );
  res.json({ ok: true, sessions });
});

router.post('/sessions', (req, res) => {
  const pregnancy = repo.getPregnancy(req.user.id);

  const result = run(
    `INSERT INTO bot_sessions (user_id, pregnancy_week, status, current_index)
     VALUES (:userId, :week, 'in_progress', 0)`,
    { userId: req.user.id, week: pregnancy?.current_week ?? null },
  );

  const session = get('SELECT * FROM bot_sessions WHERE id = :id', {
    id: Number(result.lastInsertRowid),
  });

  res.status(201).json({
    ok: true,
    session,
    question: shapeQuestion(getQuestionByIndex(0), 0),
    disclaimer: DISCLAIMER,
  });
});

router.get('/sessions/:id', (req, res) => {
  const session = getSession(req.user.id, Number(req.params.id));
  const answers = getAnswers(session.id);

  if (session.status === 'completed') {
    return res.json({
      ok: true,
      session,
      answers,
      question: null,
      summary: session.summary,
      score: session.score,
      total: TOTAL_QUESTIONS,
      disclaimer: DISCLAIMER,
    });
  }

  return res.json({
    ok: true,
    session,
    answers,
    question: shapeQuestion(getQuestionByIndex(session.current_index), session.current_index),
    total: TOTAL_QUESTIONS,
    disclaimer: DISCLAIMER,
  });
});

router.post('/sessions/:id/answers', async (req, res, next) => {
  try {
    const session = getSession(req.user.id, Number(req.params.id));

    if (session.status === 'completed') {
      throw new ValidationError([
        { field: 'session', message: 'Esta sesion ya se completo. Inicia una nueva.' },
      ]);
    }

    const question = getQuestionById(req.body?.questionId);
    if (!question) {
      throw new ValidationError([{ field: 'questionId', message: 'Pregunta no valida.' }]);
    }

    const value = req.body?.value;
    const text = typeof req.body?.text === 'string' ? req.body.text.trim().slice(0, 500) : null;

    const errors = validateAnswer(question, value, text);
    if (errors.length > 0) throw new ValidationError(errors);

    const pregnancy = repo.getPregnancy(req.user.id);
    const feedback = await buildFeedback({
      question,
      value: value ?? text,
      user: req.user,
      weekData: pregnancy ? getWeekData(pregnancy.current_week) : null,
    });

    const storedValue = Array.isArray(value) ? value.join(',') : (value ?? null);

    run(
      `INSERT INTO bot_answers
         (session_id, question_id, question_text, category, answer_value, answer_text, feedback)
       VALUES
         (:sessionId, :questionId, :questionText, :category, :answerValue, :answerText, :feedback)`,
      {
        sessionId: session.id,
        questionId: question.id,
        questionText: question.text,
        category: question.category,
        answerValue: storedValue,
        answerText: text,
        feedback,
      },
    );

    const nextIndex = session.current_index + 1;
    const isLast = nextIndex >= TOTAL_QUESTIONS;

    if (isLast) {
      const answers = getAnswers(session.id);
      const score = scoreFromAnswers(answers);
      const weekData = getWeekData(session.pregnancy_week);
      const summary = buildSummaryText(answers, score, weekData);

      run(
        `UPDATE bot_sessions
         SET status = 'completed', current_index = :nextIndex, answers_count = :count,
             summary = :summary, score = :score, completed_at = datetime('now')
         WHERE id = :id`,
        {
          nextIndex,
          count: answers.length,
          summary,
          score,
          id: session.id,
        },
      );

      const updated = get('SELECT * FROM bot_sessions WHERE id = :id', { id: session.id });

      return res.json({
        ok: true,
        session: updated,
        feedback,
        question: null,
        is_complete: true,
        summary,
        score,
        total: TOTAL_QUESTIONS,
        disclaimer: DISCLAIMER,
      });
    }

    run(
      `UPDATE bot_sessions
       SET current_index = :nextIndex, answers_count = :count
       WHERE id = :id`,
      { nextIndex, count: nextIndex, id: session.id },
    );

    // Use the trimester from this answer as a fallback when no pregnancy is set.
    if (!session.pregnancy_week) {
      const estimated = weekForTrimester(storedValue);
      if (estimated) {
        run('UPDATE bot_sessions SET pregnancy_week = :week WHERE id = :id', {
          week: estimated,
          id: session.id,
        });
      }
    }

    const updated = get('SELECT * FROM bot_sessions WHERE id = :id', { id: session.id });

    return res.json({
      ok: true,
      session: updated,
      feedback,
      question: shapeQuestion(getQuestionByIndex(nextIndex), nextIndex),
      is_complete: false,
      total: TOTAL_QUESTIONS,
      disclaimer: DISCLAIMER,
    });
  } catch (error) {
    return next(error);
  }
});

router.delete('/sessions/:id', (req, res) => {
  const session = getSession(req.user.id, Number(req.params.id));
  run('DELETE FROM bot_sessions WHERE id = :id', { id: session.id });
  res.json({ ok: true });
});

router.post('/reset', (req, res) => {
  transaction(() => {
    run('DELETE FROM bot_sessions WHERE user_id = :userId', { userId: req.user.id });
  });
  res.json({ ok: true });
});

function validateAnswer(question, value, text) {
  const errors = [];

  if (question.type === 'text') {
    if (text !== null && text.length > 500) {
      errors.push({ field: 'text', message: 'La respuesta es demasiado larga.' });
    }
    return errors;
  }

  if (question.type === 'scale') {
    const score = Number(value);
    if (!Number.isFinite(score) || score < question.min || score > question.max) {
      errors.push({ field: 'value', message: `Elige un numero entre ${question.min} y ${question.max}.` });
    }
    return errors;
  }

  if (question.type === 'multi') {
    const values = Array.isArray(value) ? value : [value];
    const allowed = question.options.map((option) => option.value);
    const valid = values.length > 0 && values.every((item) => allowed.includes(item));
    if (!valid) errors.push({ field: 'value', message: 'Elige al menos una opcion de la lista.' });
    return errors;
  }

  const allowed = question.options.map((option) => option.value);
  if (!allowed.includes(value)) {
    errors.push({ field: 'value', message: 'Elige una opcion de la lista.' });
  }

  return errors;
}

export default router;
