export const CATEGORIES = [
  {
    key: 'alimentacion',
    label: 'Alimentacion',
    weight: 1,
    keywords: [
      'comer', 'comida', 'alimento', 'dieta', 'nutricion', 'fruta', 'verdura', 'carne',
      'pescado', 'leche', 'cafe', 'cafeina', 'alcohol', 'vino', 'vitamina', 'suplemento',
      'acido folico', 'hierro', 'calcio', 'proteina', 'snack', 'ayuno', 'vegetariano',
      'vegetariana', 'hambre', 'antojo', 'lactancia', 'amamantar', 'leche maternal',
      'cuanto peso', 'ganar peso', 'engordar', 'menu', 'desayuno', 'cena', 'comida',
    ],
  },
  {
    key: 'sintomas',
    label: 'Sintomas',
    weight: 1.15,
    keywords: [
      'sintoma', 'dolor', 'duele', 'duelo', 'mareo', 'nausea', 'nauseas', 'vomito',
      'reflujo', 'acidez', 'gastritis', 'estreñimiento', 'estrenimiento', 'diarrea',
      'hemorr', 'sangrado', 'sangrando', 'sangro', 'picazon', 'comezon', 'hinchazon',
      'calambre', 'calambres', 'cansancio', 'fatiga', 'quemazon', 'flujo', 'sangre',
      'cefalea', 'dolor de cabeza', 'espirazo', 'melanina', 'gases', 'contractura',
      'espalda', 'lumbalgia', 'cervical', 'hombro', 'hombros', 'pubis', 'pelvis',
      'malestar', 'molestia', 'ardor', 'lloro', 'urgente', 'no puedo dormir',
    ],
  },
  {
    key: 'controles',
    label: 'Controles',
    weight: 1.1,
    keywords: [
      'control', 'consulta', 'ecografia', 'ultrasonido', 'analisis', 'examen', 'medico',
      'obstetra', 'ginecologo', 'ginecologa', 'cita', 'tamizaje', 'screening', 'glucosa',
      'diabetes', 'presion', 'uroanalisis', 'sangre', 'gbs', 'historia clinica', 'riesgo',
      'cartilla', 'laboratorio', 'resultados', 'programa', 'ecografias', 'analisis',
      'esta bien', 'todo bien', 'salud del bebe', 'revision',
    ],
  },
  {
    key: 'ejercicio',
    label: 'Ejercicio',
    weight: 1.1,
    keywords: [
      'ejercicio', 'ejercicios', 'gimnasio', 'caminar', 'caminata', 'correr', 'yoga',
      'pilates', 'natacion', 'nadar', 'deporte', 'entrenamiento', 'rutina', 'movimiento',
      'actividad fisica', 'pesas', 'entrenar', 'postura', 'suelo pelvico', 'kegel',
      'incontinencia', 'caminando', 'maraton', 'ciclismo', 'bicicleta', 'escalar',
    ],
  },
  {
    key: 'desarrollo',
    label: 'Desarrollo del bebe',
    weight: 1.05,
    keywords: [
      'bebe', 'feto', 'hijo', 'hija', 'crecimiento', 'tamano', 'tamaño', 'medida',
      'longitud', 'corazon', 'latido', 'movimiento', 'movimientos', 'se mueve', 'me mueve',
      'inteligencia', 'desarrollo', 'hablar', 'caminar', 'dientes', 'llorar', 'estimular',
      'estimulacion', 'musica', 'hablarle', 'leer', 'patadas', 'peso del bebe', 'girth',
    ],
  },
  {
    key: 'parto',
    label: 'Parto y preparacion',
    weight: 1.1,
    keywords: [
      'parto', 'nacer', 'nacimiento', 'labor', 'dilatacion', 'contraccion', 'contracciones',
      'epidural', 'cesarea', 'plan de parto', 'maleta', 'bolsa', 'empacar', 'informe',
      'posparto', 'alivio', 'hospitalizar', 'que llevo', 'empac', 'hospital', 'nacimiento',
      'como sera el parto', 'cuando parto', 'fecha de parto', 'mi bebe llega', 'cuanto falta',
    ],
  },
  {
    key: 'emocional',
    label: 'Bienestar emocional',
    weight: 1,
    keywords: [
      'ansiedad', 'ansiedad', 'nervios', 'nerviosa', 'preocupacion', 'preocupada', 'miedo',
      'medo', 'emocional', 'animo', 'irritable', 'dormir', 'sueno', 'apoyo', 'sola',
      'solo', 'bienestar', 'autoestima', 'culpa', 'triste', 'depresion', 'llanto',
      'me siento sola', 'amigos', 'acompan',
    ],
  },
];

export const DEFAULT_CATEGORY = 'general';

const STOP_WORDS = new Set([
  'los', 'las', 'del', 'que', 'como', 'por', 'para', 'con', 'sus', 'este', 'esta',
  'estoy', 'pero', 'muy', 'mas', 'todo', 'puedo', 'tiene', 'tengo', 'hacer', 'donde',
  'cuando', 'porque', 'mejor', 'deberia', 'queria', 'ayuda', 'ayudan', 'siento',
  'the', 'and', 'you', 'for', 'are', 'not', 'but', 'have', 'was', 'can', 'what',
  'tell', 'about', 'that', 'this', 'with', 'from',
]);

const SHORT_STOP_WORDS = new Set([
  'el', 'la', 'un', 'una', 'al', 'y', 'o', 'me', 'mi', 'se', 'es', 'a', 'en', 'lo',
  'le', 'si', 'no', 'de', 'va', 'he', 'ha',
]);

function normalize(text) {
  return String(text ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function tokenize(text) {
  return normalize(text)
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 2 && !STOP_WORDS.has(token) && !SHORT_STOP_WORDS.has(token));
}

/**
 * Deterministic keyword classifier.
 * The LLM receives this as a hint, but the answer never depends on it,
 * so the feature keeps working without any API key.
 *
 * Scoring:
 *  - multi word phrase match  -> 3 points
 *  - exact token match       -> 2 points
 *  - stem match (prefix >=4) -> 1 point
 *  - category weight breaks ties between equally scored categories
 *  - earliest mention in the sentence breaks the remaining ties
 */
export function classifyQuestion(message) {
  const tokens = [...tokenize(message)];
  const tokenSet = new Set(tokens);
  const haystack = normalize(message);

  let best = {
    category: DEFAULT_CATEGORY,
    label: 'General',
    confidence: 0.25,
    matches: [],
    score: 0,
    firstIndex: Number.POSITIVE_INFINITY,
  };

  for (const category of CATEGORIES) {
    const matches = [];
    let score = 0;
    let firstIndex = Number.POSITIVE_INFINITY;

    for (const keyword of category.keywords) {
      const normalizedKeyword = normalize(keyword);

      if (normalizedKeyword.includes(' ')) {
        if (haystack.includes(normalizedKeyword)) {
          matches.push(keyword);
          score += 3;
          firstIndex = Math.min(firstIndex, haystack.indexOf(normalizedKeyword));
        }
        continue;
      }

      if (tokenSet.has(normalizedKeyword)) {
        matches.push(keyword);
        score += 2;
        const index = tokens.indexOf(normalizedKeyword);
        if (index >= 0) firstIndex = Math.min(firstIndex, index);
        continue;
      }

      const stemIndex = tokens.findIndex(
        (token) =>
          normalizedKeyword.length > 4 &&
          (token.startsWith(normalizedKeyword) || normalizedKeyword.startsWith(token)),
      );

      if (stemIndex >= 0) {
        matches.push(keyword);
        score += 1;
        firstIndex = Math.min(firstIndex, stemIndex);
      }
    }

    const total = score * (category.weight ?? 1);

    if (total > 0 && (total > best.score || (total === best.score && firstIndex < best.firstIndex))) {
      best = {
        category: category.key,
        label: category.label,
        confidence: Number(Math.min(0.95, 0.4 + total * 0.12).toFixed(2)),
        matches,
        score: total,
        firstIndex,
      };
    }
  }

  return {
    category: best.category,
    label: best.label,
    confidence: best.confidence,
    matches: best.matches,
  };
}

export function categoryLabel(key) {
  return CATEGORIES.find((c) => c.key === key)?.label ?? 'General';
}

export const CATEGORY_KEYS = CATEGORIES.map((c) => c.key);
