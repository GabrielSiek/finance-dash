// Gastos: what counts in each total, budgets, groups, the pace chart and the transaction filters.
import type { Account, Exclusion, Group, PaymentMethod, SpendingData, Transaction, TransactionsData } from '@shared/types';
import type { Tone } from '@/components/ui';
import { groupColor, type ColorVar } from '@/lib/categories';
import { addMonths, daysInMonth, todayIso } from '@/lib/format';
import { groupIcon, spendIcon } from '@/lib/icons';

export const METHODS: Record<PaymentMethod, { label: string; short: string; color: ColorVar }> = {
  cartao: { label: 'Cartão de crédito', short: 'Cartão', color: '--m-cartao' },
  pix: { label: 'Pix', short: 'Pix', color: '--m-pix' },
  debito: { label: 'Débito', short: 'Débito', color: '--m-debito' },
  boleto: { label: 'Boleto', short: 'Boleto', color: '--m-boleto' },
  transferencia: { label: 'Transferência', short: 'Transferência', color: '--m-transferencia' },
  outros: { label: 'Outros', short: 'Outros', color: '--m-outros' },
};
export const METHOD_KEYS = Object.keys(METHODS) as PaymentMethod[];
export const EXCLUDED: Record<Exclusion, string> = { own: 'transferência entre suas contas', card: 'pagamento de fatura', invest: 'movimentação de investimento' };
export const BRANDS: [RegExp, string][] = [[/nu ?bank|nu pagamentos/i, '#820AD1'], [/inter/i, '#FF7A00'], [/ita[uú]/i, '#EC7000'], [/bradesco/i, '#CC092F'], [/santander/i, '#EC0000'],
  [/brasil|\bbb\b/i, '#F8D117'], [/caixa/i, '#0070AF'], [/c6/i, '#242424'], [/xp/i, '#151515'], [/btg/i, '#0D2240'], [/picpay/i, '#21C25E'], [/mercado pago/i, '#00B1EA']];
export const PAGE = 40;

// Transaction filters. period: 'month' (the month picked above), '3m' | '6m' | '12m', or 'custom' (from/to).
export type TxPeriod = 'month' | '3m' | '6m' | '12m' | 'custom';
export interface TxFilters {
  period: TxPeriod;
  from: string | null;
  to: string | null;
  cat: string;
  method: PaymentMethod | 'all';
  dir: 'all' | 'in' | 'out';
  q: string;
}
export const DEFAULT_TX: TxFilters = { period: 'month', from: null, to: null, cat: '', method: 'all', dir: 'all', q: '' };
export const PERIODS: [TxPeriod, number | null][] = [['month', null], ['3m', 3], ['6m', 6], ['12m', 12], ['custom', null]];

export function txRange(f: TxFilters) {
  const today = todayIso();
  const months = PERIODS.find(([k]) => k === f.period)?.[1];
  if (months) return { from: `${addMonths(today.slice(0, 7), -(months - 1))}-01`, to: today };
  if (f.period === 'custom' && f.from && f.to && f.from <= f.to) return { from: f.from, to: f.to };
  return null;
}

export const fold = (s: string | null | undefined) => (s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export interface BudgetStatus { label: 'Estourou' | 'Atenção' | 'Dentro'; tone: Tone; color: ColorVar }

export function status(r: number): BudgetStatus {
  if (r > 1) return { label: 'Estourou', tone: 'neg', color: '--neg' };
  if (r >= 0.85) return { label: 'Atenção', tone: 'warn', color: '--warn' };
  return { label: 'Dentro', tone: 'pos', color: '--pos' };
}

export const sum = (list: { amount: number }[]) => list.reduce((a, t) => a + t.amount, 0);

// "JOAO PEREIRA DA COSTA" → "Joao Pereira da Costa"; mixed-case text is left alone.
export const nice = (s: string) => (s && s === s.toUpperCase() && /\p{Lu}{2}/u.test(s)
  ? s.toLowerCase().replace(/(^|[\s(./-])(\p{L})/gu, (_m, p: string, c: string) => p + c.toUpperCase()).replace(/\b(De|Da|Do|Dos|Das|E)\b/g, (w) => w.toLowerCase())
  : s);

export interface MonthData {
  list: Transaction[];
  out: Transaction[];
  reimb: Transaction[];
  income: Transaction[];
  groupOut: Transaction[];
  groupIn: Transaction[];
  investOut: Transaction[];
  investIn: Transaction[];
  total: number;
}

export interface Computed {
  scope: Account[];
  accById: Map<string, Account>;
  accountCounts: (id: string) => boolean;
  excludedAcc: Set<string>;
  prevMonth: string;
  cur: MonthData;
  prev: MonthData;
  incomeTotal: number;
  groups: Group[];
  renda: number;
  investedNet: number;
}

// What counts: in "Todas as contas", accounts you left out of the totals are skipped (still listed);
// picking one account on the filter always shows its own totals.
// Money received that matches a group (a colleague paying their share) reduces that group's
// spending instead of counting as income, unless it's an income group (e.g. Salário).
export function compute(s: SpendingData, month: string, account: string): Computed {
  const excludedAcc = new Set(s.excludedAccounts ?? []);
  const scope = account === 'all' ? s.accounts : s.accounts.filter((a) => a.id === account);
  const scopeIds = new Set(scope.map((a) => a.id));
  const accById = new Map(s.accounts.map((a) => [a.id, a]));
  const accountCounts = (id: string) => scopeIds.has(id) && (account !== 'all' || !excludedAcc.has(id));
  // inScope: real money movement on a counted account. Groups marked "fora dos totais" (e.g. Investimentos)
  // keep their own totals but are left out of Gastos, Receitas, Saldo and the pace chart.
  const inScope = (t: Transaction) => !t.excluded && accountCounts(t.accountId);
  const counted = (t: Transaction) => inScope(t) && !t.group?.offTotals;
  // Investment applications (out) and redemptions (in), plus anything in a group with the Investimentos icon.
  const isInvest = (t: Transaction) => (t.invest || t.group?.icon === 'investimentos') && (!t.excluded || t.excluded === 'invest') && accountCounts(t.accountId);
  const all = s.transactions.filter((t) => scopeIds.has(t.accountId));

  const monthData = (m: string): MonthData => {
    const list = all.filter((t) => t.date.startsWith(m));
    const out = list.filter((t) => t.direction === 'out' && counted(t));
    const reimb = list.filter((t) => t.direction === 'in' && counted(t) && t.group && !t.group.income);
    const income = list.filter((t) => t.direction === 'in' && counted(t) && (!t.group || t.group.income) && accById.get(t.accountId)?.type === 'BANK');
    const groupOut = list.filter((t) => t.direction === 'out' && inScope(t) && t.group);
    const groupIn = list.filter((t) => t.direction === 'in' && inScope(t) && t.group);
    const investOut = list.filter((t) => t.direction === 'out' && isInvest(t));
    const investIn = list.filter((t) => t.direction === 'in' && isInvest(t));
    return { list, out, reimb, income, groupOut, groupIn, investOut, investIn, total: sum(out) - sum(reimb) };
  };
  const prevMonth = addMonths(month, -1);
  const cur = monthData(month);
  const prev = monthData(prevMonth);
  const incomeTotal = sum(cur.income);
  return {
    scope, accById, accountCounts, excludedAcc, prevMonth, cur, prev, incomeTotal, groups: s.groups ?? [],
    // The income you set in Configurações wins over what was detected in the accounts.
    renda: s.monthlyIncome ?? incomeTotal,
    // Net amount invested that isn't already counted in Gastos (a group that counts in the totals would be twice).
    investedNet: Math.max(sum(cur.investOut.filter((t) => !counted(t))) - sum(cur.investIn.filter((t) => !counted(t))), 0),
  };
}

export interface BudgetLimit { value: number; source: string; isIncome?: boolean }

// The month's spending ceiling: the general limit, else the sum of the per-category limits, else your income.
export function budgetLimit(s: TransactionsData): BudgetLimit | null {
  const byCat = Object.values(s.budgets ?? {}).reduce((a, b) => a + b, 0);
  if (s.budgetTotal) return { value: s.budgetTotal, source: 'limite geral' };
  if (byCat) return { value: byCat, source: 'soma das categorias' };
  if (s.monthlyIncome) return { value: s.monthlyIncome, source: 'sua renda', isIncome: true };
  return null;
}

export interface GroupTotal extends Group {
  out: number;
  received: number;
  net: number;
  n: number;
  nIn: number;
  offOut: number;
  nOff: number;
  color: ColorVar;
}

export function groupTotals(c: Computed): GroupTotal[] {
  return c.groups.map((g) => {
    const out = c.cur.groupOut.filter((t) => t.group?.id === g.id);
    const inn = c.cur.groupIn.filter((t) => t.group?.id === g.id);
    // Spending of this group on accounts left out of the totals (e.g. a card you keep separate).
    const off = c.cur.list.filter((t) => t.group?.id === g.id && t.direction === 'out' && !t.excluded && !c.accountCounts(t.accountId));
    return {
      ...g, out: sum(out), received: sum(inn), net: sum(out) - sum(inn), n: out.length, nIn: inn.length,
      offOut: sum(off), nOff: off.length, color: groupColor(c.groups, g.id),
    };
  });
}

export interface CatRow {
  key: string;
  label: string;
  icon: string;
  value: number;
  n: number;
  isGroup?: boolean;
  offTotals?: boolean;
  color?: ColorVar;
  received?: number;
}

// Your groups, then Pluggy's categories, then anything with a budget but no spending yet.
export function categoryRows(s: SpendingData, c: Computed): CatRow[] {
  const budgets = s.budgets ?? {};
  const rows = new Map<string, CatRow>();
  for (const g of groupTotals(c)) if ((g.n || g.nIn) && !g.income) rows.set(`group:${g.id}`, { key: `group:${g.id}`, isGroup: true, offTotals: g.excludeFromTotals, label: g.name, icon: groupIcon(g.icon), color: g.color, value: g.net, n: g.n, received: g.received });
  for (const t of c.cur.out) {
    if (t.group) continue;
    const r = rows.get(t.category.id) ?? { key: t.category.id, label: t.category.label, icon: spendIcon(t.category.key), value: 0, n: 0 };
    r.value += t.amount;
    r.n += 1;
    rows.set(t.category.id, r);
  }
  for (const id of Object.keys(budgets)) {
    if (rows.has(id)) continue;
    if (id.startsWith('group:')) {
      const g = c.groups.find((x) => `group:${x.id}` === id);
      if (g) rows.set(id, { key: id, isGroup: true, label: g.name, icon: groupIcon(g.icon), color: groupColor(c.groups, g.id), value: 0, n: 0, received: 0 });
    } else {
      const known = s.categories.find((x) => x.id === id);
      if (known) rows.set(id, { key: id, label: known.label, icon: spendIcon(known.key), value: 0, n: 0 });
    }
  }
  return [...rows.values()].sort((a, b) => b.value - a.value);
}

export function paceData(s: TransactionsData, c: Computed, month: string) {
  const days = daysInMonth(month);
  const prevDays = daysInMonth(c.prevMonth);
  const daily = (m: MonthData, n: number) => {
    const arr = new Array<number>(n).fill(0);
    for (const t of m.out) arr[Number(t.date.slice(8, 10)) - 1] += t.amount;
    for (const t of m.reimb) arr[Number(t.date.slice(8, 10)) - 1] -= t.amount;
    let acc = 0;
    return arr.map((v) => (acc += v));
  };
  const cur = daily(c.cur, days);
  const prev = daily(c.prev, prevDays);
  const isCurrent = month === todayIso().slice(0, 7);
  const todayDay = isCurrent ? Number(todayIso().slice(8, 10)) : days;
  const spent = cur[todayDay - 1] ?? 0;
  const projection = isCurrent && todayDay ? (spent / todayDay) * days : null;
  const limit = budgetLimit(s);
  return { days, cur, prev, todayDay, spent, projection, budgetTotal: limit?.value ?? null, budgetLabel: limit?.isIncome ? 'Renda' : 'Orçamento' };
}

export type PaceData = ReturnType<typeof paceData>;

export function applyTxFilters(list: Transaction[], f: TxFilters) {
  const q = fold(f.q.trim());
  return list.filter((t) => (f.method === 'all' || t.method === f.method)
    && (f.dir === 'all' || t.direction === f.dir)
    && (!f.cat || (f.cat.startsWith('group:') ? t.group?.id === f.cat.slice(6) : !t.group && t.category.id === f.cat))
    && (!q || fold([t.description, t.rawDescription, t.counterparty, t.kind, t.category.label, t.group?.name].join(' ')).includes(q)));
}
