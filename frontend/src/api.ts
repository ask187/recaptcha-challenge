import type {
  ClientEvent,
  CreateAttemptRequest,
  CreateAttemptResponse,
  LevelPayload,
  Submission,
  SubmitResponse,
} from '../../shared/types';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function call<T>(method: string, url: string, body?: unknown, headers: Record<string, string> = {}): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: { 'content-type': 'application/json', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, (json as { error?: string }).error ?? res.statusText);
  return json as T;
}

export const api = {
  createAttempt: (req: CreateAttemptRequest) => call<CreateAttemptResponse>('POST', '/api/attempts', req),
  startLevel: (id: string) => call<LevelPayload>('POST', `/api/attempts/${id}/level`),
  submit: (id: string, index: number, token: string, submission: Submission) =>
    call<SubmitResponse>('POST', `/api/attempts/${id}/levels/${index}/submit`, { token, submission }),
  events: (id: string, events: ClientEvent[]) => call<{ accepted: number }>('POST', `/api/attempts/${id}/events`, { events }),
};

export function evalApi(key?: string) {
  const h: Record<string, string> = key ? { 'x-eval-key': key } : {};
  return {
    get: <T,>(path: string) => call<T>('GET', `/api/eval${path}`, undefined, h),
    post: <T,>(path: string, body?: unknown) => call<T>('POST', `/api/eval${path}`, body ?? {}, h),
  };
}
