# Chat Firebase — React Native + Expo + Firebase

Aplicativo de chat **individual e em grupo** com mensagens em tempo real (Realtime Database), dados e configurações no Cloud Firestore, autenticação por **e-mail e senha** e **notificações push** enviadas por uma **API própria publicada na internet** (sem Cloud Functions).

## Integrantes


- Heloísa Fleury Jardim - RM556378
- Juan Fuentes Rufino - RM557673
- Paulo Henrique Monteiro Golovanevsky - RM555300
- Pedro Henrique Silva Batista - RM558137
- Rickelmyn de Souza Ruescas - RM556055

## Tecnologias

| Camada | Tecnologia |
|---|---|
| App | React Native, **Expo SDK 55**, TypeScript (strict, sem `any`), React Navigation |
| Backend (BaaS) | Firebase Authentication, Realtime Database, Cloud Firestore, Cloud Messaging (FCM), Firebase Storage |
| Push | `expo-notifications` (token FCM nativo no Android; Expo Push Token no iOS) |
| API de notificações | **Node.js 20 + Express + Firebase Admin SDK** (TypeScript), hospedada no Render |
| Imagens | **Firebase Storage** (somente a URL final é salva no Firestore) |

Versão do Expo: **SDK 55** (`expo ~55.0.0`). Hooks usados com finalidade real: `useState`, `useEffect`, `useMemo`, `useCallback` (+ hooks customizados `useAuth`, `useChat`, `useGroups`, `useUsers`, `useConversations`, `useNotifications`).

## Responsabilidade de cada serviço Firebase

| Serviço | Responsabilidade |
|---|---|
| **Authentication** | Cadastro/login por e-mail e senha, recuperação de sessão (AsyncStorage), identificação por `uid`, logout |
| **Realtime Database** | Todas as mensagens (`messages/{conversationId}/{messageId}`), listeners em tempo real e índice de acesso `conversationMembers` |
| **Cloud Firestore** | Perfis (`users`, `publicProfiles`), grupos (metadados, integrantes, `memberLimit`, `notificationPolicy`), conversas individuais, tokens de dispositivos (`users/{uid}/devices`), vínculos de perfil (`contacts`), log de idempotência (`notificationLogs`) |
| **Cloud Messaging** | Entrega dos pushes (segundo plano/app fechado) com `conversationId` e `conversationType` no payload |
| **Storage** | Fotos de perfil e de grupo |

## Estrutura do projeto

```
├── App.tsx / index.ts            # entrada do app
├── firebaseConfig.json           # config do SDK cliente (sem segredos)
├── firestore.rules               # regras do Firestore
├── database.rules.json           # regras do Realtime Database
├── storage.rules                 # regras do Storage
├── firebase.json                 # `firebase deploy --only firestore,database,storage`
├── .env.example                  # variáveis do app
├── src/
│   ├── components/               # Avatar, ChatMessage, ChatInput, ConversationItem, GroupMemberItem, UserList, ...
│   ├── screens/                  # Login, Register, Conversations, Users, GroupForm, GroupMembers, Chat, Profile
│   ├── services/                 # firebase, authService, userService, groupService, chatService, notificationService, apiClient, storageService, imageService
│   ├── hooks/                    # useAuth, useChat, useGroups, useUsers, useConversations, useNotifications
│   ├── contexts/                 # AuthContext, NotificationContext
│   ├── navigation/               # AppNavigator, navigationRef
│   ├── types/                    # user, chat, group, notification, navigation
│   └── utils/                    # conversationId, groupValidation, validation, errors, theme
└── server/                       # API online (Express + Admin SDK)
    ├── .env.example
    ├── render.yaml
    └── src/
        ├── app.ts / index.ts
        ├── middleware/authenticate.ts
        ├── routes/               # notifications, groups, conversations, health
        └── services/             # firebaseAdmin, notificationSender, recipientResolver (+ testes), groupAdminService, contactsService
```

## Instalação e execução do app

Pré-requisitos: Node 20+, conta Firebase, conta Expo (EAS), dispositivo físico para testar push.

```bash
npm install
npx expo install --fix          # alinha todas as dependências à versão do SDK 55
cp .env.example .env            # defina EXPO_PUBLIC_API_URL com a URL pública da API
npx expo start --dev-client     # após gerar o development build (abaixo)
```

### Development build (push **não** funciona só com Expo Go)

```bash
npm install -g eas-cli
eas login
eas init                               # copie o projectId gerado para app.json -> extra.eas.projectId
eas build --profile development --platform android
eas build --profile development --platform ios
```

## Configuração do Firebase

1. Crie um projeto em <https://console.firebase.google.com>.
2. Ative **Authentication → Sign-in method → E-mail/senha** (e somente ele).
3. Crie o **Cloud Firestore**, o **Realtime Database** e o **Storage** (o Storage exige o plano Blaze em projetos novos; o uso do trabalho fica dentro da cota gratuita).
4. Em *Configurações do projeto → Seus apps → Web*, registre um app web e copie a configuração para **`firebaseConfig.json`** (versionado; contém apenas o SDK cliente).
5. Publique as regras versionadas:
   ```bash
   npm install -g firebase-tools
   firebase login
   firebase use SEU_PROJECT_ID
   firebase deploy --only firestore:rules,database,storage
   ```

## Armazenamento de fotos

**Firebase Storage.** Caminhos: `profilePhotos/{uid}/avatar.jpg` e `groupPhotos/{groupId}/photo.jpg`. O app seleciona a imagem (`expo-image-picker`, com tratamento de permissão), envia o arquivo ao Storage e grava **apenas a URL** no Firestore. Quando não há foto (ou ela falha ao carregar) o app exibe um avatar padrão. Regras em `storage.rules` (somente imagens de até 5 MB; foto de grupo apenas pelo proprietário).

## Notificações push — Android e iOS

### Android (FCM)
1. No console Firebase, adicione um app **Android** com o pacote `br.com.exemplo.chatfirebase` (ajuste em `app.json`).
2. Baixe o **`google-services.json`** e coloque na raiz do projeto (já referenciado em `app.json → android.googleServicesFile`). Esse arquivo é configuração de cliente, não é credencial administrativa.
3. Para o envio funcionar com o app Expo, no EAS cadastre a **FCM V1 service account** (`eas credentials` → Android → Google Service Account Key for FCM V1). Essa chave fica no EAS, nunca no repositório.
4. O app obtém o **token FCM nativo** (`getDevicePushTokenAsync`) e a API envia direto pelo **FCM (Admin SDK)**.

### iOS
1. Conta Apple Developer + app com o bundle id `br.com.exemplo.chatfirebase`.
2. O EAS gera/gerencia a chave **APNs** (`eas credentials`).
3. O app obtém o **Expo Push Token** e a API entrega pelo **Expo Push Service** (que usa APNs). Os tokens ficam em `users/{uid}/devices/{deviceId}` com `tokenType: "expo"`.
4. Testar em aparelho físico (o simulador não recebe push remoto).

Token inválido (`registration-token-not-registered` / `DeviceNotRegistered`) é **desativado** (`enabled: false`) pela API. No logout o token do aparelho também é desativado.

## API online (notificações e operações seguras)

- **Tecnologia:** Node.js 20 + Express + `firebase-admin`, hospedada no **Render** (Web Service, plano gratuito/Starter). Use plano que não "durma" durante a correção (ou configure um monitor de uptime em `/health`).
- **URL pública (HTTPS):** `https://SUA-API.onrender.com`  ← **substitua pela URL real e envie também pelo Teams**

### Executar localmente (apenas desenvolvimento)
```bash
cd server
npm install
cp .env.example .env     # preencha com a conta de serviço (somente local; .env é ignorado pelo git)
npm run dev
npm test                 # testes da política de destinatários
```

### Publicar no Render
1. Crie um *Web Service* apontando para este repositório (Root Directory: `server`; o `render.yaml` já traz build `npm install && npm run build`, start `npm start`, health check `/health`).
2. No Firebase: *Configurações → Contas de serviço → Gerar nova chave privada*. Crie uma conta de serviço com permissões mínimas (Firebase Authentication Admin, Cloud Datastore User, Firebase Realtime Database Admin, Firebase Cloud Messaging API Admin).
3. Em *Environment* do Render cadastre **somente como variáveis secretas** (nunca no GitHub): 
   `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_DATABASE_URL`.
4. Confirme: `curl https://SUA-API.onrender.com/health` → `{"status":"ok",...}`.

### Endpoints

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET | `/health` | não | Verificação de disponibilidade |
| POST | `/notifications/messages` | Bearer ID Token | `{conversationId, messageId}` → valida token, mensagem e remetente, calcula destinatários, envia push (idempotente) |
| POST | `/conversations/direct` | Bearer | `{otherUserId}` → cria/localiza a conversa individual (id = uids ordenados) |
| POST | `/groups` | Bearer | Cria grupo (`name`, `memberIds`, `memberLimit`, `notificationPolicy`) |
| POST | `/groups/:id/members` | Bearer (dono) | `{memberId}` → adiciona integrante (transação) |
| DELETE | `/groups/:id/members/:memberId` | Bearer (dono ou o próprio) | Remove integrante / sair do grupo |
| PATCH | `/groups/:id/limit` | Bearer (dono) | `{memberLimit}` → altera o limite |

Exemplo:
```bash
curl -X POST https://SUA-API.onrender.com/notifications/messages \
  -H "Authorization: Bearer <firebase-id-token>" -H "Content-Type: application/json" \
  -d '{"conversationId":"abc","messageId":"-Nxyz"}'
```

## Política de notificações

Definida pelo proprietário em `groups/{id}.notificationPolicy`. **Os destinatários são calculados no servidor** (`recipientResolver.ts`), nunca recebidos do app:

| Política | Quem recebe push |
|---|---|
| `all_group_messages` | Todos os integrantes, exceto o remetente |
| `mentioned_members` | Somente integrantes mencionados/selecionados (exceto o remetente) |
| `direct_messages_only` | Mensagens de grupo não geram push; conversas individuais sim |
| `disabled` | Nenhuma mensagem de grupo gera push |

Regras gerais: remetente nunca é notificado; só participantes da conversa; conversa individual notifica sempre o outro participante; o texto do push é genérico (não expõe o conteúdo); payload com `conversationId`, `conversationType` e `messageId`; tocar na notificação abre a conversa (`useNotifications` + `navigationRef`). **Idempotência:** a API registra `notificationLogs/{conversationId}__{messageId}` dentro de uma transação; reenvios retornam `duplicate` sem novo push.

Fluxo: app grava a mensagem no RTDB → listeners atualizam a tela → app chama a API → API valida token (`verifyIdToken`), confere no RTDB que a mensagem existe e `senderId == uid`, lê participantes/política/tokens no Firestore → envia via FCM (Android) ou Expo Push (iOS).

## Limite de integrantes e concorrência

`memberLimit` é definido na criação (inteiro entre 2 e 50), pode ser alterado pelo proprietário e **nunca abaixo da quantidade atual**. A UI mostra `X/limite · N vagas disponíveis`, mas isso é só conveniência. A garantia real está na **API**: `addMember` roda em uma **transação do Firestore** que lê o grupo, confere `memberIds.length < memberLimit` e grava de forma atômica. Se duas requisições disputarem a última vaga, o Firestore reexecuta a transação perdedora, que passa a ver o grupo cheio e responde `409 group_full`. O cliente não consegue contornar: as regras do Firestore **proíbem** o cliente de alterar `memberIds`, `ownerId` e `memberLimit`.

## Decisão de segurança entre os dois bancos

O Realtime Database não consegue consultar o Firestore. Por isso a API mantém, com o Admin SDK, o índice `conversationMembers/{conversationId}/{uid} = true` no RTDB, e as regras de `messages` o usam para permitir **leitura e escrita somente a participantes**, com `senderId == auth.uid`. Remover um integrante apaga a entrada: ele deixa de ler e enviar mensagens imediatamente. Do mesmo modo, a API mantém `users/{uid}/contacts/{outro}` para as regras do Firestore liberarem os **dados cadastrais completos** somente a quem compartilha conversa/grupo (todos os autenticados enxergam apenas `publicProfiles`: nome e foto). Validações que dependem dos dois serviços (mensagem existe + remetente + política + tokens) ficam na API.

## Regras de segurança

Versionadas na raiz: [`firestore.rules`](firestore.rules), [`database.rules.json`](database.rules.json), [`storage.rules`](storage.rules). Resumo:

- Nenhuma regra aberta; tudo exige autenticação.
- Mensagens: somente participantes leem/escrevem; `senderId == auth.uid`; `createdAt == now`; sem edição/remoção; campos extras rejeitados.
- Grupos: leitura só para integrantes; criação/membros/limite só pela API; proprietário edita nome, foto e política.
- Tokens de dispositivo: só o dono lê/escreve. `notificationLogs` e `contacts`: somente Admin SDK.
- Perfil completo: dono ou quem tem conversa/grupo em comum.

## Tratamento de erros e estados

Loading, erro com "tentar novamente", usuário não autenticado, sem conversas, sem usuários, grupo sem vagas, conversa vazia, falha/timeout de envio (mensagem fica na fila offline), permissão de notificação negada, aparelho sem token, falha de conectividade e sessão expirada. Mensagens amigáveis centralizadas em `utils/errors.ts` (sem expor detalhes internos).

## Prints das telas

> Inclua em `docs/prints/` e referencie aqui:

| Login/Cadastro | Conversas | Grupo | Chat |
|---|---|---|---|
| ![](docs/prints/login.png) | ![](docs/prints/conversas.png) | ![](docs/prints/grupo.png) | ![](docs/prints/chat.png) |

### Evidência de notificação recebida

![](docs/prints/push.png)

## Checklist de entrega

- [ ] `firebaseConfig.json` preenchido com o projeto real (sem credenciais admin)
- [ ] `google-services.json` na raiz (Android) e `extra.eas.projectId` no `app.json`
- [ ] Regras publicadas (`firebase deploy`)
- [ ] API publicada, variáveis secretas configuradas, `/health` respondendo
- [ ] `EXPO_PUBLIC_API_URL` apontando para a API
- [ ] Prints e evidência de push adicionados
- [ ] Nome e RM de todos os integrantes
- [ ] Link do repositório + URL da API enviados pelo Microsoft Teams
