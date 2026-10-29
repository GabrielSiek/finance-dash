// Gastos view: month KPIs, your groups, categories vs budget, payment methods, credit cards, pace, transactions.
import {
  $, $$, esc, brl, brl0, brlCompact, num, plural, fmtDate, fmtDay, fmtDayMonth, fmtMonthLong, fmtMonthName, todayIso, addMonths,
  daysInMonth, ICON, svg, spendIcon, groupIcon, groupColor, soft, chartTheme, tooltip, crosshair, mountChart, areaFill, api, showError, toast,
} from './core.js';

const METHODS = {
  cartao: { label: 'Cartão de crédito', short: 'Cartão', color: '--m-cartao' },
  pix: { label: 'Pix', short: 'Pix', color: '--m-pix' },
  debito: { label: 'Débito', short: 'Débito', color: '--m-debito' },
  boleto: { label: 'Boleto', short: 'Boleto', color: '--m-boleto' },
  transferencia: { label: 'Transferência', short: 'Transferência', color: '--m-transferencia' },
  outros: { label: 'Outros', short: 'Outros', color: '--m-outros' },
};
const EXCLUDED = { own: 'transferência entre suas contas', card: 'pagamento de fatura', invest: 'movimentação de investimento' };
const BRANDS = [[/nu ?bank|nu pagamentos/i, '#820AD1'], [/inter/i, '#FF7A00'], [/ita[uú]/i, '#EC7000'], [/bradesco/i, '#CC092F'], [/santander/i, '#EC0000'],
  [/brasil|\bbb\b/i, '#F8D117'], [/caixa/i, '#0070AF'], [/c6/i, '#242424'], [/xp/i, '#151515'], [/btg/i, '#0D2240'], [/picpay/i, '#21C25E'], [/mercado pago/i, '#00B1EA']];
const PAGE = 40;

const ui = {
  month: todayIso().slice(0, 7), account: 'all', shown: PAGE,
  // Transaction filters. period: 'month' (the month picked above), '3m' | '6m' | '12m', or 'custom' (from/to).
  tx: { period: 'month', from: null, to: null, cat: '', method: 'all', dir: 'all', q: '' },
};
const PERIODS = [['month', null], ['3m', 3], ['6m', 6], ['12m', 12], ['custom', null]];
const pendingRanges = new Map();

function txRange() {
  const today = todayIso();
  const months = PERIODS.find(([k]) => k === ui.tx.period)?.[1];
  if (months) return { from: `${addMonths(today.slice(0, 7), -(months - 1))}-01`, to: today };
  if (ui.tx.period === 'custom' && ui.tx.from && ui.tx.to && ui.tx.from <= ui.tx.to) return { from: ui.tx.from, to: ui.tx.to };
  return null;
}

// Longer periods are fetched on demand and cached with the month data (cleared together).
function loadRange(store, { from, to }) {
  const key = `range:${from}:${to}`;
  if (store.spending[key] || pendingRanges.has(key)) return;
  pendingRanges.set(key, api(`/api/transactions?from=${from}&to=${to}`)
    .then((r) => { store.spending[key] = r; store.rerender({ keepScroll: true }); })
    .catch((err) => showError(err.message))
    .finally(() => pendingRanges.delete(key)));
}

const fold = (s) => (s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

function status(r) {
  if (r > 1) return { label: 'Estourou', tone: 'neg', color: '--neg' };
  if (r >= 0.85) return { label: 'Atenção', tone: 'warn', color: '--warn' };
  return { label: 'Dentro', tone: 'pos', color: '--pos' };
}

const sum = (list) => list.reduce((a, t) => a + t.amount, 0);

// "JOAO PEREIRA DA COSTA" → "Joao Pereira da Costa"; mixed-case text is left alone.
const nice = (s) => (s && s === s.toUpperCase() && /\p{Lu}{2}/u.test(s)
  ? s.toLowerCase().replace(/(^|[\s(./-])(\p{L})/gu, (m, p, c) => p + c.toUpperCase()).replace(/\b(De|Da|Do|Dos|Das|E)\b/g, (w) => w.toLowerCase())
  : s);

// What counts: in "Todas as contas", accounts you left out of the totals are skipped (still listed);
// picking one account on the filter always shows its own totals.
// Money received that matches a group (a colleague paying their share) reduces that group's
// spending instead of counting as income.
function compute(s) {
  const excludedAcc = new Set(s.excludedAccounts ?? []);
  const scope = ui.account === 'all' ? s.accounts : s.accounts.filter((a) => a.id === ui.account);
  const scopeIds = new Set(scope.map((a) => a.id));
  const accById = new Map(s.accounts.map((a) => [a.id, a]));
  const accountCounts = (id) => scopeIds.has(id) && (ui.account !== 'all' || !excludedAcc.has(id));
  // inScope: real money movement on a counted account. Groups marked "fora dos totais" (e.g. Investimentos)
  // keep their own totals but are left out of Gastos, Receitas, Saldo and the pace chart.
  const inScope = (t) => !t.excluded && accountCounts(t.accountId);
  const counted = (t) => inScope(t) && !t.group?.offTotals;
  const all = s.transactions.filter((t) => scopeIds.has(t.accountId));

  const monthData = (m) => {
    const list = all.filter((t) => t.date.startsWith(m));
    const out = list.filter((t) => t.direction === 'out' && counted(t));
    const reimb = list.filter((t) => t.direction === 'in' && counted(t) && t.group);
    const income = list.filter((t) => t.direction === 'in' && counted(t) && !t.group && accById.get(t.accountId)?.type === 'BANK');
    const groupOut = list.filter((t) => t.direction === 'out' && inScope(t) && t.group);
    const groupIn = list.filter((t) => t.direction === 'in' && inScope(t) && t.group);
    return { list, out, reimb, income, groupOut, groupIn, total: sum(out) - sum(reimb) };
  };
  const prevMonth = addMonths(ui.month, -1);
  const cur = monthData(ui.month);
  const prev = monthData(prevMonth);
  return { scope, accById, accountCounts, excludedAcc, prevMonth, cur, prev, incomeTotal: sum(cur.income), groups: s.groups ?? [] };
}

function groupTotals(c) {
  return c.groups.map((g) => {
    const out = c.cur.groupOut.filter((t) => t.group.id === g.id);
    const inn = c.cur.groupIn.filter((t) => t.group.id === g.id);
    // Spending of this group on accounts left out of the totals (e.g. a card you keep separate).
    const off = c.cur.list.filter((t) => t.group?.id === g.id && t.direction === 'out' && !t.excluded && !c.accountCounts(t.accountId));
    return {
      ...g, out: sum(out), received: sum(inn), net: sum(out) - sum(inn), n: out.length, nIn: inn.length,
      offOut: sum(off), nOff: off.length, color: groupColor(c.groups, g.id),
    };
  });
}

// ---------- Sections ----------

function kpisHtml(s, c) {
  const vs = c.prev.total ? c.cur.total / c.prev.total - 1 : null;
  const balance = c.incomeTotal - c.cur.total;
  const budgets = s.budgets ?? {};
  const budgetTotal = Object.values(budgets).reduce((a, b) => a + b, 0);
  const reimb = sum(c.cur.reimb);
  const topIncome = [...new Set([...c.cur.income].sort((a, b) => b.amount - a.amount).map((t) => t.counterparty || t.description))].slice(0, 2).join(' e ');
  let budgetCard;
  if (budgetTotal) {
    const r = c.cur.total / budgetTotal, st = status(r);
    budgetCard = `<div class="top">Orçamento do mês<span class="chip ${st.tone}">${st.label}</span></div>
      <span class="v">${Math.round(r * 100)}% usado</span>
      <div style="display: flex; flex-direction: column; gap: 6px;">
        <div class="bar"><div style="width: ${Math.min(Math.max(r, 0), 1) * 100}%; background: var(${st.color});"></div></div>
        <span class="m">${brl(c.cur.total)} de ${brl(budgetTotal)}</span>
      </div>`;
  } else {
    budgetCard = `<div class="top">Orçamento do mês</div><span class="v" style="font-size: 20px;">Sem orçamento</span>
      <span class="m">Defina limites por categoria em <a href="#/configuracoes">Configurações</a>.</span>`;
  }
  const off = [...c.excludedAcc].map((id) => c.accById.get(id)).filter(Boolean);
  return `<div class="kpi-grid">
    <article class="kpi">
      <div class="top">Gastos em ${fmtMonthName(ui.month)}<span class="ico">${svg(ICON.up)}</span></div>
      <span class="v">${brl(c.cur.total)}</span>
      <div class="m">${vs != null ? `<span class="chip ${vs > 0 ? 'warn' : 'pos'}">${vs > 0 ? '▲ +' : '▼ −'}${num(Math.abs(vs) * 100, 1)}%</span><span>vs ${fmtMonthName(c.prevMonth)}</span>` : `<span>${plural(c.cur.out.length, 'transação', 'transações')}</span>`}</div>
      ${reimb || (ui.account === 'all' && off.length) ? `<span class="m">${[reimb ? `${brl(reimb)} reembolsados nos grupos` : '', ui.account === 'all' && off.length ? `sem ${off.map((a) => esc(a.name)).join(', ')}` : ''].filter(Boolean).join(' · ')}</span>` : ''}
    </article>
    <article class="kpi">
      <div class="top">Receitas<span class="ico">${svg(ICON.down)}</span></div>
      <span class="v">${brl(c.incomeTotal)}</span>
      <span class="m">${c.cur.income.length ? `${esc(topIncome)} · ${plural(c.cur.income.length, 'entrada', 'entradas')}` : 'Nenhuma entrada no mês'}</span>
    </article>
    <article class="kpi">
      <div class="top">Saldo do mês<span class="ico">${svg(ICON.coin)}</span></div>
      <span class="v ${balance >= 0 ? 'pos-t' : 'neg-t'}">${balance >= 0 ? '+' : '−'}${brl(Math.abs(balance))}</span>
      <div class="m">${c.incomeTotal ? `<span class="chip ${balance >= 0 ? 'pos' : 'neg'}">${num((balance / c.incomeTotal) * 100, 1)}%</span><span>da renda ${balance >= 0 ? 'guardada' : 'acima do que entrou'}</span>` : '<span>Sem receitas para comparar</span>'}</div>
    </article>
    <article class="kpi">${budgetCard}</article>
  </div>`;
}

function groupsHtml(c) {
  const totals = groupTotals(c);
  return `<section class="card" style="gap: 14px;">
    <div class="card-head">
      <div class="t"><h2>Meus grupos</h2><span class="s">Pagamentos menos o que você recebeu de volta</span></div>
      <a class="btn sm" href="#/configuracoes">${svg(ICON.edit, 16)}Gerenciar</a>
    </div>
    ${totals.length ? `<div>${totals.map((g) => `<button class="list-row group-row" data-filter-cat="group:${esc(g.id)}" aria-pressed="${ui.tx.cat === `group:${g.id}`}" title="Ver as transações de ${esc(g.name)}">
        <div class="tile sm" style="background: ${soft(g.color)}; color: var(${g.color});">${svg(groupIcon(g.icon))}</div>
        <div class="grow"><b>${esc(g.name)}${g.excludeFromTotals ? ' <span class="chip neutral" style="font-size: 11px; padding: 1px 7px;">fora dos totais</span>' : ''}</b><small>${[
          g.n || g.nIn ? `${brl(g.out)} ${g.excludeFromTotals ? 'saíram' : 'pagos'}${g.received ? ` · ${brl(g.received)} ${g.excludeFromTotals ? 'voltaram' : 'recebidos'}` : ''}` : '',
          g.nOff ? `${brl(g.offOut)} fora dos totais` : '',
        ].filter(Boolean).join(' · ') || 'Nada neste mês'}</small></div>
        ${!g.n && !g.nIn && g.nOff
          ? `<div class="end"><span class="muted">${brl(g.offOut)}</span><small>fora dos totais</small></div>`
          : `<div class="end"><span>${g.net < 0 ? '+' : ''}${brl(Math.abs(g.net))}</span><small>${g.net < 0 ? 'recebeu a mais' : 'líquido'}</small></div>`}
      </button>`).join('')}</div>`
    : `<p class="empty">Agrupe gastos parecidos (ex.: <b>Cinema</b> = GNC, Ingresso.com, Cinemark) ou de uma atividade com amigos (o Pix que eles te mandam desconta do total).<br><a class="btn sm" href="#/configuracoes">${svg(ICON.plus, 16)}Criar grupo</a></p>`}
  </section>`;
}

function categoriesHtml(s, c) {
  const budgets = s.budgets ?? {};
  const rows = new Map();
  for (const g of groupTotals(c)) if (g.n || g.nIn) rows.set(`group:${g.id}`, { key: `group:${g.id}`, isGroup: true, offTotals: g.excludeFromTotals, label: g.name, icon: groupIcon(g.icon), color: g.color, value: g.net, n: g.n, received: g.received });
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
  const list = [...rows.values()].sort((a, b) => b.value - a.value);
  const total = c.cur.total;
  return `<section class="card" style="flex: 3 1 560px; gap: 10px;">
    <div class="card-head" style="padding-bottom: 6px;">
      <div class="t"><h2>Para onde vai seu dinheiro</h2><span class="s">Seus grupos e as categorias${Object.keys(budgets).length ? ', comparados ao orçamento' : ''}</span></div>
      <div class="legend" style="font-size: 12px; gap: 12px;">
        <span><i class="sw round" style="background: var(--pos);"></i>Dentro</span>
        <span><i class="sw round" style="background: var(--warn);"></i>Atenção (85%+)</span>
        <span><i class="sw round" style="background: var(--neg);"></i>Estourou</span>
      </div>
    </div>
    ${list.map((r) => {
      const b = budgets[r.key];
      let prog, chip;
      if (b) {
        const ratio = r.value / b, st = status(ratio);
        prog = `<div class="bar"><div style="width: ${Math.min(Math.max(ratio, 0), 1) * 100}%; background: var(${st.color});"></div></div><small>${brl0(r.value)} de ${brl0(b)} · ${Math.round(ratio * 100)}%</small>`;
        chip = `<span class="chip ${st.tone}" style="font-size: 11px; padding: 2px 8px;">${st.label}</span>`;
      } else {
        const share = total > 0 ? Math.max(r.value, 0) / total : 0;
        prog = `<div class="bar"><div style="width: ${Math.min(share, 1) * 100}%; background: var(${r.color ?? '--accent'});"></div></div><small>Sem orçamento definido</small>`;
        chip = r.offTotals ? '<span class="chip neutral" style="font-size: 11px; padding: 2px 8px;">Fora dos totais</span>'
          : r.isGroup ? '<span class="chip accent" style="font-size: 11px; padding: 2px 8px;">Grupo</span>' : '<span class="chip neutral" style="font-size: 11px; padding: 2px 8px;">Sem limite</span>';
        if (r.offTotals) prog = '<div class="bar"><div style="width: 0;"></div></div><small>Não entra em Gastos nem no Saldo</small>';
      }
      const meta = r.isGroup
        ? `${plural(r.n, 'pagamento', 'pagamentos')}${r.received ? ` · ${brl(r.received)} recebidos` : ''}`
        : `${plural(r.n, 'transação', 'transações')} · ${num(total > 0 ? (r.value / total) * 100 : 0, 1)}% do total`;
      return `<button class="cat-row" data-filter-cat="${esc(r.key)}" aria-pressed="${ui.tx.cat === r.key}" title="Ver as transações de ${esc(r.label)}">
        <div class="who"><div class="tile" ${r.isGroup ? `style="background: ${soft(r.color)}; color: var(${r.color});"` : ''}>${svg(r.icon, 19)}</div>
          <div class="names"><b>${esc(r.label)}</b><small>${meta}</small></div></div>
        <div class="prog">${prog}</div>
        <div class="amt"><b>${r.value < 0 ? '+' : ''}${brl(Math.abs(r.value))}</b>${chip}</div>
      </button>`;
    }).join('') || '<p class="empty">Nenhum gasto neste mês.</p>'}
  </section>`;
}

function methodsHtml(c) {
  const gross = sum(c.cur.out);
  const groups = Object.keys(METHODS).map((k) => {
    const list = c.cur.out.filter((t) => t.method === k);
    return { k, ...METHODS[k], n: list.length, value: sum(list) };
  }).filter((m) => m.n);
  return `<section class="card">
    <div class="card-head"><div class="t"><h2>Por meio de pagamento</h2><span class="s">Como você pagou em ${fmtMonthName(ui.month)}</span></div></div>
    ${groups.length ? `<div class="split-bar" role="img" aria-label="Divisão dos gastos por meio de pagamento">${groups.map((m) => `<div title="${m.label}: ${brl(m.value)}" style="width: ${(m.value / gross) * 100}%; background: var(${m.color});"></div>`).join('')}</div>
    <div>${groups.map((m) => `<div class="list-row">
        <div class="tile sm" style="background: ${soft(m.color)}; color: var(${m.color});">${svg(ICON[m.k] ?? ICON.outros)}</div>
        <div class="grow"><b>${m.label}</b><small>${plural(m.n, 'transação', 'transações')}</small></div>
        <div class="end"><span>${brl(m.value)}</span><small>${num((m.value / gross) * 100, 1)}%</small></div>
      </div>`).join('')}</div>` : '<p class="empty">Nenhum gasto neste mês.</p>'}
  </section>`;
}

function cardsHtml(c) {
  const cards = c.scope.filter((a) => a.type === 'CREDIT');
  if (!cards.length) return '';
  const today = todayIso();
  return `<section class="card" style="gap: 16px;">
    <div class="card-head"><div class="t"><h2>Cartões de crédito</h2><span class="s">Fatura atual e uso do limite</span></div></div>
    ${cards.map((a) => {
      const cr = a.credit ?? {};
      const used = cr.limit != null && cr.available != null ? cr.limit - cr.available : a.balance;
      const u = cr.limit ? used / cr.limit : null;
      const color = u == null ? '--accent' : u >= 0.85 ? '--neg' : u >= 0.6 ? '--warn' : '--pos';
      const brand = (BRANDS.find(([re]) => re.test(`${a.connector} ${a.name}`)) ?? [null, 'var(--accent)'])[1];
      const closed = cr.closeDate && today >= cr.closeDate.slice(0, 10) && (!cr.dueDate || today <= cr.dueDate.slice(0, 10));
      const dates = [cr.closeDate && !closed ? `Fecha ${fmtDayMonth(cr.closeDate)}` : null, cr.dueDate ? `vence ${fmtDayMonth(cr.dueDate)}` : null].filter(Boolean).join(' · ');
      const last4 = a.number ? ` · ${String(a.number).slice(-4)}` : '';
      const off = c.excludedAcc.has(a.id);
      return `<div class="credit-card">
        <div class="head">
          <div class="plastic" aria-hidden="true" style="background: ${brand};"></div>
          <div style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px;"><b style="font-size: 14px;">${esc(a.name)}${esc(last4)}</b><small class="muted" style="font-size: 12px;">${esc(dates || a.connector)}</small></div>
          ${off ? '<span class="chip neutral" title="Os gastos deste cartão aparecem na lista, mas não entram nos totais. Altere em Configurações.">Fora dos totais</span>' : `<span class="chip ${closed ? 'warn' : 'accent'}">${closed ? 'Fechada' : 'Aberta'}</span>`}
        </div>
        <div class="amount"><b>${brl(a.balance)}</b><small>${u != null ? `${Math.round(u * 100)}% de ${brl0(cr.limit)}` : ''}</small></div>
        ${u != null ? `<div class="bar thin"><div style="width: ${Math.min(u, 1) * 100}%; background: var(${color});"></div></div>` : ''}
      </div>`;
    }).join('')}
  </section>`;
}

function paceData(s, c) {
  const days = daysInMonth(ui.month);
  const prevDays = daysInMonth(c.prevMonth);
  const daily = (m, n) => {
    const arr = new Array(n).fill(0);
    for (const t of m.out) arr[Number(t.date.slice(8, 10)) - 1] += t.amount;
    for (const t of m.reimb) arr[Number(t.date.slice(8, 10)) - 1] -= t.amount;
    let acc = 0;
    return arr.map((v) => (acc += v));
  };
  const cur = daily(c.cur, days);
  const prev = daily(c.prev, prevDays);
  const isCurrent = ui.month === todayIso().slice(0, 7);
  const todayDay = isCurrent ? Number(todayIso().slice(8, 10)) : days;
  const spent = cur[todayDay - 1] ?? 0;
  const projection = isCurrent && todayDay ? (spent / todayDay) * days : null;
  const budgetTotal = Object.values(s.budgets ?? {}).reduce((a, b) => a + b, 0) || null;
  return { days, cur, prev, todayDay, spent, projection, budgetTotal };
}

function paceHtml(s, c) {
  const pd = paceData(s, c);
  let proj = '';
  if (pd.projection != null) {
    const st = pd.budgetTotal ? status(pd.projection / pd.budgetTotal) : null;
    proj = `<div class="proj"><span class="muted">Projeção para ${pd.days} de ${fmtMonthName(ui.month)}:</span><b>${brl(pd.projection)}</b>
      ${st ? `<span class="chip ${st.tone}">${st.label === 'Dentro' ? 'Dentro do orçamento' : st.label === 'Atenção' ? 'Perto do limite' : 'Acima do orçamento'}</span>` : ''}</div>`;
  }
  return `<section class="card">
    <div class="card-head">
      <div class="t"><h2>Ritmo de gastos</h2><span class="s">Acumulado no mês, dia a dia</span></div>
      <div class="legend">
        <span><i class="sw line" style="background: var(--accent);"></i>${esc(fmtMonthName(ui.month))}</span>
        <span><i class="sw dash"></i>${esc(fmtMonthName(c.prevMonth))}</span>
        ${pd.projection != null ? '<span><i class="sw dot"></i>Projeção</span>' : ''}
        ${pd.budgetTotal ? '<span><i class="sw line" style="background: var(--warn);"></i>Orçamento</span>' : ''}
      </div>
    </div>
    <div class="chart"><canvas id="pace-chart" aria-label="Gasto acumulado do mês comparado ao anterior"></canvas></div>
    ${proj}
  </section>`;
}

function mountPace(s, c) {
  const pd = paceData(s, c);
  const t = chartTheme();
  const labels = Array.from({ length: pd.days }, (_, i) => i + 1);
  const cur = pd.cur.map((v, i) => (i < pd.todayDay ? v : null));
  const proj = pd.projection != null ? labels.map((d) => (d < pd.todayDay ? null : pd.spent + ((pd.projection - pd.spent) * (d - pd.todayDay)) / Math.max(pd.days - pd.todayDay, 1))) : [];
  mountChart($('#pace-chart'), {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: fmtMonthName(c.prevMonth), data: labels.map((d) => pd.prev[d - 1] ?? pd.prev.at(-1)), borderColor: t.muted, borderWidth: 1.5, borderDash: [5, 5], pointRadius: 0, tension: 0.2 },
        {
          label: fmtMonthName(ui.month), data: cur, borderColor: t.accent, borderWidth: 2.5, tension: 0.2, fill: 'start', backgroundColor: areaFill(t.accent),
          pointRadius: (ctx) => (ctx.dataIndex === pd.todayDay - 1 ? 5 : 0), pointBackgroundColor: t.accent, pointBorderColor: t.surface, pointBorderWidth: 3,
        },
        ...(proj.length ? [{ label: 'Projeção', data: proj, borderColor: t.accent, borderWidth: 2, borderDash: [2, 4], pointRadius: 0 }] : []),
        ...(pd.budgetTotal ? [{ label: 'Orçamento', data: labels.map(() => pd.budgetTotal), borderColor: t.warn, borderWidth: 2, pointRadius: 0 }] : []),
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false, animation: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: { ...tooltip(t), filter: (i) => i.raw != null, callbacks: { title: (it) => `Dia ${it[0].label}`, label: (i) => ` ${i.dataset.label}: ${brl(i.raw)}` } },
      },
      scales: {
        x: { grid: { display: false }, border: { display: false }, ticks: { autoSkip: false, maxRotation: 0, callback: (_v, i) => ([0, 7, 15, 22, pd.days - 1].includes(i) ? String(i + 1).padStart(2, '0') : '') } },
        y: { beginAtZero: true, grid: { color: t.border }, border: { display: false }, ticks: { maxTicksLimit: 5, callback: (v) => brlCompact(v) } },
      },
    },
    plugins: [crosshair],
  });
}

// Category column: your groups first, then "+ Novo grupo", then Pluggy's categories.
function categoryOptions(s, t) {
  const groups = s.groups ?? [];
  const selected = t.group ? `group:${t.group.id}` : t.category.id;
  const cats = [...s.categories];
  if (!cats.some((o) => o.id === t.category.id)) cats.push(t.category);
  if (!cats.some((o) => o.id === 'outros')) cats.push({ id: 'outros', label: 'Outros' });
  const opt = (v, l) => `<option value="${esc(v)}"${v === selected ? ' selected' : ''}>${esc(l)}</option>`;
  return `${groups.length ? `<optgroup label="Meus grupos">${groups.map((g) => opt(`group:${g.id}`, g.name)).join('')}</optgroup>` : ''}
    <option value="new-group">＋ Novo grupo…</option>
    ${t.groupSource === 'manual' ? '<option value="auto">↺ Voltar ao automático</option>' : ''}
    <optgroup label="Categorias">${cats.map((o) => opt(o.id, o.label)).join('')}</optgroup>`;
}

// Which transactions the filter bar shows: the picked month, or a longer range fetched on demand.
function txSource(store, s, c) {
  if (ui.tx.period === 'month') return { data: s, list: c.cur.list, label: `em ${fmtMonthName(ui.month)}`, loading: false };
  const range = txRange();
  if (!range) return { data: s, list: [], label: '', loading: false, invalid: true };
  const r = store.spending[`range:${range.from}:${range.to}`];
  if (!r) { loadRange(store, range); return { data: s, list: [], label: '', loading: true }; }
  const scopeIds = new Set(c.scope.map((a) => a.id));
  return { data: r, list: r.transactions.filter((t) => scopeIds.has(t.accountId)), label: `de ${fmtDate(range.from)} a ${fmtDate(range.to)}`, loading: false, errors: r.errors };
}

function applyTxFilters(list) {
  const f = ui.tx;
  const q = fold(f.q.trim());
  return list.filter((t) => (f.method === 'all' || t.method === f.method)
    && (f.dir === 'all' || t.direction === f.dir)
    && (!f.cat || (f.cat.startsWith('group:') ? t.group?.id === f.cat.slice(6) : !t.group && t.category.id === f.cat))
    && (!q || fold([t.description, t.rawDescription, t.counterparty, t.kind, t.category.label, t.group?.name].join(' ')).includes(q)));
}

function txSummary(list, c) {
  const counts = (t) => !t.excluded && c.accountCounts(t.accountId);
  const out = sum(list.filter((t) => t.direction === 'out' && counts(t)));
  const inn = sum(list.filter((t) => t.direction === 'in' && counts(t)));
  return `${plural(list.length, 'transação', 'transações')} · <b>${brl(out)}</b> em saídas · <b class="pos-t">${brl(inn)}</b> em entradas`;
}

function txFiltersHtml(src, c) {
  const f = ui.tx;
  const groups = src.data.groups ?? [];
  const cats = [...new Map(src.list.filter((t) => !t.group).map((t) => [t.category.id, t.category])).values()].sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
  if (f.cat && !f.cat.startsWith('group:') && !cats.some((x) => x.id === f.cat)) {
    const known = (src.data.categories ?? []).find((x) => x.id === f.cat);
    if (known) cats.push(known);
  }
  const methods = Object.keys(METHODS).filter((k) => src.list.some((t) => t.method === k) || f.method === k);
  const active = f.q || f.cat || f.method !== 'all' || f.dir !== 'all' || f.period !== 'month';
  const sel = (v, cur) => (v === cur ? ' selected' : '');
  const periodLabel = { month: fmtMonthLong(ui.month), '3m': 'Últimos 3 meses', '6m': 'Últimos 6 meses', '12m': 'Últimos 12 meses', custom: 'Período personalizado' };
  return `<div class="tx-filters" role="search" aria-label="Filtrar transações">
    <label class="search grow-1">${svg(ICON.search)}<span class="sr-only">Buscar transação</span><input type="search" id="tx-q" placeholder="Buscar descrição, nome ou categoria" value="${esc(f.q)}"></label>
    <label class="sr-only" for="tx-period">Período</label>
    <select class="select" id="tx-period">${PERIODS.map(([k]) => `<option value="${k}"${sel(k, f.period)}>${periodLabel[k]}</option>`).join('')}</select>
    ${f.period === 'custom' ? `<label class="sr-only" for="tx-from">De</label><input class="input date" type="date" id="tx-from" value="${esc(f.from ?? '')}" max="${todayIso()}">
      <label class="sr-only" for="tx-to">Até</label><input class="input date" type="date" id="tx-to" value="${esc(f.to ?? '')}" max="${todayIso()}">` : ''}
    <label class="sr-only" for="tx-cat">Grupo ou categoria</label>
    <select class="select" id="tx-cat">
      <option value="">Todos os grupos e categorias</option>
      ${groups.length ? `<optgroup label="Meus grupos">${groups.map((g) => `<option value="group:${esc(g.id)}"${sel(`group:${g.id}`, f.cat)}>${esc(g.name)}</option>`).join('')}</optgroup>` : ''}
      ${cats.length ? `<optgroup label="Categorias">${cats.map((x) => `<option value="${esc(x.id)}"${sel(x.id, f.cat)}>${esc(x.label)}</option>`).join('')}</optgroup>` : ''}
    </select>
    <label class="sr-only" for="tx-method">Meio de pagamento</label>
    <select class="select" id="tx-method"><option value="all">Todos os meios</option>${methods.map((k) => `<option value="${k}"${sel(k, f.method)}>${METHODS[k].label}</option>`).join('')}</select>
    <div class="seg" role="group" aria-label="Tipo">
      ${[['all', 'Todas'], ['out', 'Saídas'], ['in', 'Entradas']].map(([k, l]) => `<button data-dir="${k}" aria-pressed="${f.dir === k}">${l}</button>`).join('')}
    </div>
    ${active ? '<button class="btn sm" id="tx-clear" type="button">Limpar filtros</button>' : ''}
  </div>`;
}

function txRowsHtml(src, c, list) {
  const wide = ui.tx.period !== 'month';
  return list.slice(0, ui.shown).map((t) => {
    const acc = c.accById.get(t.accountId);
    const m = METHODS[t.method] ?? METHODS.outros;
    const isIn = t.direction === 'in';
    const offAccount = !c.accountCounts(t.accountId);
    const notes = [
      t.kind,
      t.counterparty && t.counterparty !== t.description ? (isIn ? `de ${nice(t.counterparty)}` : `para ${nice(t.counterparty)}`) : null,
      t.excluded ? `não conta · ${EXCLUDED[t.excluded]}` : null,
      t.group && isIn && !t.excluded ? `${t.group.offTotals ? 'retorno' : 'reembolso'} · ${t.group.name}` : null,
      t.installment ? `parcela ${t.installment}` : null,
      !t.kind && !t.counterparty && !t.excluded && !t.installment ? acc?.name : null,
    ].filter(Boolean).join(' · ');
    const offGroup = Boolean(t.group?.offTotals);
    const chip = t.status === 'PENDING' ? ['warn', 'Pendente'] : t.excluded ? ['neutral', 'Ignorada'] : offAccount || offGroup ? ['neutral', 'Fora do total'] : ['pos', 'Confirmada'];
    const muted = t.excluded || offAccount;
    const icon = t.group ? groupIcon(t.group.icon) : isIn ? ICON.receita : spendIcon(t.category.key);
    const gColor = t.group ? groupColor(c.groups, t.group.id) : null;
    return `<div role="row" class="tgrid tx trow${wide ? ' wide' : ''}">
      <span role="cell" class="muted">${wide ? fmtDate(t.date) : fmtDay(t.date)}</span>
      <div role="cell" class="cell-main">
        <div class="tile" style="width: 38px; height: 38px; ${gColor ? `background: ${soft(gColor)}; color: var(${gColor});` : ''}">${svg(icon)}</div>
        <div class="names"><b title="${esc(t.rawDescription)}">${esc(nice(t.description))}</b><small title="${esc(notes)}">${esc(notes)}</small></div>
      </div>
      <div role="cell"><select class="plain-select" data-tx="${esc(t.id)}" data-rule="${esc(t.ruleKey)}" data-cat="${esc(t.category.id)}" data-has-group="${t.group ? '1' : ''}" aria-label="Grupo ou categoria de ${esc(t.description)}" style="${t.group ? 'font-weight: 600;' : ''}">${categoryOptions(src.data, t)}</select></div>
      <div role="cell" style="display: flex; align-items: center; gap: 8px; min-width: 0;"><span class="sw round" style="background: var(${m.color});"></span><span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${m.short} · ${esc(acc?.name ?? acc?.connector ?? '')}</span></div>
      <div role="cell"><span class="chip ${chip[0]}">${chip[1]}</span></div>
      <span role="cell" class="r" style="font-weight: 600; ${isIn && !muted ? 'color: var(--pos);' : muted ? 'color: var(--muted);' : ''}">${isIn ? '+' : '−'}${brl(t.amount)}</span>
    </div>`;
  }).join('');
}

function txTableHtml(src, c) {
  if (src.loading) return '<p class="empty" style="padding: 16px;">Buscando transações do período…</p>';
  if (src.invalid) return '<p class="empty" style="padding: 16px;">Escolha a data inicial e a final.</p>';
  const list = applyTxFilters(src.list);
  const wide = ui.tx.period !== 'month';
  return `<p class="tx-summary">${txSummary(list, c)} ${src.label}</p>
    ${src.errors?.length ? `<div class="notice error">Algumas conexões não responderam: ${esc(src.errors.join(' · '))}</div>` : ''}
    <div class="table-wrap">
      <div role="table" aria-label="Transações">
        <div role="row" class="tgrid tx thead${wide ? ' wide' : ''}"><span>Data</span><span>Descrição</span><span>Grupo / categoria</span><span>Meio</span><span>Status</span><span class="r">Valor</span></div>
        ${txRowsHtml(src, c, list) || '<p class="empty" style="padding: 16px;">Nenhuma transação com esses filtros.</p>'}
      </div>
    </div>
    ${list.length > ui.shown ? `<div style="display: flex; justify-content: center;"><button class="btn sm" data-more>Mostrar mais ${Math.min(PAGE, list.length - ui.shown)} de ${list.length - ui.shown}</button></div>` : ''}`;
}

function txHtml(store, s, c) {
  const src = txSource(store, s, c);
  return `<section class="card" id="tx-card">
    <div class="card-head" style="align-items: center;">
      <div class="t"><h2>Transações</h2><span class="s">Mude a categoria de uma transação para colocá-la num grupo</span></div>
    </div>
    ${txFiltersHtml(src, c)}
    <div id="tx-table">${txTableHtml(src, c)}</div>
  </section>`;
}

function bindTxFilters(store, s, c) {
  const f = ui.tx;
  const refresh = () => { ui.shown = PAGE; store.rerender({ keepScroll: true }); };
  // Typing only redraws the table, so the search box keeps focus.
  $('#tx-q').oninput = (e) => { f.q = e.target.value; ui.shown = PAGE; $('#tx-table').innerHTML = txTableHtml(txSource(store, s, c), c); };
  $('#tx-period').onchange = (e) => {
    f.period = e.target.value;
    if (f.period === 'custom' && !f.from) { f.from = `${ui.month}-01`; f.to = todayIso(); }
    refresh();
  };
  const from = $('#tx-from'), to = $('#tx-to');
  if (from) from.onchange = () => { f.from = from.value; refresh(); };
  if (to) to.onchange = () => { f.to = to.value; refresh(); };
  $('#tx-cat').onchange = (e) => { f.cat = e.target.value; refresh(); };
  $('#tx-method').onchange = (e) => { f.method = e.target.value; refresh(); };
  $$('#tx-card [data-dir]').forEach((b) => { b.onclick = () => { f.dir = b.dataset.dir; refresh(); }; });
  const clear = $('#tx-clear');
  if (clear) clear.onclick = () => { Object.assign(f, { period: 'month', cat: '', method: 'all', dir: 'all', q: '' }); refresh(); };
}

// Clicking a group or category elsewhere on the page filters the transactions to it.
function filterTo(store, cat) {
  ui.tx.cat = ui.tx.cat === cat ? '' : cat;
  ui.shown = PAGE;
  store.rerender({ keepScroll: true });
  if (ui.tx.cat) $('#tx-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ---------- View ----------

async function changeCategory(store, sel) {
  const { tx, rule, cat, hasGroup } = sel.dataset;
  const value = sel.value;
  if (value === 'new-group') {
    const name = prompt('Nome do novo grupo (ex.: Basquete, Cinema):');
    if (!name?.trim()) { store.rerender({ keepScroll: true }); return; }
    const group = await api('/api/groups', { method: 'POST', body: { name: name.trim() } });
    await api('/api/tx-group', { method: 'POST', body: { txId: tx, groupId: group.id } });
    toast(`Grupo “${group.name}” criado. Adicione palavras-chave em Configurações para agrupar automaticamente.`);
  } else if (value === 'auto') {
    await api('/api/tx-group', { method: 'POST', body: { txId: tx, groupId: null } });
  } else if (value.startsWith('group:')) {
    await api('/api/tx-group', { method: 'POST', body: { txId: tx, groupId: value.slice(6) } });
  } else {
    if (hasGroup) await api('/api/tx-group', { method: 'POST', body: { txId: tx, groupId: 'none' } });
    if (value !== cat) await api('/api/tx-rules', { method: 'POST', body: { key: rule, categoryId: value } });
  }
  store.settings = await api('/api/settings');
  store.spending = {}; // groups and rules apply to every month
  await store.loadSpending(ui.month, { keepScroll: true });
}

export function spendingView(store) {
  const s = store.spending?.[ui.month];
  const current = todayIso().slice(0, 7);
  const accounts = s?.accounts ?? [];
  const off = new Set(s?.excludedAccounts ?? []);
  const actions = `
    <div class="month-picker">
      <button data-month="-1" aria-label="Mês anterior">${svg(ICON.left)}</button>
      <span>${fmtMonthLong(ui.month)}</span>
      <button data-month="1" aria-label="Próximo mês" ${ui.month >= current ? 'disabled' : ''}>${svg(ICON.right)}</button>
    </div>
    <label class="sr-only" for="account-filter">Conta</label>
    <select class="select" id="account-filter">
      <option value="all">Todas as contas</option>
      ${accounts.map((a) => `<option value="${a.id}"${ui.account === a.id ? ' selected' : ''}>${esc(a.name)} · ${esc(a.connector)}${off.has(a.id) ? ' (fora dos totais)' : ''}</option>`).join('')}
    </select>`;

  const bindHeader = () => {
    $$('[data-month]').forEach((b) => { b.onclick = () => { ui.month = addMonths(ui.month, Number(b.dataset.month)); ui.shown = PAGE; store.rerender(); }; });
    const sel = $('#account-filter');
    if (sel) sel.onchange = () => { ui.account = sel.value; store.rerender({ keepScroll: true }); };
  };

  if (!store.portfolio?.connections.length) {
    return { title: 'Gastos', sub: 'Cartões, Pix, débito e boletos', actions: '', html: '<section class="notice"><h2>Nenhuma conta conectada</h2><p>Conecte seu banco em <a href="#/contas">Contas conectadas</a> para ver seus gastos.</p></section>', mount() {} };
  }
  if (!s) {
    store.loadSpending(ui.month);
    return { title: 'Gastos', sub: 'Cartões, Pix, débito e boletos', actions, html: '<section class="card"><p class="empty">Carregando transações…</p></section>', mount: bindHeader };
  }
  if (ui.account !== 'all' && !s.accounts.some((a) => a.id === ui.account)) ui.account = 'all';
  if (ui.tx.cat.startsWith('group:') && !(s.groups ?? []).some((g) => `group:${g.id}` === ui.tx.cat)) ui.tx.cat = '';
  const c = compute(s);

  return {
    title: 'Gastos',
    sub: 'Cartões, Pix, débito e boletos',
    actions,
    html: `
      ${s.errors?.length ? `<div class="notice error">Algumas conexões não responderam: ${esc(s.errors.join(' · '))}</div>` : ''}
      ${kpisHtml(s, c)}
      <div class="row">
        ${categoriesHtml(s, c)}
        <div class="col" style="flex: 2 1 360px;">${groupsHtml(c)}${methodsHtml(c)}${cardsHtml(c)}</div>
      </div>
      ${paceHtml(s, c)}
      ${txHtml(store, s, c)}`,
    mount(root) {
      bindHeader();
      mountPace(s, c);
      bindTxFilters(store, s, c);
      root.onclick = (e) => {
        const t = e.target.closest('[data-more],[data-filter-cat]');
        if (!t) return;
        if (t.dataset.filterCat) { filterTo(store, t.dataset.filterCat); return; }
        ui.shown += PAGE;
        $('#tx-table').innerHTML = txTableHtml(txSource(store, s, c), c);
      };
      root.onchange = async (e) => {
        const sel = e.target.closest('select[data-tx]');
        if (!sel) return;
        sel.disabled = true;
        try { await changeCategory(store, sel); } catch (err) { showError(err.message); sel.disabled = false; }
      };
    },
  };
}
