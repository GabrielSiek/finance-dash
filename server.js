// Finance Dash — local server that talks to the Pluggy API.
// The Pluggy CLIENT_SECRET never leaves this process; the browser only sees
// short-lived connect tokens and the aggregated portfolio data.

import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(ROOT, 'public');
const DATA_DIR = process.env.DATA_DIR || join(ROOT, 'data');
const DATA_FILE = join(DATA_DIR, 'items.json');
const HISTORY_FILE = join(DATA_DIR, 'history.json');
const OVERRIDES_FILE = join(DATA_DIR, 'categories.json'); // { "TICKER": "ETF", ... } set from the UI
const SETTINGS_FILE = join(DATA_DIR, 'settings.json'); // goals, budgets and transaction category rules
const PLUGGY_API = process.env.PLUGGY_API_URL || 'https://api.pluggy.ai';
const PORT = Number(process.env.PORT) || 3000;
const SNAPSHOT_EVERY_MS = 6 * 60 * 60 * 1000;

const { PLUGGY_CLIENT_ID, PLUGGY_CLIENT_SECRET } = process.env;
const INCLUDE_SANDBOX = process.env.PLUGGY_INCLUDE_SANDBOX !== 'false';
const configured = () => Boolean(PLUGGY_CLIENT_ID && PLUGGY_CLIENT_SECRET);

// ---------- Pluggy client ----------

let cachedKey = null; // { value, expiresAt }

async function getApiKey() {
  if (cachedKey && Date.now() < cachedKey.expiresAt) return cachedKey.value;
  const res = await fetch(`${PLUGGY_API}/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId: PLUGGY_CLIENT_ID, clientSecret: PLUGGY_CLIENT_SECRET }),
  });
  if (!res.ok) throw new HttpError(502, `Pluggy auth failed (${res.status}). Check PLUGGY_CLIENT_ID / PLUGGY_CLIENT_SECRET in .env.`);
  const { apiKey } = await res.json();
  // API keys last 2h; refresh a little early.
  cachedKey = { value: apiKey, expiresAt: Date.now() + 110 * 60 * 1000 };
  return apiKey;
}

async function pluggy(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${PLUGGY_API}${path}`, {
    method,
    headers: { 'X-API-KEY': await getApiKey(), 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401) cachedKey = null;
  if (!res.ok) {
    const text = await res.text();
    throw new HttpError(res.status === 404 ? 404 : 502, `Pluggy ${method} ${path} → ${res.status}: ${text.slice(0, 300)}`);
  }
  return res.status === 204 ? null : res.json();
}

async function pluggyAll(path) {
  const sep = path.includes('?') ? '&' : '?';
  const results = [];
  for (let page = 1; ; page++) {
    const data = await pluggy(`${path}${sep}page=${page}&pageSize=500`);
    results.push(...(data.results ?? []));
    if (!data.totalPages || page >= data.totalPages) return results;
  }
}

// Run fn over list with at most `limit` requests in flight.
async function mapLimit(list, limit, fn) {
  const out = new Array(list.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, list.length) }, async () => {
    while (next < list.length) {
      const idx = next++;
      out[idx] = await fn(list[idx]);
    }
  }));
  return out;
}

// ---------- Local storage ----------
// Pluggy has no "list my items" endpoint, so we remember the item IDs we create.

async function readJsonFile(file, fallback) {
  return existsSync(file) ? JSON.parse(await readFile(file, 'utf8')) : fallback;
}

async function writeJsonFile(file, data) {
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(data, null, 2));
}

async function loadItemIds() {
  const fromEnv = (process.env.PLUGGY_ITEM_IDS ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  return [...new Set([...(await readJsonFile(DATA_FILE, [])), ...fromEnv])];
}

const saveItemIds = (ids) => writeJsonFile(DATA_FILE, [...new Set(ids)]);

// ---------- Portfolio aggregation ----------

const CATEGORY_KEYS = ['RENDA_FIXA', 'FII', 'ACOES', 'ETF', 'FUNDOS', 'PREVIDENCIA', 'OUTROS'];
const DEFAULT_SUBTYPE = { FII: 'REAL_ESTATE_FUND', ETF: 'ETF', ACOES: 'STOCK' };

// Many brokers (and Open Finance via MeuPluggy) report every B3 ticker as EQUITY/STOCK,
// so ETFs, FIIs and units are told apart by ticker. "11" is shared by all three; anything
// ending in 11 that isn't a known ETF or unit is assumed to be a FII (by far the most common).
const KNOWN_ETFS = new Set(`
  BOVA11 BOVV11 BOVB11 BOVX11 BOVS11 XBOV11 PIBB11 BRAX11 SMAL11 SMAC11 ECOO11 ISUS11 DIVO11 NDIV11
  FIND11 MATB11 GOVE11 ESGB11 AUVP11 IVVB11 SPXI11 SPXB11 NASD11 TECK11 UTEC11 ACWI11 WRLD11 EURP11
  XINA11 GOLD11 HASH11 QBTC11 BITH11 BITI11 ETHE11 QETH11 DEFI11 WEB311 IMAB11 IRFM11 IB5M11 B5P211
  B5MB11 IMBB11 FIXA11 LFTS11 LFTB11 DEBB11 NTNS11
`.trim().split(/\s+/));
const KNOWN_UNITS = new Set('TAEE11 KLBN11 SANB11 BPAC11 ALUP11 ENGI11 SAPR11 IGTI11 SULA11 BRBI11 RNEW11 CPLE11'.split(' '));

function categoryFromTicker(code) {
  const m = /^([A-Z0-9]{4})(\d{1,2})F?$/.exec((code ?? '').toUpperCase());
  if (!m) return null;
  const ticker = `${m[1]}${m[2]}`;
  const suffix = Number(m[2]);
  if (KNOWN_ETFS.has(ticker)) return { category: 'ETF', subtype: 'ETF' };
  if (KNOWN_UNITS.has(ticker)) return { category: 'ACOES', subtype: 'UNIT' };
  if (suffix === 11) return { category: 'FII', subtype: 'REAL_ESTATE_FUND' };
  if (suffix >= 12 && suffix <= 15) return { category: 'FII', subtype: 'SUBSCRIPTION_RIGHT' };
  if (suffix === 39) return { category: 'ETF', subtype: 'BDR' };
  if (suffix >= 31 && suffix <= 35) return { category: 'ACOES', subtype: 'BDR' };
  if (suffix >= 3 && suffix <= 8) return { category: 'ACOES', subtype: 'STOCK' };
  return null;
}

const categoryKey = (inv) => (inv.code || inv.id).toUpperCase();

// Brazilian wallet categories. Returns the category, the effective subtype and where it came from.
function categorize(inv, overrides) {
  const manual = overrides[categoryKey(inv)];
  if (manual) return { category: manual, subtype: DEFAULT_SUBTYPE[manual] ?? inv.subtype, source: 'manual' };
  const pluggy = (category) => ({ category, subtype: inv.subtype, source: 'pluggy' });
  switch (inv.type) {
    case 'FIXED_INCOME': return pluggy('RENDA_FIXA');
    case 'ETF': return pluggy('ETF');
    case 'MUTUAL_FUND': return pluggy('FUNDOS');
    case 'SECURITY': return pluggy('PREVIDENCIA');
    case 'EQUITY': {
      if (inv.subtype === 'REAL_ESTATE_FUND') return pluggy('FII');
      if (inv.subtype === 'DERIVATIVES' || inv.subtype === 'OPTION') return pluggy('OUTROS');
      if (/\bFII\b|imobili/i.test(inv.name ?? '')) return { category: 'FII', subtype: 'REAL_ESTATE_FUND', source: 'name' };
      const byTicker = categoryFromTicker(inv.code || inv.name);
      if (byTicker) return { ...byTicker, source: 'ticker' };
      return pluggy('ACOES');
    }
    default: return pluggy('OUTROS');
  }
}

function summarizeItem(item) {
  return {
    id: item.id,
    connector: item.connector?.name ?? 'Unknown',
    connectorImage: item.connector?.imageUrl ?? null,
    isSandbox: Boolean(item.connector?.isSandbox),
    status: item.status,
    executionStatus: item.executionStatus,
    lastUpdatedAt: item.lastUpdatedAt,
    error: item.error?.message ?? null,
  };
}

// Movements only change when the item syncs, so cache them per sync.
const txCache = new Map(); // investmentId -> { stamp, results }

async function investmentTransactions(investmentId, stamp) {
  const hit = txCache.get(investmentId);
  if (hit && hit.stamp === stamp) return hit.results;
  let results = [];
  try {
    results = await pluggyAll(`/investments/${investmentId}/transactions`);
  } catch {
    // Not every institution reports movements; treat as "no history".
  }
  txCache.set(investmentId, { stamp, results });
  return results;
}

const txAmount = (tx) => Math.abs(tx.amount ?? tx.netAmount ?? (tx.value ?? 0) * (tx.quantity ?? 0));
const txDate = (tx) => (tx.date ?? tx.tradeDate ?? '').slice(0, 10);

// Net money put into an investment (aportes − resgates) for one movement.
function contributionDelta(tx) {
  const amt = txAmount(tx);
  switch (tx.type) {
    case 'BUY': return amt;
    case 'SELL':
    case 'AMORTIZATION': return -amt;
    case 'TRANSFER': return tx.movementType === 'CREDIT' ? amt : tx.movementType === 'DEBIT' ? -amt : 0;
    default: return 0;
  }
}

// MeuPluggy (Open Finance) items all have the same connector name, so name them after the bank instead:
// "Nu Pagamentos S.A. - Instituição de Pagamento" → "Nu Pagamentos", "itau" → "Itau".
function institutionName(item, accounts, investments) {
  const connector = item.connector?.name ?? 'Unknown';
  if (!/meu ?pluggy/i.test(connector)) return connector;
  const raw = investments.find((i) => i.institution?.name)?.institution.name ?? accounts.find((a) => a.type === 'BANK')?.name ?? accounts[0]?.name;
  if (!raw) return connector;
  const short = raw.split(/ - |,|\(| S\.?\/?A\.?\b/i)[0].trim();
  return short === short.toLowerCase() ? short.replace(/(^|\s)\p{L}/gu, (c) => c.toUpperCase()) : short;
}

function mapAccount(acc, connector) {
  const credit = acc.creditData;
  return {
    id: acc.id,
    itemId: acc.itemId,
    name: acc.marketingName ?? acc.name,
    number: acc.number ?? null,
    type: acc.type,
    subtype: acc.subtype,
    balance: acc.balance ?? 0,
    currencyCode: acc.currencyCode ?? 'BRL',
    connector,
    credit: credit ? {
      limit: credit.creditLimit ?? null,
      available: credit.availableCreditLimit ?? null,
      closeDate: credit.balanceCloseDate ?? null,
      dueDate: credit.balanceDueDate ?? null,
      brand: credit.brand ?? null,
      level: credit.level ?? null,
      minimumPayment: credit.minimumPayment ?? null,
    } : null,
  };
}

async function loadConnection(id, overrides) {
  try {
    const [item, investments, accounts] = await Promise.all([
      pluggy(`/items/${id}`),
      pluggyAll(`/investments?itemId=${id}`),
      pluggyAll(`/accounts?itemId=${id}`),
    ]);
    const summary = { ...summarizeItem(item), connector: institutionName(item, accounts, investments), via: item.connector?.name ?? null };
    const txs = await mapLimit(investments, 6, (inv) => investmentTransactions(inv.id, item.lastUpdatedAt));
    const yearAgo = new Date(Date.now() - 365 * 864e5).toISOString().slice(0, 10);

    const income = [];
    const contributions = [];
    let withHistory = 0;

    const mapped = investments.map((inv, idx) => {
      const { category, subtype, source } = categorize(inv, overrides);
      const label = inv.code || inv.name;
      let income12m = 0;
      let hasContribution = false;
      for (const tx of txs[idx]) {
        const date = txDate(tx);
        if (!date) continue;
        if (tx.type === 'INTEREST') {
          // Dividends, JCP, FII rental income and coupons all arrive as INTEREST.
          const amount = txAmount(tx);
          income.push({ date, amount, category, investmentId: inv.id, name: label });
          if (date >= yearAgo) income12m += amount;
        } else {
          const delta = contributionDelta(tx);
          if (delta) {
            contributions.push({ date, delta, category, name: label, quantity: tx.quantity ?? null });
            hasContribution = true;
          }
        }
      }
      if (hasContribution) {
        withHistory++;
      } else {
        // No movements reported: assume the cost basis went in on the purchase date.
        const cost = inv.amountOriginal ?? inv.balance ?? 0;
        const date = (inv.purchaseDate ?? inv.issueDate ?? '').slice(0, 10) || null;
        if (cost) contributions.push({ date, delta: cost, category, name: label, quantity: null, estimated: !date });
      }

      return {
        id: inv.id,
        name: inv.name,
        code: inv.code,
        type: inv.type,
        subtype,
        category,
        categoryKey: categoryKey(inv),
        categorySource: source,
        status: inv.status,
        balance: inv.balance ?? 0,
        amountOriginal: inv.amountOriginal ?? null,
        amountProfit: inv.amountProfit ?? null,
        quantity: inv.quantity ?? null,
        value: inv.value ?? null,
        currencyCode: inv.currencyCode ?? 'BRL',
        rate: inv.rate ?? null,
        rateType: inv.rateType ?? null,
        fixedAnnualRate: inv.fixedAnnualRate ?? null,
        lastMonthRate: inv.lastMonthRate ?? null,
        lastTwelveMonthsRate: inv.lastTwelveMonthsRate ?? null,
        issuer: inv.issuer ?? null,
        dueDate: inv.dueDate ?? null,
        purchaseDate: inv.purchaseDate ?? null,
        income12m,
        institution: inv.institution?.name ?? summary.connector,
        connector: summary.connector,
      };
    });

    return {
      ...summary,
      investments: mapped,
      accounts: accounts.map((acc) => mapAccount(acc, summary.connector)),
      income,
      contributions,
      withHistory,
    };
  } catch (err) {
    return { id, connector: 'Unavailable', status: 'ERROR', error: err.message, investments: [], accounts: [], income: [], contributions: [], withHistory: 0 };
  }
}

const todayInBrazil = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });

// One snapshot per day of what the wallet is worth, so the growth chart builds up over time.
async function recordSnapshot(connections) {
  if (!connections.length || connections.some((c) => c.status === 'ERROR')) return readJsonFile(HISTORY_FILE, []);
  const byCategory = {};
  let invested = 0;
  for (const inv of connections.flatMap((c) => c.investments)) {
    byCategory[inv.category] = (byCategory[inv.category] ?? 0) + inv.balance;
    invested += inv.balance;
  }
  const cash = connections.flatMap((c) => c.accounts).filter((a) => a.type === 'BANK').reduce((s, a) => s + a.balance, 0);
  const date = todayInBrazil();
  const snapshot = { date, total: invested + cash, invested, cash, byCategory };
  const history = (await readJsonFile(HISTORY_FILE, [])).filter((h) => h.date !== date);
  history.push(snapshot);
  history.sort((a, b) => a.date.localeCompare(b.date));
  await writeJsonFile(HISTORY_FILE, history);
  return history;
}

async function buildPortfolio() {
  const overrides = await readJsonFile(OVERRIDES_FILE, {});
  const connections = await Promise.all((await loadItemIds()).map((id) => loadConnection(id, overrides)));
  const history = await recordSnapshot(connections);
  const totalAssets = connections.reduce((s, c) => s + c.investments.length, 0);

  // Undated contributions are assumed to have been there since the first known date.
  const dated = connections.flatMap((c) => c.contributions).filter((c) => c.date);
  const firstDate = dated.map((c) => c.date).sort()[0] ?? todayInBrazil();
  const contributions = connections.flatMap((c) => c.contributions)
    .map((c) => ({ ...c, date: c.date ?? firstDate, estimated: Boolean(c.estimated || !c.date) }));

  return {
    generatedAt: new Date().toISOString(),
    connections: connections.map(({ income, contributions, withHistory, ...rest }) => rest),
    income: connections.flatMap((c) => c.income).sort((a, b) => a.date.localeCompare(b.date)),
    contributions: contributions.sort((a, b) => a.date.localeCompare(b.date)),
    coverage: { withHistory: connections.reduce((s, c) => s + c.withHistory, 0), total: totalAssets },
    history,
  };
}

// ---------- Settings (goals, budgets, transaction category rules) ----------

const DEFAULT_GOALS = { monthlyContribution: null, wealthTarget: null, wealthDate: null, monthlyRate: 0.9, allocation: {} };

async function loadSettings() {
  const s = await readJsonFile(SETTINGS_FILE, {});
  return {
    goals: { ...DEFAULT_GOALS, ...s.goals },
    budgets: s.budgets ?? {},
    txRules: s.txRules ?? {},
    groups: s.groups ?? [], // [{ id, name, icon, patterns: [] }]
    txGroups: s.txGroups ?? {}, // { [transactionId]: groupId | 'none' } manual assignments
    excludedAccounts: s.excludedAccounts ?? [], // account ids shown but left out of totals
  };
}

const GROUP_ICONS = ['investimentos', 'basquete', 'futebol', 'cinema', 'trabalho', 'casa', 'viagem', 'pets', 'saude', 'lazer', 'compras', 'alimentacao', 'transporte', 'educacao', 'outros'];

const slug = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'grupo';

function cleanGroups(list = []) {
  if (!Array.isArray(list) || list.length > 50) throw new HttpError(400, 'groups must be a list (max 50).');
  const seen = new Set();
  return list.map((g) => {
    const name = String(g.name ?? '').trim().slice(0, 40);
    if (!name) throw new HttpError(400, 'Every group needs a name.');
    let id = g.id && /^[a-z0-9-]{1,40}$/.test(g.id) ? g.id : slug(name);
    while (seen.has(id)) id = `${id}-2`;
    seen.add(id);
    const patterns = [...new Set((Array.isArray(g.patterns) ? g.patterns : String(g.patterns ?? '').split(/[\n,;]/))
      .map((p) => String(p).trim().slice(0, 60)).filter(Boolean))].slice(0, 100);
    const categories = [...new Set((Array.isArray(g.categories) ? g.categories : []).map(String).filter((c) => /^[\w-]{1,40}$/.test(c)))].slice(0, 50);
    // excludeFromTotals: the group shows its own totals but stays out of "Gastos", "Saldo" and the budget.
    return { id, name, icon: GROUP_ICONS.includes(g.icon) ? g.icon : 'outros', patterns, categories, excludeFromTotals: Boolean(g.excludeFromTotals) };
  });
}

const positiveOrNull = (v) => (v == null || v === '' ? null : Number.isFinite(Number(v)) && Number(v) >= 0 ? Number(v) : undefined);

function cleanGoals(g = {}) {
  const goals = { ...DEFAULT_GOALS };
  for (const k of ['monthlyContribution', 'wealthTarget', 'monthlyRate']) {
    const v = positiveOrNull(g[k]);
    if (v === undefined) throw new HttpError(400, `${k} must be a positive number.`);
    goals[k] = v ?? DEFAULT_GOALS[k];
  }
  if (g.wealthDate != null && g.wealthDate !== '' && !/^\d{4}-\d{2}(-\d{2})?$/.test(g.wealthDate)) throw new HttpError(400, 'wealthDate must be YYYY-MM.');
  goals.wealthDate = g.wealthDate || null;
  goals.allocation = {};
  for (const [k, v] of Object.entries(g.allocation ?? {})) {
    if (!CATEGORY_KEYS.includes(k)) continue;
    const n = positiveOrNull(v);
    if (n === undefined || n > 100) throw new HttpError(400, `allocation.${k} must be between 0 and 100.`);
    if (n) goals.allocation[k] = n;
  }
  return goals;
}

function cleanBudgets(b = {}) {
  const budgets = {};
  for (const [k, v] of Object.entries(b)) {
    const n = positiveOrNull(v);
    if (n === undefined) throw new HttpError(400, `Budget for ${k} must be a positive number.`);
    if (n) budgets[String(k)] = n;
  }
  return budgets;
}

// ---------- Spending (Gastos) ----------

let categoryCache = null; // { at, byId }

async function loadCategories() {
  if (categoryCache && Date.now() - categoryCache.at < 24 * 3600e3) return categoryCache.byId;
  let list = [];
  try { list = await pluggyAll('/categories'); } catch { /* categorization unavailable: everything lands in "Outros" */ }
  categoryCache = { at: Date.now(), byId: new Map(list.map((c) => [c.id, c])) };
  return categoryCache.byId;
}

function topCategory(byId, cat) {
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

function exclusionReason(tx, account, names) {
  const desc = tx.description ?? '';
  if (SKIP.own.test(names)) return 'own';
  if (SKIP.card.test(names) || SKIP.card.test(desc)) return 'card';
  if (account.type === 'CREDIT' && tx.type === 'CREDIT') return 'card'; // bill payments / credits on the card itself
  if (names.split(' | ').some((n) => SKIP.invest.test(n)) || INVEST_DESC.test(desc)) return 'invest';
  return null;
}

function paymentMethod(tx, account) {
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
const ruleKey = (description) => (description ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z ]+/g, ' ').replace(/\s+/g, ' ').trim();

const categoryOut = (c) => (c ? { id: c.id, label: c.descriptionTranslated || c.description, key: c.description } : { id: 'outros', label: 'Outros', key: 'Other' });

// Group patterns match the description, merchant and the Pix/TED counterparty, ignoring case,
// accents and punctuation. Every word of the pattern must appear as a whole word, in any order:
// "maria silva" matches "MARIA SOUZA SILVA", "ingresso.com" matches "INGRESSO.COM LTDA".
const words = (s) => ` ${(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()} `;
const matches = (text, pattern) => {
  const parts = words(pattern).trim().split(' ').filter(Boolean);
  return parts.length > 0 && parts.every((w) => text.includes(` ${w} `));
};

// Keyword matches win over whole-category groups, so "Cinemark" lands in Cinema even if a
// "Lazer" group takes Pluggy's whole Leisure category.
function findGroup(tx, groups, categoryId) {
  const text = words([tx.description, tx.descriptionRaw, tx.merchant?.name, tx.merchant?.businessName,
    tx.paymentData?.payer?.name, tx.paymentData?.receiver?.name].filter(Boolean).join(' '));
  return groups.find((g) => g.patterns.some((p) => matches(text, p)))
    ?? groups.find((g) => categoryId && (g.categories ?? []).includes(categoryId))
    ?? null;
}

function investmentsCategory(byId) {
  const c = [...byId.values()].find((x) => !x.parentId && /^investments?$/i.test(x.description));
  return c ? categoryOut(c) : { id: 'investimentos', label: 'Investimentos', key: 'Investments' };
}

function mapTransaction(tx, account, byId, settings) {
  const { txRules, groups, txGroups } = settings;
  let cat = tx.categoryId ? byId.get(tx.categoryId) : null;
  if (!cat && tx.category) cat = [...byId.values()].find((c) => c.description === tx.category) ?? null;
  const top = topCategory(byId, cat);
  const names = [cat?.description, cat?.parentDescription, top?.description, tx.category].filter(Boolean).join(' | ');
  const key = ruleKey(tx.description);
  const ruleId = txRules[key];
  const ruledCat = ruleId && ruleId !== 'outros' ? byId.get(ruleId) : null;
  const meta = tx.creditCardMetadata;
  const direction = tx.type ? (tx.type === 'CREDIT' ? 'in' : 'out') : (tx.amount < 0 ? 'out' : 'in');
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
    group: group ? { id: group.id, name: group.name, icon: group.icon, offTotals: Boolean(group.excludeFromTotals) } : null,
    groupSource: manual ? 'manual' : group ? 'rule' : null,
    counterparty,
    id: tx.id,
    date: (tx.date ?? '').slice(0, 10),
    // Open Finance descriptions often look like "Compra no débito|CINEMARK WA": keep the name, move the kind aside.
    description: tx.merchant?.businessName || tx.merchant?.name || (tx.description?.includes('|') ? tx.description.split('|').slice(1).join(' ').trim() : tx.description),
    kind: tx.description?.includes('|') ? tx.description.split('|')[0].trim() : null,
    rawDescription: tx.description,
    amount: Math.abs(tx.amountInAccountCurrency ?? tx.amount ?? 0),
    direction,
    accountId: account.id,
    method: paymentMethod(tx, account),
    category: shown,
    ruleKey: key,
    ruled: Boolean(txRules[key]),
    // A manual group wins over the automatic exclusions (e.g. a Pix to yourself you want counted).
    excluded: group && (manual || excluded === 'invest') ? null : excluded,
    status: tx.status ?? 'POSTED',
    installment: meta?.totalInstallments > 1 ? `${meta.installmentNumber}/${meta.totalInstallments}` : null,
  };
}

async function pluggyCursor(base) {
  const path0 = base.split('?')[0];
  const results = [];
  let path = base;
  for (let i = 0; path && i < 100; i++) {
    const data = await pluggy(path);
    results.push(...(data.results ?? []));
    path = data.next ? `${path0}${data.next.startsWith('?') ? '' : '?'}${data.next}` : null;
  }
  return results;
}

const accountTxCache = new Map(); // `${accountId}:${from}:${to}` -> { stamp, results }

async function accountTransactions(accountId, from, to, stamp) {
  const key = `${accountId}:${from}:${to}`;
  const hit = accountTxCache.get(key);
  if (hit && hit.stamp === stamp) return hit.results;
  let results;
  try {
    results = await pluggyCursor(`/v2/transactions?accountId=${accountId}&dateFrom=${from}&dateTo=${to}`);
  } catch {
    // Older API fallback (deprecated after 2026-12-31).
    results = await pluggyAll(`/transactions?accountId=${accountId}&from=${from}&to=${to}`);
  }
  accountTxCache.set(key, { stamp, results });
  return results;
}

// Every account and its mapped transactions between two dates (inclusive).
async function loadTransactions(from, to) {
  const [settings, byId, ids] = await Promise.all([loadSettings(), loadCategories(), loadItemIds()]);
  const accounts = [];
  const transactions = [];
  const errors = [];

  await Promise.all(ids.map(async (id) => {
    try {
      const [item, rawAccounts] = await Promise.all([pluggy(`/items/${id}`), pluggyAll(`/accounts?itemId=${id}`)]);
      const connector = institutionName(item, rawAccounts, []);
      await mapLimit(rawAccounts, 4, async (raw) => {
        const account = mapAccount(raw, connector);
        accounts.push(account);
        for (const tx of await accountTransactions(raw.id, from, to, item.lastUpdatedAt)) {
          transactions.push(mapTransaction(tx, account, byId, settings));
        }
      });
    } catch (err) {
      errors.push(err.message);
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
    budgets: settings.budgets, groups: settings.groups, excludedAccounts: settings.excludedAccounts,
  };
}

// Transactions of the given month plus the previous one (for comparisons and the pace chart).
async function buildSpending(month) {
  const [y, m] = month.split('-').map(Number);
  const from = new Date(Date.UTC(y, m - 2, 1)).toISOString().slice(0, 10);
  const to = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
  return { month, ...(await loadTransactions(from, to)) };
}

// ---------- HTTP ----------

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };

function sendJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(data));
}

async function readJson(req) {
  let raw = '';
  for await (const chunk of req) raw += chunk;
  return raw ? JSON.parse(raw) : {};
}

function requireConfig() {
  if (!configured()) {
    throw new HttpError(503, 'Pluggy is not configured. Copy .env.example to .env and fill in your Client ID and Secret.');
  }
}

const routes = {
  'GET /api/status': async () => {
    let authError = null;
    if (configured()) {
      try { await getApiKey(); } catch (err) { authError = err.message; }
    }
    return { configured: configured(), authError, includeSandbox: INCLUDE_SANDBOX, itemCount: (await loadItemIds()).length };
  },

  'POST /api/connect-token': async (req) => {
    requireConfig();
    const { itemId } = await readJson(req);
    const data = await pluggy('/connect_token', { method: 'POST', body: itemId ? { itemId } : {} });
    return { accessToken: data.accessToken, includeSandbox: INCLUDE_SANDBOX };
  },

  'POST /api/items': async (req) => {
    requireConfig();
    const { itemId } = await readJson(req);
    if (!itemId || !/^[0-9a-f-]{36}$/i.test(itemId)) throw new HttpError(400, 'A valid itemId (UUID) is required.');
    const item = await pluggy(`/items/${itemId}`); // validates it exists for this client
    await saveItemIds([...(await loadItemIds()), itemId]);
    return summarizeItem(item);
  },

  'GET /api/portfolio': async () => {
    requireConfig();
    return buildPortfolio();
  },

  'GET /api/spending': async (req) => {
    requireConfig();
    const month = new URL(req.url, 'http://localhost').searchParams.get('month') ?? todayInBrazil().slice(0, 7);
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new HttpError(400, 'month must be YYYY-MM.');
    return buildSpending(month);
  },

  // Any date range, for the transaction filters (Open Finance usually keeps ~12 months).
  'GET /api/transactions': async (req) => {
    requireConfig();
    const q = new URL(req.url, 'http://localhost').searchParams;
    const from = q.get('from'), to = q.get('to');
    const iso = /^\d{4}-\d{2}-\d{2}$/;
    if (!iso.test(from ?? '') || !iso.test(to ?? '') || from > to) throw new HttpError(400, 'from and to must be YYYY-MM-DD, from ≤ to.');
    if ((Date.parse(to) - Date.parse(from)) / 864e5 > 731) throw new HttpError(400, 'The range can be at most 2 years.');
    return loadTransactions(from, to);
  },

  'GET /api/settings': () => loadSettings(),

  'PUT /api/settings': async (req) => {
    const body = await readJson(req);
    const current = await loadSettings();
    const next = {
      ...current,
      goals: body.goals ? cleanGoals(body.goals) : current.goals,
      budgets: body.budgets ? cleanBudgets(body.budgets) : current.budgets,
      groups: body.groups ? cleanGroups(body.groups) : current.groups,
      excludedAccounts: Array.isArray(body.excludedAccounts) ? body.excludedAccounts.map(String).slice(0, 100) : current.excludedAccounts,
    };
    // Forget manual assignments to groups that no longer exist.
    const ids = new Set(next.groups.map((g) => g.id));
    next.txGroups = Object.fromEntries(Object.entries(next.txGroups).filter(([, g]) => g === 'none' || ids.has(g)));
    await writeJsonFile(SETTINGS_FILE, next);
    return next;
  },

  // Create a group (used by "+ Novo grupo" in the transactions table).
  'POST /api/groups': async (req) => {
    const body = await readJson(req);
    const settings = await loadSettings();
    settings.groups = cleanGroups([...settings.groups, { name: body.name, icon: body.icon, patterns: body.patterns ?? [] }]);
    await writeJsonFile(SETTINGS_FILE, settings);
    return settings.groups.at(-1);
  },

  // Put one transaction in a group by hand. groupId: a group id, 'none' (never group it), or null (back to automatic).
  'POST /api/tx-group': async (req) => {
    const { txId, groupId } = await readJson(req);
    if (!txId || typeof txId !== 'string') throw new HttpError(400, 'txId is required.');
    const settings = await loadSettings();
    if (groupId && groupId !== 'none' && !settings.groups.some((g) => g.id === groupId)) throw new HttpError(400, 'Unknown group.');
    if (groupId) settings.txGroups[txId] = groupId;
    else delete settings.txGroups[txId];
    await writeJsonFile(SETTINGS_FILE, settings);
    return { txId, groupId: groupId ?? null };
  },

  // "Always categorize transactions like this one as <category>" (categoryId: null removes the rule).
  'POST /api/tx-rules': async (req) => {
    const { key, categoryId } = await readJson(req);
    if (!key || typeof key !== 'string') throw new HttpError(400, 'key is required.');
    const settings = await loadSettings();
    if (categoryId) settings.txRules[key] = String(categoryId);
    else delete settings.txRules[key];
    await writeJsonFile(SETTINGS_FILE, settings);
    return settings.txRules;
  },

  // Ask Pluggy to re-sync every connection.
  'POST /api/sync': async () => {
    requireConfig();
    const ids = await loadItemIds();
    const results = await Promise.allSettled(ids.map((id) => pluggy(`/items/${id}`, { method: 'PATCH', body: {} })));
    return { requested: ids.length, failed: results.filter((r) => r.status === 'rejected').length };
  },

  // Manually set (or with category: null, reset) the category of a ticker.
  'POST /api/categories': async (req) => {
    const { key, category } = await readJson(req);
    if (!key || typeof key !== 'string') throw new HttpError(400, 'key is required.');
    if (category != null && !CATEGORY_KEYS.includes(category)) throw new HttpError(400, `category must be one of ${CATEGORY_KEYS.join(', ')}.`);
    const overrides = await readJsonFile(OVERRIDES_FILE, {});
    if (category) overrides[key.toUpperCase()] = category;
    else delete overrides[key.toUpperCase()];
    await writeJsonFile(OVERRIDES_FILE, overrides);
    return overrides;
  },
};

const paramRoutes = [
  // Trigger a fresh sync of one connection.
  [/^POST \/api\/items\/([0-9a-f-]{36})\/refresh$/i, async (_req, [id]) => summarizeItem(await pluggy(`/items/${id}`, { method: 'PATCH', body: {} }))],
  // Forget a connection locally (does not delete it on Pluggy).
  [/^DELETE \/api\/items\/([0-9a-f-]{36})$/i, async (_req, [id]) => {
    await saveItemIds((await loadItemIds()).filter((x) => x !== id));
    return { removed: id };
  }],
];

async function serveStatic(pathname, res) {
  const rel = normalize(pathname === '/' ? '/index.html' : pathname).replace(/^([/\\])+/, '');
  const file = join(PUBLIC_DIR, rel);
  if (!file.startsWith(PUBLIC_DIR) || !existsSync(file)) {
    res.writeHead(404).end('Not found');
    return;
  }
  res.writeHead(200, { 'Content-Type': MIME[extname(file)] ?? 'application/octet-stream' });
  res.end(await readFile(file));
}

const server = createServer(async (req, res) => {
  const { pathname } = new URL(req.url, 'http://localhost');
  const key = `${req.method} ${pathname}`;
  try {
    if (routes[key]) return sendJson(res, 200, await routes[key](req));
    for (const [pattern, handler] of paramRoutes) {
      const match = key.match(pattern);
      if (match) return sendJson(res, 200, await handler(req, match.slice(1)));
    }
    if (pathname.startsWith('/api/')) throw new HttpError(404, 'Unknown endpoint');
    if (req.method !== 'GET') throw new HttpError(405, 'Method not allowed');
    await serveStatic(pathname, res);
  } catch (err) {
    const status = err instanceof HttpError ? err.status : err instanceof SyntaxError ? 400 : 500;
    if (!(err instanceof HttpError)) console.error(err);
    sendJson(res, status, { error: err.message });
  }
});

// Keep the history going while the server runs, even if the page isn't open.
async function backgroundSnapshot() {
  if (!configured() || !(await loadItemIds()).length) return;
  try { await buildPortfolio(); } catch (err) { console.error('Snapshot failed:', err.message); }
}

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Finance Dash running at http://localhost:${PORT}`);
  if (!configured()) {
    console.warn('⚠  PLUGGY_CLIENT_ID / PLUGGY_CLIENT_SECRET missing — copy .env.example to .env and fill them in.');
  }
  setTimeout(backgroundSnapshot, 5000);
  setInterval(backgroundSnapshot, SNAPSHOT_EVERY_MS).unref();
});
