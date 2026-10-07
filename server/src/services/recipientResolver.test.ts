import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { ConversationContext, NotificationPolicy, StoredMessage } from '../types/index.js';
import { resolveRecipients } from './recipientResolver.js';

const members = ['alice', 'bob', 'carol', 'dave'];

function group(policy: NotificationPolicy): ConversationContext {
  return { type: 'group', participantIds: members, policy, name: 'Grupo' };
}

function message(overrides: Partial<StoredMessage> = {}): StoredMessage {
  return {
    conversationType: 'group',
    senderId: 'alice',
    text: 'oi',
    target: { type: 'conversation' },
    mentionedUserIds: [],
    createdAt: 1,
    ...overrides,
  };
}

test('all_group_messages notifica todos, exceto o remetente', () => {
  assert.deepEqual(resolveRecipients(group('all_group_messages'), message()).sort(), ['bob', 'carol', 'dave']);
});

test('mentioned_members notifica apenas mencionados/selecionados', () => {
  const msg = message({ mentionedUserIds: ['bob'], target: { type: 'member', memberId: 'carol' } });
  assert.deepEqual(resolveRecipients(group('mentioned_members'), msg).sort(), ['bob', 'carol']);
});

test('mentioned_members sem menção não notifica ninguém', () => {
  assert.deepEqual(resolveRecipients(group('mentioned_members'), message()), []);
});

test('mentioned_members ignora quem não é integrante e o próprio remetente', () => {
  const msg = message({ mentionedUserIds: ['alice', 'intruso', 'dave'] });
  assert.deepEqual(resolveRecipients(group('mentioned_members'), msg), ['dave']);
});

test('direct_messages_only e disabled não notificam mensagens de grupo', () => {
  assert.deepEqual(resolveRecipients(group('direct_messages_only'), message()), []);
  assert.deepEqual(resolveRecipients(group('disabled'), message()), []);
});

test('conversa individual notifica apenas o outro participante', () => {
  const direct: ConversationContext = { type: 'direct', participantIds: ['alice', 'bob'] };
  assert.deepEqual(resolveRecipients(direct, message({ conversationType: 'direct' })), ['bob']);
});
