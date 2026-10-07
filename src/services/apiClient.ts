import { auth } from './firebase';
import { ApiError } from '../utils/errors';
import { isRecord } from '../utils/validation';

const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/+$/, '');
const REQUEST_TIMEOUT_MS = 20000;

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

function extractError(body: unknown, status: number): ApiError {
  if (isRecord(body) && isRecord(body.error)) {
    const { code, message } = body.error;
    if (typeof code === 'string' && typeof message === 'string') {
      return new ApiError(message, status, code);
    }
  }
  if (status === 401) return new ApiError('Sua sessão expirou. Entre novamente.', status, 'unauthorized');
  return new ApiError('Não foi possível concluir a operação. Tente novamente.', status, 'unknown');
}

/**
 * Chamada autenticada à API própria. Envia o ID token do Firebase Authentication
 * no cabeçalho Authorization; a API o valida com o Firebase Admin SDK.
 */
export async function apiRequest<TResponse>(
  method: HttpMethod,
  path: string,
  body?: object,
): Promise<TResponse> {
  if (API_URL === '') {
    throw new ApiError('A URL da API não está configurada (EXPO_PUBLIC_API_URL).', 0, 'api_not_configured');
  }
  const currentUser = auth.currentUser;
  if (!currentUser) throw new ApiError('Sua sessão expirou. Entre novamente.', 401, 'unauthorized');

  const token = await currentUser.getIdToken();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    const json: unknown = await response.json().catch(() => null);
    if (!response.ok) throw extractError(json, response.status);
    return json as TResponse;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError('Falha de conexão com o servidor. Verifique sua internet.', 0, 'network');
  } finally {
    clearTimeout(timer);
  }
}
