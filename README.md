# BabyTrack IA - Backend

API REST del seguimiento del embarazo con asistente educativo de IA.

## Arquitectura

```
src/
  config/        Variables de entorno y textos legales
  db/            Conexion SQLite, esquema, seed y datos de las 40 semanas
  middleware/    Autenticacion JWT, validacion y manejo de errores
  modules/       (reservado para proximas iteraciones)
  repositories/  Acceso a datos (todas las queries viven aqui)
  routes/        Endpoints HTTP
  services/
    ai/          Capa de inteligencia artificial
      classifier.js     Clasificador de preguntas por categoria
      guardrails.js     Reglas de seguridad: no diagnosticar, no recetar
      knowledgeBase.js  Base de conocimiento educativa
      localProvider.js  Proveedor sin conexion (reglas y base de conocimiento)
      openaiProvider.js Proveedor con LLM (OpenAI)
      chatService.js    Orquestacion: seguridad -> clasificacion -> modelo
    reminderService.js  Generacion de recordatorios personalizados
  utils/         Aritmetica de embarazo, contrasenas, tokens
```

Flujo de una pregunta:

1. `guardrails` detecta senales de urgencia o peticiones de receta y responde sin llamar al modelo.
2. `classifier` asigna una categoria (alimentacion, sintomas, controles, ejercicio, desarrollo, parto, emocional).
3. Se responde con OpenAI si hay `OPENAI_API_KEY`, o con el proveedor local si no la hay.
4. La respuesta y la categoria quedan guardadas en `chat_messages`.

## Base de datos

SQLite usando el modulo nativo de Node (`node:sqlite`). No requiere instalar
nada ni compilar modulos nativos. El archivo se crea solo en `data/babytrack.sqlite`.

Tablas: `users`, `pregnancies`, `weeks`, `appointments`, `reminders`,
`chat_messages`, `checkup_logs`, `symptom_logs`, `bot_sessions`, `bot_answers`.

## Bot de preguntas

Modulo que le hace preguntas a la usuaria y devuelve una respuesta educativa
por cada una, mas un resumen final con un puntaje de seguimiento de 0 a 12.

- `services/bot/questionBank.js`: 10 preguntas de tipo opcion, escala,
  seleccion multiple y texto libre, separadas por categoria.
- `services/bot/botService.js`: reglas de feedback local, puntaje y resumen.
  Si hay `OPENAI_API_KEY` usa el modelo para redactar, y si no, las reglas.
- `routes/bot.routes.js`: endpoints del flujo.

El bot nunca diagnostica ni receta, igual que el resto del sistema.

## Comandos

```bash
npm install
npm run dev          # servidor con recarga automatica en :4001
npm start            # servidor normal, sin recarga
npm test             # 35 pruebas unitarias
npm run test:api     # prueba de humo del API (requiere el servidor)
npm run test:bot     # prueba de humo del bot (requiere el servidor)
npm run db:reset     # borra la base de datos
npm run db:seed      # recarga las 40 semanas
npm run check:copy   # revisa que los textos en espanol no esten corruptos
```

`npm run dev` usa un watcher propio (`scripts/dev.mjs`) que ignora
`node_modules` y la base de datos, para que no se reinicie en bucle.

Si el puerto 4001 esta ocupado, el servidor lo detecta, imprime el PID que lo
ocupa y la forma de liberarlo, en lugar de mostrar un error largo.

## Iniciar sesion

No hay usuario predeterminado. Registrate en el frontend con cualquier correo
valido y una contrasena de 6 caracteres o mas. Los usuarios se guardan en
`data/babytrack.sqlite`.

## Configuracion

Copia `.env.example` a `.env`. Sin `.env` todo funciona con valores por defecto,
incluida la IA en modo local.

| Variable | Por defecto | Descripcion |
| --- | --- | --- |
| `PORT` | `4001` | Puerto del servidor |
| `JWT_SECRET` | valor de desarrollo | Cambiar en produccion |
| `CORS_ORIGIN` | `http://localhost:5180` | Origenes permitidos |
| `DATABASE_FILE` | `./data/babytrack.sqlite` | Ruta de la base de datos |
| `AI_PROVIDER` | `auto` | `auto`, `openai` o `local` |
| `OPENAI_API_KEY` | vacio | Si falta, se usa el proveedor local |
| `OPENAI_MODEL` | `gpt-4o-mini` | Modelo usado |

## Endpoints

Publicos:

```
GET  /api/health
GET  /api/weeks
GET  /api/weeks/:number
GET  /api/weeks/calculate?dueDate=&lastPeriodDate=&week=
POST /api/auth/register
POST /api/auth/login
```

Con token (`Authorization: Bearer <token>`):

```
GET   /api/auth/me
PATCH /api/auth/me
GET   /api/pregnancy
POST  /api/pregnancy
PUT   /api/pregnancy
GET   /api/appointments?scope=upcoming|past|all
POST  /api/appointments
PUT   /api/appointments/:id
DELETE /api/appointments/:id
GET   /api/reminders?all=true
POST  /api/reminders
POST  /api/reminders/generate
PATCH /api/reminders/:id/toggle
DELETE /api/reminders/:id
GET   /api/chat/history
POST  /api/chat
POST  /api/chat/classify
GET   /api/chat/categories
GET   /api/bot/questions
GET   /api/bot/sessions
POST  /api/bot/sessions
GET   /api/bot/sessions/:id
POST  /api/bot/sessions/:id/answers
DELETE /api/bot/sessions/:id
POST  /api/bot/reset
GET   /api/tracking/timeline
GET   /api/tracking/checkups
POST  /api/tracking/checkups
GET   /api/tracking/symptoms
POST  /api/tracking/symptoms
```

Respuestas con la forma `{ ok: true, ... }` o
`{ ok: false, error: { code, message, details } }`.

## Activar la IA real

```bash
copy .env.example .env
```

Y pon tu clave en `OPENAI_API_KEY`. Sin clave, el asistente sigue funcionando con
el proveedor local: usa la misma base de conocimiento y el mismo contexto de
semana, solo cambia la redaccion.

## Seguridad clinica

El asistente esta disenado como educativo, no como diagnostico:

- Detecta sangrado, perdida de liquido, dolor intenso y falta de movimientos, y
  deriva a atencion urgente sin consultar al modelo.
- Rechaza peticiones de medicamentos o dosis y remite a obstetra o farmaceutico.
- El prompt del sistema prohibe expresamente diagnosticar y prescribe.
- Toda respuesta incluye el aviso de que no reemplaza una consulta medica.
