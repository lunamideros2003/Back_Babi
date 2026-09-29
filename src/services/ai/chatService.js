import env from '../../config/env.js';
import { classifyQuestion } from './classifier.js';
import {
  isEmergency,
  requiresRedirect,
  buildSystemContext,
  EMERGENCY_RESPONSE,
  MEDICATION_REFUSAL,
  DISCLAIMER,
} from './guardrails.js';
import { localAnswer } from './localProvider.js';
import { openAiAnswer, isOpenAiConfigured } from './openaiProvider.js';
import { get, all, run } from '../../db/connection.js';

function loadWeekContext(pregnancy) {
  if (!pregnancy) return null;
  return get('SELECT * FROM weeks WHERE week_number = :week', {
    week: pregnancy.current_week,
  });
}

function loadHistory(userId, limit = 6) {
  return all(
    `SELECT role, content FROM chat_messages
     WHERE user_id = :userId
     ORDER BY id DESC
     LIMIT :limit`,
    { userId, limit },
  ).reverse();
}

/**
 * Single entry point for every AI interaction.
 * Order matters: safety first, then classification, then the model.
 */
export async function getAssistantReply({ user, pregnancy, message, history }) {
  const weekData = loadWeekContext(pregnancy);
  const classification = classifyQuestion(message);
  const conversation = history ?? loadHistory(user.id);

  const base = {
    userId: user.id,
    category: classification.category,
    categoryLabel: classification.label,
    confidence: classification.confidence,
    pregnancyWeek: pregnancy?.current_week ?? null,
    disclaimer: DISCLAIMER,
    weekData,
  };

  if (isEmergency(message)) {
    return {
      ...base,
      content: EMERGENCY_RESPONSE.content,
      provider: 'guardrails',
      tokensUsed: 0,
      isEmergency: true,
    };
  }

  if (requiresRedirect(message)) {
    return {
      ...base,
      content: MEDICATION_REFUSAL,
      provider: 'guardrails',
      tokensUsed: 0,
      isRedirect: true,
    };
  }

  const payload = {
    message,
    weekData,
    history: conversation,
    userName: user.name,
  };

  if (env.ai.provider === 'local' || !isOpenAiConfigured()) {
    const local = await localAnswer(payload);
    return { ...base, ...local, isFallback: env.ai.provider !== 'local' };
  }

  try {
    const answer = await openAiAnswer(payload);
    return { ...base, ...answer };
  } catch (error) {
    const local = await localAnswer(payload);
    return { ...base, ...local, isFallback: true, fallbackReason: error.message };
  }
}

export function persistMessage({ userId, role, content, category, pregnancyWeek, provider, tokensUsed }) {
  const result = run(
    `INSERT INTO chat_messages
       (user_id, role, content, category, pregnancy_week, provider, tokens_used)
     VALUES
       (:userId, :role, :content, :category, :pregnancyWeek, :provider, :tokensUsed)`,
    {
      userId,
      role,
      content,
      category: category ?? null,
      pregnancyWeek: pregnancyWeek ?? null,
      provider: provider ?? null,
      tokensUsed: tokensUsed ?? null,
    },
  );
  return Number(result.lastInsertRowid);
}

export { classifyQuestion, buildSystemContext };
