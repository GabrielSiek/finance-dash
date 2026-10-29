// ---------- Pluggy client ----------
// The Pluggy CLIENT_SECRET never leaves this process.

import axios from 'axios';
import { HttpError } from './http-error.ts';
import type { Page, CursorPage } from './pluggy-types.ts';

const PLUGGY_API = process.env.PLUGGY_API_URL || 'https://api.pluggy.ai';
const { PLUGGY_CLIENT_ID, PLUGGY_CLIENT_SECRET } = process.env;
export const INCLUDE_SANDBOX = process.env.PLUGGY_INCLUDE_SANDBOX !== 'false';
export const configured = () => Boolean(PLUGGY_CLIENT_ID && PLUGGY_CLIENT_SECRET);

// Bodies come back as raw text so error messages can quote them; successful ones are parsed below.
const http = axios.create({
  baseURL: PLUGGY_API,
  responseType: 'text',
  transformResponse: (data: string) => data,
  validateStatus: () => true,
});
const ok = (status: number) => status >= 200 && status < 300;

let cachedKey: { value: string; expiresAt: number } | null = null;

export async function getApiKey(): Promise<string> {
  if (cachedKey && Date.now() < cachedKey.expiresAt) return cachedKey.value;
  const res = await http.post<string>('/auth', { clientId: PLUGGY_CLIENT_ID, clientSecret: PLUGGY_CLIENT_SECRET });
  if (!ok(res.status)) throw new HttpError(502, `Pluggy auth failed (${res.status}). Check PLUGGY_CLIENT_ID / PLUGGY_CLIENT_SECRET in .env.`);
  const { apiKey } = JSON.parse(res.data) as { apiKey: string };
  // API keys last 2h; refresh a little early.
  cachedKey = { value: apiKey, expiresAt: Date.now() + 110 * 60 * 1000 };
  return apiKey;
}

export async function pluggy<T>(path: string, { method = 'GET', body }: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await http.request<string>({
    url: path,
    method,
    headers: { 'X-API-KEY': await getApiKey(), 'Content-Type': 'application/json' },
    data: body,
  });
  if (res.status === 401) cachedKey = null;
  if (!ok(res.status)) {
    throw new HttpError(res.status === 404 ? 404 : 502, `Pluggy ${method} ${path} → ${res.status}: ${String(res.data ?? '').slice(0, 300)}`);
  }
  return (res.status === 204 ? null : JSON.parse(res.data)) as T;
}

export async function pluggyAll<T>(path: string): Promise<T[]> {
  const sep = path.includes('?') ? '&' : '?';
  const results: T[] = [];
  for (let page = 1; ; page++) {
    const data = await pluggy<Page<T>>(`${path}${sep}page=${page}&pageSize=500`);
    results.push(...(data.results ?? []));
    if (!data.totalPages || page >= data.totalPages) return results;
  }
}

export async function pluggyCursor<T>(base: string): Promise<T[]> {
  const path0 = base.split('?')[0];
  const results: T[] = [];
  let path: string | null = base;
  for (let i = 0; path && i < 100; i++) {
    const data: CursorPage<T> = await pluggy<CursorPage<T>>(path);
    results.push(...(data.results ?? []));
    path = data.next ? `${path0}${data.next.startsWith('?') ? '' : '?'}${data.next}` : null;
  }
  return results;
}

// Run fn over list with at most `limit` requests in flight.
export async function mapLimit<T, R>(list: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(list.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, list.length) }, async () => {
    while (next < list.length) {
      const idx = next++;
      out[idx] = await fn(list[idx]);
    }
  }));
  return out;
}
