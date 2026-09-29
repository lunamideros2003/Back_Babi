import OpenAI from 'openai';
import env from '../../config/env.js';
import { localAnswer, buildGroundingContext } from './localProvider.js';
import { classifyQuestion } from './classifier.js';
import { DISCLAIMER } from '../../config/disclaimers.js';

const SYSTEM_PROMPT = `Eres BabyTrack IA, un asistente EDUCATIVO de seguimiento del embarazo.

Reglas innegociables:
1. NUNCA diagnostiques enfermedades. Si te preguntan si algo es una enfermedad, explica los cambios tipicos y remitelos a su obstetra.
2. NUNCA indiques medicamentos, dosis ni recetas. Remite siempre a obstetra o farmaceutico.
3. Si detectas sangrado abundante, perdida de liquido, contracciones regulares e intensas, dolor intenso o falta de movimientos, indica de inmediato que contacte a su equipo medico o urgencias.
4. Usa un tono calido, cercano y en espanol neutro. Tutea a la usuaria.
5. Se breve: maximo cuatro parrafos cortos o una lista de tres a cinco puntos.
6. Usa la base de conocimiento y el contexto de semana como fuente principal.
7. Menciona que no sustituyes la consulta medica solo cuando sea relevante, sin repetirlo de forma agresiva.
8. Si la usuaria pregunta por su semana actual, usa el contexto semanal proporcionado.`;

function buildMessages({ message, weekData, history, userName }) {
  const messages = [
    {
      role: 'system',
      content: `${SYSTEM_PROMPT}\n\n${buildGroundingContext(weekData)}\n\nUsuario: ${userName || 'sin nombre'}.`,
    },
  ];

  for (const item of history.slice(-6)) {
    messages.push({ role: item.role, content: item.content });
  }

  const classification = classifyQuestion(message);
  messages.push({
    role: 'user',
    content: `[categoria: ${classification.label}]\n${message}`,
  });

  return messages;
}

let client = null;

function getClient() {
  if (!env.ai.apiKey) return null;
  if (!client) {
    client = new OpenAI({
      apiKey: env.ai.apiKey,
      baseURL: env.ai.baseUrl,
    });
  }
  return client;
}

export function isOpenAiConfigured() {
  return Boolean(env.ai.apiKey);
}

export async function openAiAnswer({ message, weekData, history = [], userName }) {
  const sdk = getClient();
  if (!sdk) throw new Error('OPENAI_API_KEY no configurada');

  const completion = await sdk.chat.completions.create({
    model: env.ai.model,
    messages: buildMessages({ message, weekData, history, userName }),
    max_tokens: env.ai.maxTokens,
    temperature: env.ai.temperature,
  });

  const choice = completion.choices?.[0];
  const content = choice?.message?.content?.trim();

  if (!content) throw new Error('Respuesta vacia del modelo');

  return {
    content,
    provider: `openai:${env.ai.model}`,
    tokensUsed: completion.usage?.total_tokens ?? 0,
  };
}

export async function answerWithFallback(payload) {
  try {
    if (env.ai.provider === 'local') throw new Error('Proveedor fijado en local');
    return await openAiAnswer(payload);
  } catch (error) {
    const local = await localAnswer(payload);
    return { ...local, fallbackReason: error.message };
  }
}

export { DISCLAIMER };
export default openAiAnswer;
