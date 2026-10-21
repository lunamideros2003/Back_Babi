// Curated educational content used by the local provider and injected as grounding
// context into the LLM prompt. Spanish copy, no diagnostic claims.
//
// `question` and `keywords` stay without accents on purpose: they are compared
// against what the person writes, which rarely comes with accents. `answer` is
// text that a human reads, so it is written with correct Spanish.
export const knowledgeBase = [
  {
    category: 'alimentacion',
    question: 'que puedo comer',
    keywords: ['alimentacion', 'comer', 'dieta', 'nutricion', 'menu', 'que como'],
    answer:
      'La regla general es variedad: verduras, frutas, granos integrales, legumbres, proteína magra y ' +
      'lácteos pasteurizados. Intenta comer unas cinco porciones de vegetales y frutas al día. Prioriza ' +
      'hierro (carnes, legumbres, espinaca), calcio (lácteos) y ácido fólico. Reduce la cafeína por debajo ' +
      'de 200 mg al día y evita por completo el alcohol, el pescado crudo, los productos sin pasteurizar y ' +
      'los embutidos crudos.',
  },
  {
    category: 'alimentacion',
    question: 'cuanto peso puedo ganar',
    keywords: ['peso', 'ganar peso', 'cuanto peso', 'aumento de peso', 'engordo'],
    answer:
      'El aumento de peso ideal depende de tu índice de masa corporal previo: cerca de 11.5 a 16 kg si ' +
      'tenías peso normal, entre 7 y 11.5 kg si tenías sobrepeso, y de 5 a 9 kg si tenías obesidad. El ritmo ' +
      'típico es de 1 a 2 kg en el primer trimestre y unos 450 g por semana después. Tu obstetra ajusta esto ' +
      'a tu caso.',
  },
  {
    category: 'alimentacion',
    question: 'puedo tomar cafe',
    keywords: ['cafe', 'cafeina', 'te', 'cacao', 'chocolate'],
    answer:
      'La guía general es no superar 200 mg de cafeína al día, lo que equivale aproximadamente a una o dos ' +
      'tazas de café. La cafeína no está prohibida, pero el exceso se asocia con mayor riesgo de restricción ' +
      'en el crecimiento fetal. El té sin cafeína y el agua con limón son alternativas seguras.',
  },
  {
    category: 'sintomas',
    question: 'nauseas',
    keywords: ['nauseas', 'nausea', 'vomito', 'marear', 'asqueo'],
    answer:
      'Las náuseas son muy comunes entre las semanas 6 y 14. Ayuda comer porciones pequeñas y ' +
      'frecuentes, evitar ayunos largos, comer galletas saladas antes de levantarte, beber agua con ' +
      'jengibre o infusión de manzanilla, y descansar. La vitamina B6 suele ser la primera opción que te ' +
      'indica tu obstetra para este tipo de molestia. Si no puedes retener líquidos, contacta a tu médico.',
  },
  {
    category: 'sintomas',
    question: 'reflujo',
    keywords: ['reflujo', 'acidez', 'gastritis', 'ardor', 'estomago', 'pirosis'],
    answer:
      'El reflujo aparece porque el útero ocupa espacio y relaja el esfínter del estómago. Come poco y ' +
      'seguido, evita grasas, frituras, picante, café y bebidas carbonatadas, no te acuestes justo después ' +
      'de comer, y eleva la cabecera de la cama unos 10 cm. Dormir del lado izquierdo también ayuda.',
  },
  {
    category: 'sintomas',
    question: 'estreñimiento',
    keywords: ['estreñimiento', 'estrenimiento', 'dificultad para ir al bano', 'fibra', 'constipacion'],
    answer:
      'La progesterona relaja los músculos del intestino y lo hace más lento. Aumenta la fibra (fruta, ' +
      'verdura, ciruela, kiwi), toma suficiente agua y camina a diario. Si tu obstetra lo aprueba, suele ' +
      'permitir laxantes osmóticos suaves como la lactulosa.',
  },
  {
    category: 'sintomas',
    question: 'dolor de espalda',
    keywords: ['espalda', 'lumbalgia', 'dolor de espalda', 'cervical', 'hombros'],
    answer:
      'El dolor lumbar es muy frecuente porque el peso se desplaza hacia adelante y los ligamentos se ' +
      'estiran. Ayuda mantener la espalda recta al sentarte, doblar las rodillas al recoger cosas, dormir ' +
      'de lado con almohada entre las piernas, y usar una pelota de parto o un cojín para sentar. El ' +
      'ejercicio suave suele mejorarlo.',
  },
  {
    category: 'sintomas',
    question: 'sangrado',
    keywords: ['sangrado', 'sangro', 'sangre', 'manchado', 'sangramiento'],
    answer:
      'Un manchado rosado o café oscuro leve puede ocurrir sin motivo aparente. Sin embargo, sangrado ' +
      'abundante, sangrado rojo intenso, dolor intenso o mareo requieren contacto urgente con tu equipo ' +
      'médico. Este asistente no puede evaluar tu caso clínico.',
  },
  {
    category: 'controles',
    question: 'que controles necesito',
    keywords: ['controles', 'citas', 'analisis', 'tamizaje', 'que examenes', 'control', 'seguimiento'],
    answer:
      'Un control típico incluye: primer trimestre, con confirmación del embarazo y tamizaje inicial; ' +
      'segundo trimestre, con ecografía anatómica entre 18 y 22 semanas y tamizaje de diabetes gestacional ' +
      'entre 24 y 28 semanas; tercer trimestre, con control mensual y luego semanal desde la semana 36, ' +
      'incluyendo la prueba de estreptococo grupo B entre 36 y 37 semanas. Tu clínica puede modificar el ' +
      'calendario.',
  },
  {
    category: 'controles',
    question: 'ecografia',
    keywords: ['ecografia', 'ultrasonido', 'eco', 'cuantas ecografias', 'ultrason'],
    answer:
      'No hay un número único universal. Lo habitual es una ecografía de datación al inicio, una anatómica ' +
      'en el segundo trimestre, y las de control que indique tu obstetra en el tercer trimestre. La ' +
      'ecografía del primer trimestre, entre 11 y 13.6 semanas, mide la translucencia nucal.',
  },
  {
    category: 'controles',
    question: 'el bebe esta bien',
    keywords: ['bebe esta bien', 'esta bien', 'todo bien', 'salud del bebe', 'es normal'],
    answer:
      'Solo tu obstetra, con los exámenes correspondientes, puede confirmar que todo va bien. Aquí puedo ' +
      'explicarte los cambios que se esperan en cada semana, pero no puedo evaluar la salud de tu bebé ni ' +
      'hacer diagnósticos.',
  },
  {
    category: 'ejercicio',
    question: 'puedo hacer ejercicio',
    keywords: ['ejercicio', 'deporte', 'gimnasio', 'correr', 'entrenar', 'yoga', 'natacion', 'pesas'],
    answer:
      'Si no tienes contraindicación, se recomiendan 150 minutos semanales de actividad moderada: caminar, ' +
      'nadar, yoga o pilates. Evita deportes de contacto, caídas, el ciclismo de montaña, el buceo y ' +
      'cualquier esfuerzo con riesgo de golpe en el abdomen. Detente si sientes mareo, falta de aire ' +
      'inusual, dolor pélvico o sangrado.',
  },
  {
    category: 'ejercicio',
    question: 'suelo pelvico',
    keywords: ['suelo pelvico', 'kegel', 'incontinencia', 'pelvico', 'perineo'],
    answer:
      'El embarazo y el parto debilitan el suelo pélvico, por eso los ejercicios Kegel se recomiendan ' +
      'desde temprano y durante todo el embarazo. Practica contracciones suaves, tres series de diez ' +
      'repeticiones, tres veces al día, sin aguantar la respiración. Se retoman en la recuperación ' +
      'posparto.',
  },
  {
    category: 'desarrollo',
    question: 'que se siente',
    keywords: ['que se siente', 'movimiento', 'me mueve', 'se mueve', 'siento', 'patadas'],
    answer:
      'El primer movimiento se siente entre las semanas 16 y 20 y se percibe como burbujas o golpecitos. ' +
      'Después se vuelve más fuerte y con patrón: el bebé tiene ciclos de actividad y descanso, ' +
      'normalmente más activo al anochecer. Si ya sentías movimientos de forma constante y notas un ' +
      'cambio marcado, consulta a tu obstetra.',
  },
  {
    category: 'desarrollo',
    question: 'como estimular',
    keywords: ['estimular', 'estimulacion', 'hablarle', 'musica', 'leer', 'inteligencia'],
    answer:
      'A partir del segundo trimestre puedes simplemente hablarle, leer en voz alta, poner música suave y ' +
      'tocar tu panza cuando notes movimientos. Lo importante no es un estímulo específico sino la ' +
      'interacción y tu calma: el desarrollo cerebral ocurre por sí solo.',
  },
  {
    category: 'parto',
    question: 'que llevo al hospital',
    keywords: ['maleta', 'bolsa', 'que llevo', 'hospital', 'empacar', 'equipaje'],
    answer:
      'Lleva documentación, historial clínico, ropa cómoda y ropa interior para el postparto, artículos de ' +
      'aseo personal, calcetines y snacks para el parto. La mayoría de hospitales proporciona lo básico, ' +
      'pero confírmalo con tu clínica. Prepara la maleta entre las semanas 32 y 34.',
  },
  {
    category: 'parto',
    question: 'cuando es el parto',
    keywords: ['cuando parto', 'fecha de parto', 'mi bebe llega', 'cuanto falta', 'faltan semanas'],
    answer:
      'La fecha probable es una estimación, no una cita. Solo alrededor del 5 por ciento de los bebés nacen ' +
      'ese día exacto. La gran mayoría nace entre las semanas 37 y 42, y tu cuerpo tiene su propio reloj.',
  },
  {
    category: 'parto',
    question: 'dolor del parto',
    keywords: ['dolor del parto', 'dolores', 'cuanto duele', 'anestesia', 'epidural'],
    answer:
      'Cada parto es distinto. Hay de laboratorio inicial, de transición y de expulsión, y la intensidad ' +
      'varía mucho entre personas. Lo mejor es hablar de tus preferencias de analgesia con tu obstetra ' +
      'antes del parto y conocer las técnicas de respiración y las posiciones verticales que te puedan ' +
      'ayudar en cada etapa.',
  },
  {
    category: 'emocional',
    question: 'ansiedad',
    keywords: ['ansiedad', 'nervios', 'preocupacion', 'miedo', 'asustada', 'angustia'],
    answer:
      'La ansiedad durante el embarazo es más común de lo que parece. Ayuda hablar de tus sentimientos ' +
      'con tu pareja o tu obstetra, dormir bien, moverte con suavidad, respirar lento (cuatro segundos ' +
      'inhalando y seis exhalando) y aceptar que los cambios de ánimo son parte del proceso hormonal. Si la ' +
      'ansiedad te impide funcionar o aparecen síntomas depresivos, busca atención profesional: no tienes ' +
      'por qué atravesar esto sola.',
  },
  {
    category: 'emocional',
    question: 'no duermo',
    keywords: ['no duermo', 'insomnio', 'dormir', 'sueno'],
    answer:
      'El insomnio es muy común en el tercer trimestre por la incomodidad, el reflujo y la ansiedad. Prueba ' +
      'con el lado izquierdo, almohada entre las piernas y otra bajo la panza, baños tibios, evitar ' +
      'pantallas una hora antes y horarios regulares. Si es persistente, coméntalo con tu obstetra.',
  },
  {
    category: 'emocional',
    question: 'me siento sola',
    keywords: ['sola', 'solo', 'apoyo', 'amigos', 'familia', 'madre'],
    answer:
      'Es muy común sentirse un poco sola durante esta etapa. Hablar con otras mujeres en tu misma ' +
      'situación ayuda mucho: grupos de apoyo, clases de yoga prenatal y clases de parto conectan a ' +
      'mujeres que comparten experiencias reales. Tu pareja y tu equipo médico son también una parte ' +
      'importante del apoyo.',
  },
];

export const faqQuestions = knowledgeBase.map((item) => ({
  category: item.category,
  question: item.question,
  answer: item.answer,
}));

export default knowledgeBase;
