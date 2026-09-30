import express from 'express';
import cors from 'cors';
import env from './config/env.js';
import { errorHandler, notFound } from './middleware/index.js';
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

export function createApp() {
  ensureDatabase();

  const app = express();

  app.use(cors({ origin: env.corsOrigin, credentials: true }));
  app.use(express.json({ limit: '256kb' }));

  app.use('/api', metaRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/weeks', weeksRoutes);
  app.use('/api/pregnancy', pregnancyRoutes);
  app.use('/api/appointments', appointmentsRoutes);
  app.use('/api/reminders', remindersRoutes);
  app.use('/api/chat', chatRoutes);
  app.use('/api/bot', botRoutes);
  app.use('/api/tracking', trackingRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

export default createApp;
