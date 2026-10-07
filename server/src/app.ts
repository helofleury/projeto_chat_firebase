import express, { type ErrorRequestHandler } from 'express';

import { HttpError } from './errors.js';
import { conversationsRouter } from './routes/conversations.js';
import { groupsRouter } from './routes/groups.js';
import { healthRouter } from './routes/health.js';
import { notificationsRouter } from './routes/notifications.js';

export const app = express();

app.disable('x-powered-by');
app.use(express.json({ limit: '10kb' }));

app.use('/health', healthRouter);
app.use('/notifications', notificationsRouter);
app.use('/groups', groupsRouter);
app.use('/conversations', conversationsRouter);

app.use((_req, _res, next) => {
  next(new HttpError(404, 'not_found', 'Rota não encontrada.'));
});

const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
  if (error instanceof HttpError) {
    res.status(error.status).json({ error: { code: error.code, message: error.message } });
    return;
  }
  // Detalhes internos ficam somente no log do servidor.
  console.error('Erro não tratado:', error);
  res.status(500).json({ error: { code: 'internal', message: 'Erro interno. Tente novamente mais tarde.' } });
};
app.use(errorHandler);
