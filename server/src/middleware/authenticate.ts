import type { NextFunction, Request, RequestHandler, Response } from 'express';

import { HttpError } from '../errors.js';
import { adminAuth } from '../services/firebaseAdmin.js';

/** Valida o Firebase ID Token (Authorization: Bearer ...) com o Admin SDK. */
export const authenticate: RequestHandler = async (req: Request, _res: Response, next: NextFunction) => {
  const header = req.header('Authorization') ?? '';
  const match = /^Bearer (.+)$/.exec(header);
  if (!match) {
    next(new HttpError(401, 'unauthorized', 'Token de autenticação ausente.'));
    return;
  }
  try {
    const decoded = await adminAuth.verifyIdToken(match[1]);
    req.uid = decoded.uid;
    next();
  } catch {
    next(new HttpError(401, 'unauthorized', 'Sessão inválida ou expirada.'));
  }
};

export function getUid(req: Request): string {
  if (!req.uid) throw new HttpError(401, 'unauthorized', 'Usuário não autenticado.');
  return req.uid;
}

type AsyncHandler = (req: Request, res: Response) => Promise<void>;

/** Encaminha erros de handlers assíncronos ao middleware de erro. */
export function asyncHandler(handler: AsyncHandler): RequestHandler {
  return (req, res, next) => {
    handler(req, res).catch(next);
  };
}
