/**
 * Client for the discussion API (FastAPI, served same-origin under /api/v1).
 *
 *   GET  /api/v1/topics/{slug}/contributions   → { items: PublishedContribution[] }   (published only)
 *   POST /api/v1/topics/{slug}/contributions   ← NewContribution → 201 { id, status: "pending" }
 *        422 validation error · 429 rate limited
 */
export type ContributionKind = 'opinion' | 'case' | 'counterexample';

export type PublishedContribution = {
  id: string;
  kind: ContributionKind;
  body: string;
  published_at: string;
  lab_response?: string | null;
};

export type NewContribution = {
  kind: ContributionKind;
  body: string;
  /** Honeypot. Must stay empty. */
  website: string;
};

export const kindLabels: Record<ContributionKind, string> = {
  opinion: '观点',
  case: '匿名案例',
  counterexample: '反例',
};

export const BODY_MIN = 20;
export const BODY_MAX = 2000;

const base = '/api/v1';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(`${base}${path}`, {
      ...init,
      signal: controller.signal,
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...init?.headers },
    });
    if (!res.ok) throw new ApiError(res.status, res.statusText);
    const type = res.headers.get('content-type') ?? '';
    if (!type.includes('application/json')) throw new ApiError(502, 'Unexpected response');
    return (await res.json()) as T;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(0, 'Network unavailable');
  } finally {
    clearTimeout(timer);
  }
}

export const listContributions = (slug: string) =>
  request<{ items: PublishedContribution[] }>(`/topics/${encodeURIComponent(slug)}/contributions`);

export const createContribution = (slug: string, payload: NewContribution) =>
  request<{ id: string; status: 'pending' }>(`/topics/${encodeURIComponent(slug)}/contributions`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
