import { FirebaseError } from 'firebase/app';

/** Erro devolvido pela API própria (já traz mensagem amigável em português). */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

/** Erro de regra de negócio/validação gerado no próprio app. */
export class AppError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AppError';
  }
}

const AUTH_MESSAGES: Record<string, string> = {
  'auth/invalid-credential': 'E-mail ou senha incorretos.',
  'auth/invalid-login-credentials': 'E-mail ou senha incorretos.',
  'auth/wrong-password': 'E-mail ou senha incorretos.',
  'auth/user-not-found': 'E-mail ou senha incorretos.',
  'auth/invalid-email': 'O e-mail informado é inválido.',
  'auth/email-already-in-use': 'Já existe uma conta com este e-mail.',
  'auth/weak-password': 'A senha é fraca. Use pelo menos 6 caracteres.',
  'auth/too-many-requests': 'Muitas tentativas. Aguarde um pouco e tente novamente.',
  'auth/network-request-failed': 'Falha de conexão. Verifique sua internet.',
  'auth/user-disabled': 'Esta conta foi desativada.',
  'auth/user-token-expired': 'Sua sessão expirou. Entre novamente.',
  'auth/requires-recent-login': 'Sua sessão expirou. Entre novamente.',
};

const FIREBASE_MESSAGES: Record<string, string> = {
  'permission-denied': 'Você não tem permissão para realizar esta ação.',
  unauthenticated: 'Sua sessão expirou. Entre novamente.',
  unavailable: 'Serviço indisponível ou sem conexão. Tente novamente.',
  'deadline-exceeded': 'A operação demorou demais. Verifique sua conexão.',
  'not-found': 'O item solicitado não foi encontrado.',
  'storage/unauthorized': 'Você não tem permissão para enviar esta imagem.',
  'storage/canceled': 'O envio da imagem foi cancelado.',
  'storage/retry-limit-exceeded': 'Falha ao enviar a imagem. Verifique sua conexão.',
};

/** Converte qualquer erro em mensagem compreensível, sem detalhes internos. */
export function getErrorMessage(error: unknown): string {
  if (error instanceof AppError || error instanceof ApiError) return error.message;

  if (error instanceof FirebaseError) {
    return (
      AUTH_MESSAGES[error.code] ??
      FIREBASE_MESSAGES[error.code] ??
      FIREBASE_MESSAGES[error.code.replace(/^firestore\//, '')] ??
      'Ocorreu um erro inesperado. Tente novamente.'
    );
  }

  if (error instanceof Error) {
    // Realtime Database devolve erros genéricos com o texto PERMISSION_DENIED.
    if (error.message.includes('PERMISSION_DENIED')) {
      return FIREBASE_MESSAGES['permission-denied'];
    }
    if (error.message.includes('Network request failed')) {
      return 'Falha de conexão. Verifique sua internet.';
    }
  }
  return 'Ocorreu um erro inesperado. Tente novamente.';
}
