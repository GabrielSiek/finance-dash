// ---------- Spending (Gastos) ----------

import type {
  Account, Exclusion, Group, PaymentMethod, Settings, SpendCategory, SpendingData, Transaction, TransactionsData,
} from '../shared/types.ts';
import type { PluggyAccount, PluggyCategory, PluggyItem, PluggyTransaction } from './pluggy-types.ts';
import { pluggy, pluggyAll, pluggyCursor, mapLimit } from './pluggy.ts';
import { institutionName, mapAccount } from './portfolio.ts';
import { loadSettings } from './settings.ts';
import { loadItemIds } from './storage.ts';

type CategoryMap = Map<string, PluggyCategory>;

let categoryCache: { at: number; byId: CategoryMap } | null = null;

async function loadCategories(): Promise<CategoryMap> {
  if (categoryCache && Date.now() - categoryCache.at < 24 * 3600e3) return categoryCache.byId;
  let list: PluggyCategory[] = [];
  try { list = await pluggyAll<PluggyCategory>('/categories'); } catch { /* categorization unavailable: everything lands in "Outros" */ }
  categoryCache = { at: Date.now(), byId: new Map(list.map((c) => [c.id, c])) };
  return categoryCache.byId;
}

function topCategory(byId: CategoryMap, cat: PluggyCategory | null | undefined): PluggyCategory | null {
  let c = cat;
  for (let i = 0; c?.parentId && byId.has(c.parentId) && i < 5; i++) c = byId.get(c.parentId);
  return c ?? null;
}

// Movements that are not spending or income: they'd be counted twice (card bill paid from the
// checking account, money moved between your own accounts, investment applications/redemptions).
const SKIP = {
  own: /same person|mesma titularidade/i,
  card: /credit card payment|pagamento de (fatura|cart[aã]o)|pgto\.? fatura/i,
  invest: /^investments?$|aplica[cç][aã]o|resgate/i,
};

// Brokerage/bank descriptions of investment movements ("Compra de Renda Variável", "Resgate RDB",
// "Valor recebido de Investimentos", "Aplicação CDB"...).
const INVEST_DESC = /aplica[cç][aã]o|resgate|renda vari[aá]vel|renda fixa|de investimentos?\b|\brdb\b|\bcdb\b|\blci\b|\blca\b|tesouro direto|caixinha/i;

function exclusionReason(tx: PluggyTransaction, account: Account, names: string): Exclusion | null {
  const desc = tx.description ?? '';
  if (SKIP.own.test(names)) return 'own';
  if (SKIP.card.test(names) || SKIP.card.test(desc)) return 'card';
  if (account.type === 'CREDIT' && tx.type === 'CREDIT') return 'card'; // bill payments / credits on the card itself
  if (names.split(' | ').some((n) => SKIP.invest.test(n)) || INVEST_DESC.test(desc)) return 'invest';
  return null;
}

function paymentMethod(tx: PluggyTransaction, account: Account): PaymentMethod {
  if (account.type === 'CREDIT') return 'cartao';
  const op = `${tx.operationType ?? ''} ${tx.paymentData?.paymentMethod ?? ''}`.toUpperCase();
  if (op.includes('PIX')) return 'pix';
  if (/BOLETO|CONVENIO/.test(op)) return 'boleto';
  if (op.includes('CARTAO')) return 'debito';
  if (/\bTED\b|\bDOC\b|TRANSFERENCIA/.test(op)) return 'transferencia';
  const d = `${tx.description ?? ''} ${tx.descriptionRaw ?? ''}`;
  if (/\bpix\b/i.test(d)) return 'pix';
  if (/boleto|pagamento de (conta|t[ií]tulo)/i.test(d)) return 'boleto';
  if (/d[eé]bito|compra (no )?cart/i.test(d)) return 'debito';
  if (/\bted\b|\bdoc\b|transf/i.test(d)) return 'transferencia';
  return 'outros';
}

// Key for "always put this merchant in that category" rules: description without numbers/punctuation.
const ruleKey = (description: string | null | undefined) => (description ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z ]+/g, ' ').replace(/\s+/g, ' ').trim();

const categoryOut = (c: PluggyCategory | null | undefined): SpendCategory => (c
  ? { id: c.id, label: c.descriptionTranslated || c.description, key: c.description }
  : { id: 'outros', label: 'Outros', key: 'Other' });

// Group patterns match the description, merchant and the Pix/TED counterparty, ignoring case,
// accents and punctuation. Every word of the pattern must appear as a whole word, in any order:
// "maria silva" matches "MARIA SOUZA SILVA", "ingresso.com" matches "INGRESSO.COM LTDA".
const words = (s: string | null | undefined) => ` ${(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()} `;
const matches = (text: string, pattern: string) => {
  const parts = words(pattern).trim().split(' ').filter(Boolean);
  return parts.length > 0 && parts.every((w) => text.includes(` ${w} `));
};

// Keyword matches win over whole-category groups, so "Cinemark" lands in Cinema even if a
// "Lazer" group takes Pluggy's whole Leisure category.
function findGroup(tx: PluggyTransaction, groups: Group[], categoryId: string): Group | null {
  const text = words([tx.description, tx.descriptionRaw, tx.merchant?.name, tx.merchant?.businessName,
    tx.paymentData?.payer?.name, tx.paymentData?.receiver?.name].filter(Boolean).join(' '));
  return groups.find((g) => g.patterns.some((p) => matches(text, p)))
    ?? groups.find((g) => categoryId && (g.categories ?? []).includes(categoryId))
    ?? null;
}

function investmentsCategory(byId: CategoryMap): SpendCategory {
  const c = [...byId.values()].find((x) => !x.parentId && /^investments?$/i.test(x.description));
  return c ? categoryOut(c) : { id: 'investimentos', label: 'Investimentos', key: 'Investments' };
}

function mapTransaction(tx: PluggyTransaction, account: Account, byId: CategoryMap, settings: Settings): Transaction {
  const { txRules, groups, txGroups } = settings;
  let cat = tx.categoryId ? byId.get(tx.categoryId) : null;
  if (!cat && tx.category) cat = [...byId.values()].find((c) => c.description === tx.category) ?? null;
  const top = topCategory(byId, cat);
  const names = [cat?.description, cat?.parentDescription, top?.description, tx.category].filter(Boolean).join(' | ');
  const key = ruleKey(tx.description);
  const ruleId = txRules[key];
  const ruledCat = ruleId && ruleId !== 'outros' ? byId.get(ruleId) : null;
  const meta = tx.creditCardMetadata;
  const direction = tx.type ? (tx.type === 'CREDIT' ? 'in' : 'out') : ((tx.amount ?? 0) < 0 ? 'out' : 'in');
  const excluded = exclusionReason(tx, account, names);
  // Investment movements always show as "Investimentos" (Pluggy often files stock purchases under Shopping),
  // unless you set a rule for them.
  let shown = ruleId && (ruledCat || ruleId === 'outros') ? categoryOut(ruledCat) : categoryOut(top);
  if (excluded === 'invest' && !ruleId) shown = investmentsCategory(byId);
  const manual = txGroups[tx.id];
  // Investment movements are ignored unless one of your groups claims them (e.g. an "Investimentos" group);
  // transfers between your own accounts and card bill payments never join a group automatically.
  const group = manual
    ? groups.find((g) => g.id === manual) ?? null
    : !excluded || excluded === 'invest' ? findGroup(tx, groups, shown.id) : null;
  const counterparty = (direction === 'out' ? tx.paymentData?.receiver?.name : tx.paymentData?.payer?.name) ?? null;
  return {
    group: group ? { id: group.id, name: group.name, icon: group.icon, offTotals: Boolean(group.excludeFromTotals), income: Boolean(group.income) } : null,
    groupSource: manual ? 'manual' : group ? 'rule' : null,
    counterparty,
    id: tx.id,
    date: (tx.date ?? '').slice(0, 10),
    // Open Finance descriptions often look like "Compra no débito|CINEMARK WA": keep the name, move the kind aside.
    description: tx.merchant?.businessName || tx.merchant?.name || (tx.description?.includes('|') ? tx.description.split('|').slice(1).join(' ').trim() : tx.description) || '',
    kind: tx.description?.includes('|') ? tx.description.split('|')[0].trim() : null,
    rawDescription: tx.description ?? '',
    amount: Math.abs(tx.amountInAccountCurrency ?? tx.amount ?? 0),
    direction,
    accountId: account.id,
    method: paymentMethod(tx, account),
    category: shown,
    ruleKey: key,
    ruled: Boolean(txRules[key]),
    // A manual group wins over the automatic exclusions (e.g. a Pix to yourself you want counted).
    excluded: group && (manual || excluded === 'invest') ? null : excluded,
    // Money moved into (out) or out of (in) your investments, even when a group claimed it.
    invest: excluded === 'invest' || /^investments?$/i.test(shown.key),
    status: tx.status ?? 'POSTED',
    installment: meta?.totalInstallments && meta.totalInstallments > 1 ? `${meta.installmentNumber}/${meta.totalInstallments}` : null,
  };
}

const accountTxCache = new Map<string, { stamp: string | null | undefined; results: PluggyTransaction[] }>(); // `${accountId}:${from}:${to}`

async function accountTransactions(accountId: string, from: string, to: string, stamp: string | null | undefined): Promise<PluggyTransaction[]> {
  const key = `${accountId}:${from}:${to}`;
  const hit = accountTxCache.get(key);
  if (hit && hit.stamp === stamp) return hit.results;
  let results: PluggyTransaction[];
  try {
    results = await pluggyCursor<PluggyTransaction>(`/v2/transactions?accountId=${accountId}&dateFrom=${from}&dateTo=${to}`);
  } catch {
    // Older API fallback (deprecated after 2026-12-31).
    results = await pluggyAll<PluggyTransaction>(`/transactions?accountId=${accountId}&from=${from}&to=${to}`);
  }
  accountTxCache.set(key, { stamp, results });
  return results;
}

// Every account and its mapped transactions between two dates (inclusive).
export async function loadTransactions(from: string, to: string): Promise<TransactionsData> {
  const [settings, byId, ids] = await Promise.all([loadSettings(), loadCategories(), loadItemIds()]);
  const accounts: Account[] = [];
  const transactions: Transaction[] = [];
  const errors: string[] = [];

  await Promise.all(ids.map(async (id) => {
    try {
      const [item, rawAccounts] = await Promise.all([pluggy<PluggyItem>(`/items/${id}`), pluggyAll<PluggyAccount>(`/accounts?itemId=${id}`)]);
      const connector = institutionName(item, rawAccounts, []);
      await mapLimit(rawAccounts, 4, async (raw) => {
        const account = mapAccount(raw, connector);
        accounts.push(account);
        for (const tx of await accountTransactions(raw.id, from, to, item.lastUpdatedAt)) {
          transactions.push(mapTransaction(tx, account, byId, settings));
        }
      });
    } catch (err) {
      errors.push((err as Error).message);
    }
  }));

  // Every top-level category you could spend in, for budgets and the category picker.
  const categories = [...byId.values()]
    .filter((c) => !c.parentId && !SKIP.own.test(c.description) && !SKIP.invest.test(c.description) && !/^income$/i.test(c.description))
    .map(categoryOut)
    .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));

  transactions.sort((a, b) => b.date.localeCompare(a.date));
  return {
    from, to, accounts, transactions, categories, errors,
    budgets: settings.budgets, budgetTotal: settings.budgetTotal, monthlyIncome: settings.monthlyIncome, groups: settings.groups, excludedAccounts: settings.excludedAccounts,
  };
}

// Transactions of the given month plus the previous one (for comparisons and the pace chart).
export async function buildSpending(month: string): Promise<SpendingData> {
  const [y, m] = month.split('-').map(Number);
  const from = new Date(Date.UTC(y, m - 2, 1)).toISOString().slice(0, 10);
  const to = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
  return { month, ...(await loadTransactions(from, to)) };
}
