import type { Group } from '@shared/types';
import { num, plural } from '@/lib/format';

// Accepts "1.500,50", "1500,5", "1500.5" and "1.500".
export const parseNum = (s: string | null | undefined) => {
  let t = String(s ?? '').trim().replace(/\s|R\$|%/g, '');
  if (!t) return null;
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, '');
  const n = Number(t);
  return Number.isFinite(n) ? n : NaN;
};

/** Initial text of a number field: empty when unset. */
export const fieldValue = (v: number | null | undefined) => (v != null ? num(v) : '');

export const groupMeta = (gr: { patterns: string[]; categories?: string[] }) => [
  gr.patterns.length ? plural(gr.patterns.length, 'palavra-chave', 'palavras-chave') : '',
  gr.categories?.length ? plural(gr.categories.length, 'categoria', 'categorias') : '',
].filter(Boolean).join(' · ') || 'Sem palavras-chave';

// ---------- Groups draft ----------
// Unsaved edits to the groups list survive re-renders and leaving the page until saved (or until the saved list changes).

export interface DraftGroup {
  /** Local key, so the open/closed state follows reorders and removals. */
  uid: string;
  id?: string;
  name: string;
  icon: string;
  /** The textarea as typed; split into patterns when shown or saved. */
  patternsText: string;
  categories: string[];
  excludeFromTotals: boolean;
  income: boolean;
  open: boolean;
}

export interface GroupDraft {
  /** JSON of the saved groups this draft started from. */
  base: string;
  groups: DraftGroup[];
}

let nextUid = 0;
const uid = () => `g${++nextUid}`;

export const parsePatterns = (text: string) => text.split('\n').map((p) => p.trim()).filter(Boolean);

export const toDraft = (g: Group): DraftGroup => ({
  uid: uid(), id: g.id, name: g.name, icon: g.icon, patternsText: g.patterns.join('\n'), categories: [...(g.categories ?? [])],
  excludeFromTotals: g.excludeFromTotals, income: g.income, open: false,
});

export const newDraftGroup = (): DraftGroup => ({
  uid: uid(), name: '', icon: 'outros', patternsText: '', categories: [], excludeFromTotals: false, income: false, open: true,
});

/** What the server stores (without the local UI fields). */
export const fromDraft = ({ uid: _uid, open: _open, patternsText, ...g }: DraftGroup) => ({ ...g, patterns: parsePatterns(patternsText) });
