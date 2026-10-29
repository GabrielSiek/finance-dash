// Shared helpers: formatting, API, icons, charts, categories.

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const brlFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const brl0Fmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const compactFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1 });
export const brl = (v) => brlFmt.format(v ?? 0);
export const brl0 = (v) => brl0Fmt.format(v ?? 0);
export const brlCompact = (v) => compactFmt.format(v ?? 0);
export const money = (v, currency = 'BRL') => (currency === 'BRL' ? brl(v) : new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(v));
export const num = (v, d = 2) => (v ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: d });
export const num1 = (v) => (v ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
/** Percentage from a ratio (0.12 → "12,0%"). */
export const pct = (ratio) => `${num1(ratio * 100)}%`;
/** Signed percentage from a ratio, with arrow (0.12 → "▲ +12,00%"). */
export const arrowPct = (ratio) => `${ratio >= 0 ? '▲ +' : '▼ −'}${Math.abs(ratio * 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
export const signedPct = (ratio) => `${ratio > 0 ? '+' : ratio < 0 ? '−' : ''}${Math.abs(ratio * 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
export const signedBrl = (v) => `${v >= 0 ? '+' : '−'}${brl(Math.abs(v))}`;
export const toneClass = (v) => (v > 0 ? 'pos' : v < 0 ? 'neg' : 'neutral');
export const plural = (n, one, many) => `${n.toLocaleString('pt-BR')} ${n === 1 ? one : many}`;

// Dates from Pluggy are calendar dates; format them in UTC so they never shift a day.
const dShort = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' });
const dFull = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeZone: 'UTC' });
const dDayMonth = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', timeZone: 'UTC' });
const dMonth = new Intl.DateTimeFormat('pt-BR', { month: 'short', timeZone: 'UTC' });
const dMonthYear = new Intl.DateTimeFormat('pt-BR', { month: 'short', year: '2-digit', timeZone: 'UTC' });
const dMonthLong = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const dMonthName = new Intl.DateTimeFormat('pt-BR', { month: 'long', timeZone: 'UTC' });
const dTime = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });
export const utc = (iso) => new Date(`${String(iso).slice(0, 10)}T00:00:00Z`);
const clean = (s) => s.replace('.', '').replace(' de ', ' ');
export const fmtDay = (iso) => dShort.format(utc(iso));
export const fmtDate = (iso) => dFull.format(utc(iso));
export const fmtDayMonth = (iso) => clean(dDayMonth.format(utc(iso)));
export const fmtMonth = (iso) => clean(dMonth.format(utc(iso)));
export const fmtMonthYear = (iso) => clean(dMonthYear.format(utc(iso))).replace(' ', '/');
export const fmtMonthLong = (ym) => { const s = dMonthLong.format(utc(`${ym}-01`)); return s[0].toUpperCase() + s.slice(1); };
export const fmtMonthName = (ym) => dMonthName.format(utc(`${ym}-01`));
export const fmtTime = (d) => dTime.format(d);
export const todayIso = () => new Date().toLocaleDateString('sv-SE');
export const addDays = (iso, n) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 864e5).toISOString().slice(0, 10);
export const addMonths = (ym, n) => { const [y, m] = ym.split('-').map(Number); return new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 7); };
export const daysInMonth = (ym) => { const [y, m] = ym.split('-').map(Number); return new Date(Date.UTC(y, m, 0)).getUTCDate(); };

export function relativeTime(iso) {
  const mins = Math.round((Date.now() - new Date(iso)) / 60000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `há ${mins} min`;
  const h = Math.round(mins / 60);
  if (h < 24) return `há ${h} h`;
  return `há ${Math.round(h / 24)} d`;
}

export async function api(path, options = {}) {
  const res = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Falha na requisição (${res.status})`);
  return data;
}

export function showError(message) {
  const el = $('#error');
  el.textContent = message || '';
  el.hidden = !message;
  if (message) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

let toastTimer;
export function toast(message) {
  const el = $('#toast');
  el.textContent = message;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 2600);
}

export const cssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

// ---------- Icons (stroke paths, 24×24) ----------
export const ICON = {
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4',
  sun: 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  moon: 'M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z',
  left: 'M15 6l-6 6 6 6',
  right: 'M9 6l6 6-6 6',
  edit: 'M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4',
  plus: 'M12 5v14M5 12h14',
  up: 'M12 20V8M6 14l6-6 6 6M5 4h14',
  down: 'M12 4v12M6 10l6 6 6-6M5 20h14',
  coin: 'M12 3v18M17 7H9.5a2.5 2.5 0 0 0 0 5h5a2.5 2.5 0 0 1 0 5H6',
  rf: 'M3 10l9-6 9 6M5 10v8M10 10v8M14 10v8M19 10v8M3 20h18',
  acoes: 'M3 17l6-6 4 4 8-8M15 7h6v6',
  fii: 'M4 21V6l8-3v18M12 9h8v12M3 21h18M7 9h2M7 13h2M7 17h2M15 13h2M15 17h2',
  etf: 'M12 3l9 5-9 5-9-5zM3 12.5l9 5 9-5M3 17l9 5 9-5',
  fundos: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 3v9l6.4 6.4',
  prev: 'M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6zM9 12l2 2 4-4',
  caixa: 'M19 7V5a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-4a2 2 0 0 0 0 4h4v2a1 1 0 0 1-1 1H5a2 2 0 0 1-2-2V6M21 13v4',
  outros: 'M5 12h.01M12 12h.01M19 12h.01',
  cartao: 'M3 6h18v12H3zM3 10h18M7 15h3',
  pix: 'M12 3l9 9-9 9-9-9zM9 12h6',
  debito: 'M3 6h18v12H3zM3 10h18M14 15h3',
  boleto: 'M4 5v14M7 5v14M10 5v14M14 5v14M17 5v14M20 5v14',
  transferencia: 'M7 7h13l-4-4M17 17H4l4 4',
  // spending categories (matched by Pluggy's English top-level description)
  moradia: 'M3 11l9-7 9 7M5 10v10h14V10M10 20v-6h4v6',
  mercado: 'M3 4h2l2.4 11h11L21 8H6.2M9 20.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM18 20.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2z',
  compras: 'M5 8h14l-1 12H6zM9 8V6a3 3 0 0 1 6 0v2',
  alimentacao: 'M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M17 21V3c-2 0-3 2-3 5v5h3',
  transporte: 'M5 12l2-5h10l2 5M3 12h18v5H3zM6 17v2M18 17v2M7 14.5h1M16 14.5h1',
  saude: 'M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z',
  lazer: 'M4 6h16v4a2 2 0 0 0 0 4v4H4v-4a2 2 0 0 0 0-4zM14 6v12',
  assinaturas: 'M3 5h18v12H3zM8 21h8M10 9l4 2-4 2z',
  educacao: 'M2 9l10-5 10 5-10 5zM6 11v5c3 2 9 2 12 0v-5',
  viagem: 'M2 16l20-8-4 10-6-3-3 4v-5l9-6',
  servicos: 'M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z',
  impostos: 'M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6',
  taxas: 'M3 10l9-6 9 6M5 10v8M19 10v8M3 20h18M10 14h4',
  emprestimos: 'M4 7h16v10H4zM12 9.5v5M10 11h3a1 1 0 0 1 0 2h-2',
  pets: 'M5 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM19 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM9 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM15 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM12 12c-3 0-6 4-6 6.5 0 1.5 1.5 2 3 1.5 1-.3 2-.5 3-.5s2 .2 3 .5c1.5.5 3 0 3-1.5 0-2.5-3-6.5-6-6.5z',
  receita: 'M12 4v12M6 10l6 6 6-6M5 20h14',
  // custom group icons
  investimentos: 'M3 17l6-6 4 4 8-8M15 7h6v6',
  basquete: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3v18M5.6 5.6c3 2.6 3 10.2 0 12.8M18.4 5.6c-3 2.6-3 10.2 0 12.8',
  futebol: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7.5l3.8 2.8-1.5 4.4H9.7l-1.5-4.4zM12 7.5V3.2M15.8 10.3l4.3-1.4M14.3 14.7l2.7 3.6M9.7 14.7L7 18.3M8.2 10.3L3.9 8.9',
  cinema: 'M3 8h18v12H3zM3 8l3-4.5h3L6 8M9 8l3-4.5h3L12 8M15 8l3-4.5h3',
  trabalho: 'M3 7h18v13H3zM8.5 7V4.5h7V7M3 12.5h18',
  casa: 'M3 11l9-7 9 7M5 10v10h14V10M10 20v-6h4v6',
  group: 'M8 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5M16 4.3a3.5 3.5 0 0 1 0 6.4M18 14.8c2.4.7 4 2.6 4 5.2',
};

export const GROUP_ICON_OPTIONS = [
  ['investimentos', 'Investimentos'], ['basquete', 'Basquete'], ['futebol', 'Futebol'], ['cinema', 'Cinema'], ['trabalho', 'Trabalho'], ['casa', 'Casa'],
  ['viagem', 'Viagem'], ['pets', 'Pets'], ['saude', 'Saúde'], ['lazer', 'Lazer'], ['compras', 'Compras'],
  ['alimentacao', 'Alimentação'], ['transporte', 'Transporte'], ['educacao', 'Educação'], ['outros', 'Outros'],
];
export const groupIcon = (key) => ICON[key] ?? ICON.group;
// Fixed color per group, by its position in your list.
export const GROUP_COLORS = ['--c-acoes', '--c-fii', '--c-etf', '--c-rf', '--c-fundos', '--c-prev'];
export const groupColor = (groups, id) => GROUP_COLORS[Math.max(groups.findIndex((g) => g.id === id), 0) % GROUP_COLORS.length];

export const svg = (path, size = 18, extra = '') =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}><path d="${path}"/></svg>`;

// Icon for a Pluggy top-level category, by its English description.
export function spendIcon(key = '') {
  const k = key.toLowerCase();
  const map = [
    [/hous|rent|utilit/, 'moradia'], [/grocer|supermarket/, 'mercado'], [/shop/, 'compras'], [/food|drink|restaurant|deliver/, 'alimentacao'],
    [/transport|vehicle|fuel|automotive/, 'transporte'], [/health|pharma|medic/, 'saude'], [/leisure|entertain|sport/, 'lazer'],
    [/digital|subscri|stream/, 'assinaturas'], [/educat/, 'educacao'], [/travel/, 'viagem'], [/service/, 'servicos'],
    [/invest/, 'acoes'], [/tax|legal/, 'impostos'], [/bank fee|fee/, 'taxas'], [/loan|financ/, 'emprestimos'], [/pet/, 'pets'], [/transfer/, 'transferencia'],
    [/income/, 'receita'],
  ];
  return ICON[(map.find(([re]) => re.test(k)) ?? [null, 'outros'])[1]];
}

// ---------- Investment categories (fixed color per class) ----------
export const CATEGORIES = {
  RENDA_FIXA: { label: 'Renda fixa', short: 'RF', color: '--c-rf', icon: 'rf' },
  ACOES: { label: 'Ações', short: 'AÇ', color: '--c-acoes', icon: 'acoes' },
  FII: { label: 'FIIs', short: 'FII', color: '--c-fii', icon: 'fii' },
  ETF: { label: 'ETFs', short: 'ETF', color: '--c-etf', icon: 'etf' },
  FUNDOS: { label: 'Fundos', short: 'FD', color: '--c-fundos', icon: 'fundos' },
  PREVIDENCIA: { label: 'Previdência', short: 'PV', color: '--c-prev', icon: 'prev' },
  OUTROS: { label: 'Outros', short: '•••', color: '--c-outros', icon: 'outros' },
  CAIXA: { label: 'Caixa', short: 'R$', color: '--c-caixa', icon: 'caixa' },
};
export const CORE_CATEGORIES = ['RENDA_FIXA', 'ACOES', 'FII', 'ETF'];
export const cat = (key) => CATEGORIES[key] ?? CATEGORIES.OUTROS;
export const soft = (colorVar) => `color-mix(in srgb, var(${colorVar}) 15%, transparent)`;

export const SUBTYPES = {
  CDB: 'CDB', LCI: 'LCI', LCA: 'LCA', LC: 'LC', CRI: 'CRI', CRA: 'CRA', LIG: 'LIG', LF: 'LF',
  TREASURY: 'Tesouro Direto', DEBENTURES: 'Debêntures',
  STOCK: 'Ação', BDR: 'BDR', UNIT: 'Unit', REAL_ESTATE_FUND: 'Fundo imobiliário', SUBSCRIPTION_RIGHT: 'Direito de subscrição',
  DERIVATIVES: 'Derivativo', OPTION: 'Opção', ETF: 'Fundo de índice', RETIREMENT: 'Previdência', PGBL: 'PGBL', VGBL: 'VGBL', STRUCTURED_NOTE: 'COE',
  INVESTMENT_FUND: 'Fundo de investimento', STOCK_FUND: 'Fundo de ações', MULTIMARKET_FUND: 'Multimercado', EXCHANGE_FUND: 'Fundo cambial',
  FIXED_INCOME_FUND: 'Fundo de renda fixa', FIP_FUND: 'FIP', OFFSHORE_FUND: 'Fundo offshore', ETF_FUND: 'Fundo de ETF',
  CHECKING_ACCOUNT: 'Conta corrente', SAVINGS_ACCOUNT: 'Poupança', CREDIT_CARD: 'Cartão de crédito',
};
export const subtypeLabel = (s) => (s ? SUBTYPES[s] ?? s.toLowerCase().replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase()) : '');

// ---------- Charts ----------
const charts = new Map();

export function chartTheme() {
  return {
    text: cssVar('--text'), muted: cssVar('--muted'), border: cssVar('--border'), surface: cssVar('--surface'),
    accent: cssVar('--accent'), warn: cssVar('--warn'),
  };
}

export function tooltip(t) {
  return {
    backgroundColor: t.text, titleColor: t.surface, bodyColor: t.surface, footerColor: t.surface,
    borderWidth: 0, padding: 10, cornerRadius: 8, boxPadding: 4, usePointStyle: true,
    titleFont: { weight: '600' }, footerFont: { weight: '600' },
  };
}

export const crosshair = {
  id: 'crosshair',
  afterDatasetsDraw(chart) {
    const active = chart.tooltip?.getActiveElements?.() ?? [];
    if (!active.length) return;
    const { ctx, chartArea: { top, bottom } } = chart;
    ctx.save();
    ctx.strokeStyle = cssVar('--muted');
    ctx.globalAlpha = 0.5;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(active[0].element.x, top);
    ctx.lineTo(active[0].element.x, bottom);
    ctx.stroke();
    ctx.restore();
  },
};

export function mountChart(canvas, config) {
  if (!canvas || !window.Chart) return null;
  charts.get(canvas.id)?.destroy();
  Chart.defaults.font.family = "'Geist', system-ui, sans-serif";
  Chart.defaults.color = cssVar('--muted');
  const chart = new Chart(canvas, config);
  charts.set(canvas.id, chart);
  return chart;
}

export function destroyCharts() {
  for (const c of charts.values()) c.destroy();
  charts.clear();
}

/** Fill gradient for an area under a line. */
export const areaFill = (color) => (ctx) => {
  const area = ctx.chart.chartArea;
  if (!area) return 'transparent';
  const g = ctx.chart.ctx.createLinearGradient(0, area.top, 0, area.bottom);
  g.addColorStop(0, hexAlpha(color, 0.16));
  g.addColorStop(1, hexAlpha(color, 0));
  return g;
};

export function hexAlpha(hex, a) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

/** SVG path for a sparkline in a w×h box. */
export function sparkPath(vals, w = 200, h = 44, pad = 4) {
  const lo = Math.min(...vals), hi = Math.max(...vals), span = hi - lo || 1;
  return vals.map((v, i) => `${i ? 'L' : 'M'}${((i / Math.max(vals.length - 1, 1)) * w).toFixed(1)},${(pad + (1 - (v - lo) / span) * (h - 2 * pad)).toFixed(1)}`).join(' ');
}
