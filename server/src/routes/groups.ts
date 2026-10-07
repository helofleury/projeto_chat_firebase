import { Router } from 'express';

import { HttpError, isRecord, requireId } from '../errors.js';
import { asyncHandler, authenticate, getUid } from '../middleware/authenticate.js';
import {
  addMember,
  assertValidLimit,
  createGroup,
  isNotificationPolicy,
  removeMember,
  updateLimit,
} from '../services/groupAdminService.js';

export const groupsRouter = Router();
groupsRouter.use(authenticate);

function bodyOf(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) throw new HttpError(400, 'invalid_request', 'Corpo da requisição inválido.');
  return value;
}

// POST /groups
groupsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const body = bodyOf(req.body);
    if (typeof body.name !== 'string') throw new HttpError(400, 'invalid_name', 'Nome do grupo inválido.');
    if (!Array.isArray(body.memberIds)) throw new HttpError(400, 'invalid_members', 'Lista de integrantes inválida.');
    if (!isNotificationPolicy(body.notificationPolicy)) {
      throw new HttpError(400, 'invalid_policy', 'Política de notificação inválida.');
    }
    const memberIds = body.memberIds.map((id) => requireId(id, 'memberIds'));
    const groupId = await createGroup(getUid(req), {
      name: body.name,
      memberIds,
      memberLimit: assertValidLimit(body.memberLimit),
      notificationPolicy: body.notificationPolicy,
    });
    res.status(201).json({ groupId });
  }),
);

// POST /groups/:groupId/members  { memberId }
groupsRouter.post(
  '/:groupId/members',
  asyncHandler(async (req, res) => {
    const groupId = requireId(req.params.groupId, 'groupId');
    const memberId = requireId(bodyOf(req.body).memberId, 'memberId');
    await addMember(groupId, getUid(req), memberId);
    res.json({ ok: true });
  }),
);

// DELETE /groups/:groupId/members/:memberId
groupsRouter.delete(
  '/:groupId/members/:memberId',
  asyncHandler(async (req, res) => {
    const groupId = requireId(req.params.groupId, 'groupId');
    const memberId = requireId(req.params.memberId, 'memberId');
    await removeMember(groupId, getUid(req), memberId);
    res.json({ ok: true });
  }),
);

// PATCH /groups/:groupId/limit  { memberLimit }
groupsRouter.patch(
  '/:groupId/limit',
  asyncHandler(async (req, res) => {
    const groupId = requireId(req.params.groupId, 'groupId');
    const limit = assertValidLimit(bodyOf(req.body).memberLimit);
    await updateLimit(groupId, getUid(req), limit);
    res.json({ ok: true });
  }),
);
