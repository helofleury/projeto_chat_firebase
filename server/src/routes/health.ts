import { Router } from 'express';

export const healthRouter = Router();

// GET /health — usado para verificar a disponibilidade da API (sem autenticação).
healthRouter.get('/', (_req, res) => {
  res.json({ status: 'ok', service: 'chat-firebase-api', time: new Date().toISOString() });
});
