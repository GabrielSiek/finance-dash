// Small shared hooks: hash routing and UI state that survives leaving a page.
import { useCallback, useState, useSyncExternalStore, type SetStateAction } from 'react';

export type Route = 'investimentos' | 'metas' | 'gastos' | 'contas' | 'configuracoes';
const ROUTES: Route[] = ['investimentos', 'metas', 'gastos', 'contas', 'configuracoes'];

export function currentRoute(): Route {
  const r = location.hash.replace(/^#\/?/, '').split(/[/?]/)[0];
  return ROUTES.includes(r as Route) ? (r as Route) : 'investimentos';
}

const onHash = (cb: () => void) => { window.addEventListener('hashchange', cb); return () => window.removeEventListener('hashchange', cb); };
export const useRoute = () => useSyncExternalStore(onHash, currentRoute);

// Filters, sort order, picked month… are kept for the whole session, as if the page never unmounted.
const session = new Map<string, unknown>();

export function useSessionState<T>(key: string, initial: T | (() => T)) {
  const [value, setValue] = useState<T>(() => {
    if (session.has(key)) return session.get(key) as T;
    const v = typeof initial === 'function' ? (initial as () => T)() : initial;
    session.set(key, v);
    return v;
  });
  const set = useCallback((next: SetStateAction<T>) => {
    setValue((prev) => {
      const v = typeof next === 'function' ? (next as (p: T) => T)(prev) : next;
      session.set(key, v);
      return v;
    });
  }, [key]);
  return [value, set] as const;
}
