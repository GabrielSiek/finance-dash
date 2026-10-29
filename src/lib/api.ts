// HTTP client for the local server (/api/*).
import axios, { AxiosError } from 'axios';

const http = axios.create({ baseURL: '/api', headers: { 'Content-Type': 'application/json' } });

// Surface the server's { error } message, like the rest of the UI expects.
http.interceptors.response.use(undefined, (err: unknown) => {
  if (err instanceof AxiosError && err.response) {
    const data = err.response.data as { error?: string } | undefined;
    return Promise.reject(new Error(data?.error || `Falha na requisição (${err.response.status})`));
  }
  return Promise.reject(err instanceof Error ? err : new Error(String(err)));
});

export const api = {
  get: <T>(path: string, params?: Record<string, string>) => http.get<T>(path, { params }).then((r) => r.data),
  post: <T>(path: string, body: unknown = {}) => http.post<T>(path, body).then((r) => r.data),
  put: <T>(path: string, body: unknown) => http.put<T>(path, body).then((r) => r.data),
  delete: <T>(path: string) => http.delete<T>(path).then((r) => r.data),
};

export const errorMessage = (err: unknown) => (err instanceof Error ? err.message : String(err));
