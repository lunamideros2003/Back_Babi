import express from 'express';
import cors from 'cors';
import env from './config/env.js';
import { errorHandler, notFound, asyncRouter } from './middleware/index.js';
import metaRoutes from './routes/meta.routes.js';
import authRoutes from './routes/auth.routes.js';
import weeksRoutes from './routes/weeks.routes.js';
import pregnancyRoutes from './routes/pregnancy.routes.js';
import appointmentsRoutes from './routes/appointments.routes.js';
import remindersRoutes from './routes/reminders.routes.js';
import chatRoutes from './routes/chat.routes.js';
import botRoutes from './routes/bot.routes.js';
import trackingRoutes from './routes/tracking.routes.js';
import { ensureDatabase } from './db/index.js';

export async function createApp() {
  await ensureDatabase();

  const app = express();

  app.use(cors({ origin: env.corsOrigin, credentials: true }));
  app.use(express.json({ limit: '256kb' }));

  app.use('/api', asyncRouter(metaRoutes));
  app.use('/api/auth', asyncRouter(authRoutes));
  app.use('/api/weeks', asyncRouter(weeksRoutes));
  app.use('/api/pregnancy', asyncRouter(pregnancyRoutes));
  app.use('/api/appointments', asyncRouter(appointmentsRoutes));
  app.use('/api/reminders', asyncRouter(remindersRoutes));
  app.use('/api/chat', asyncRouter(chatRoutes));
  app.use('/api/bot', asyncRouter(botRoutes));
  app.use('/api/tracking', asyncRouter(trackingRoutes));

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

export default createApp;
