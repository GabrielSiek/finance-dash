// Number and date formatting (pt-BR).

const brlFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const brl0Fmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const compactFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1 });
export const brl = (v: number | null | undefined) => brlFmt.format(v ?? 0);
export const brl0 = (v: number | null | undefined) => brl0Fmt.format(v ?? 0);
export const brlCompact = (v: number | null | undefined) => compactFmt.format(v ?? 0);
export const money = (v: number, currency = 'BRL') => (currency === 'BRL' ? brl(v) : new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(v));
export const num = (v: number | null | undefined, d = 2) => (v ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: d });
export const num1 = (v: number | null | undefined) => (v ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
/** Percentage from a ratio (0.12 → "12,0%"). */
export const pct = (ratio: number) => `${num1(ratio * 100)}%`;
const pct2 = (ratio: number) => Math.abs(ratio * 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
/** Signed percentage from a ratio, with arrow (0.12 → "▲ +12,00%"). */
export const arrowPct = (ratio: number) => `${ratio >= 0 ? '▲ +' : '▼ −'}${pct2(ratio)}%`;
export const signedPct = (ratio: number) => `${ratio > 0 ? '+' : ratio < 0 ? '−' : ''}${pct2(ratio)}%`;
export const signedBrl = (v: number) => `${v >= 0 ? '+' : '−'}${brl(Math.abs(v))}`;
export const plural = (n: number, one: string, many: string) => `${n.toLocaleString('pt-BR')} ${n === 1 ? one : many}`;

// Dates from Pluggy are calendar dates; format them in UTC so they never shift a day.
const dShort = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' });
const dFull = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeZone: 'UTC' });
const dDayMonth = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', timeZone: 'UTC' });
const dMonth = new Intl.DateTimeFormat('pt-BR', { month: 'short', timeZone: 'UTC' });
const dMonthYear = new Intl.DateTimeFormat('pt-BR', { month: 'short', year: '2-digit', timeZone: 'UTC' });
const dMonthLong = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const dMonthName = new Intl.DateTimeFormat('pt-BR', { month: 'long', timeZone: 'UTC' });
const dTime = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });
export const utc = (iso: string) => new Date(`${String(iso).slice(0, 10)}T00:00:00Z`);
const clean = (s: string) => s.replace('.', '').replace(' de ', ' ');
export const fmtDay = (iso: string) => dShort.format(utc(iso));
export const fmtDate = (iso: string) => dFull.format(utc(iso));
export const fmtDayMonth = (iso: string) => clean(dDayMonth.format(utc(iso)));
export const fmtMonth = (iso: string) => clean(dMonth.format(utc(iso)));
export const fmtMonthYear = (iso: string) => clean(dMonthYear.format(utc(iso))).replace(' ', '/');
export const fmtMonthLong = (ym: string) => { const s = dMonthLong.format(utc(`${ym}-01`)); return s[0].toUpperCase() + s.slice(1); };
export const fmtMonthName = (ym: string) => dMonthName.format(utc(`${ym}-01`));
export const fmtTime = (d: Date) => dTime.format(d);
export const todayIso = () => new Date().toLocaleDateString('sv-SE');
export const addDays = (iso: string, n: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 864e5).toISOString().slice(0, 10);
export const addMonths = (ym: string, n: number) => { const [y, m] = ym.split('-').map(Number); return new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 7); };
export const daysInMonth = (ym: string) => { const [y, m] = ym.split('-').map(Number); return new Date(Date.UTC(y, m, 0)).getUTCDate(); };

export function relativeTime(iso: string) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `há ${mins} min`;
  const h = Math.round(mins / 60);
  if (h < 24) return `há ${h} h`;
  return `há ${Math.round(h / 24)} d`;
}
