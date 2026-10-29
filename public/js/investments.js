// Investimentos view: growth, distribution, class cards, goals, income, highlights, holdings.
import {
  $, $$, esc, brl, brl0, brlCompact, money, num, pct, arrowPct, signedPct, signedBrl, toneClass, plural,
  fmtDate, fmtDay, fmtDayMonth, fmtMonth, fmtMonthYear, fmtMonthName, todayIso, addDays, addMonths, utc,
  ICON, svg, CATEGORIES, CORE_CATEGORIES, cat, soft, subtypeLabel, cssVar, chartTheme, tooltip, crosshair,
  mountChart, areaFill, sparkPath, api, showError,
} from './core.js';

const ui = { period: 365, filter: 'ALL', search: '', movers: 'up', sort: { key: 'balance', asc: false }, open: new Set() };
const PERIODS = [['1M', 30, 'no mês'], ['6M', 180, 'em 6 meses'], ['1A', 365, 'em 12 meses'], ['Tudo', 0, 'desde o início']];

// ---------- Derived data ----------

function rateLabel(i) {
  const parts = [];
  if (i.rate != null && i.rateType) parts.push(i.rateType === 'CDI' ? `${num(i.rate)}% do CDI` : i.rate === 100 ? i.rateType : `${num(i.rate)}% ${i.rateType}`);
  if (i.fixedAnnualRate) parts.push(`${num(i.fixedAnnualRate)}% a.a.`);
  return parts.join(' + ');
}

// "CDB - NU FINANCEIRA S.A. - SOCIEDADE DE CREDITO..." → "Nu Financeira"
function shortIssuer(i) {
  let s = i.issuer || i.name.split(' - ').slice(1).join(' - ') || i.name;
  s = s.split(/ - |,| S\.?\/?A\.?\b/i)[0].trim();
  return s.toLowerCase().replace(/(^|\s)(\p{L})/gu, (m, sp, c) => sp + c.toUpperCase()).replace(/\b(De|Da|Do|Dos|Das|E)\b/g, (w) => w.toLowerCase());
}

function describe(i) {
  if (i.category === 'RENDA_FIXA') {
    const kind = i.subtype === 'TREASURY' ? 'Tesouro' : subtypeLabel(i.subtype) || 'Renda fixa';
    const title = i.subtype === 'TREASURY' ? i.name.replace(/^Tesouro\s*/i, 'Tesouro ') : `${kind} ${shortIssuer(i)}`;
    const sub = [i.rateLabel, i.dueDate ? `vence ${fmtMonthYear(i.dueDate)}` : null].filter(Boolean).join(' · ');
    return { title, sub: sub || shortIssuer(i), short: i.subtype === 'TREASURY' ? 'TD' : (i.subtype || 'RF').slice(0, 4) };
  }
  const ticker = i.code || (/^[A-Z0-9]{4,6}$/.test(i.name) ? i.name : null);
  if (ticker) return { title: ticker, sub: i.name !== ticker ? i.name : subtypeLabel(i.subtype), short: ticker.slice(0, 4) };
  return { title: i.name, sub: subtypeLabel(i.subtype) || i.institution, short: cat(i.category).short };
}

export function derive(p) {
  const investments = p.connections.flatMap((c) => c.investments).map((i) => {
    const cost = i.amountOriginal ?? (i.amountProfit != null ? i.balance - i.amountProfit : null);
    const x = { ...i, cost, rateLabel: rateLabel(i), returnPct: i.amountProfit != null && cost > 0 ? i.amountProfit / cost : null };
    x.avgPrice = x.quantity && cost != null && x.category !== 'RENDA_FIXA' ? cost / x.quantity : null;
    Object.assign(x, describe(x));
    return x;
  });
  const accounts = p.connections.flatMap((c) => c.accounts);
  const cash = accounts.filter((a) => a.type === 'BANK').reduce((s, a) => s + a.balance, 0);
  const total = investments.reduce((s, i) => s + i.balance, 0);
  for (const i of investments) i.share = total ? i.balance / total : 0;
  const withCost = investments.filter((i) => i.returnPct != null);
  const profit = withCost.reduce((s, i) => s + i.amountProfit, 0);
  const cost = withCost.reduce((s, i) => s + i.cost, 0);
  const invested = investments.reduce((s, i) => s + (i.cost ?? i.balance), 0);
  const yearAgo = addDays(todayIso(), -365);
  const income12m = p.income.filter((e) => e.date >= yearAgo).reduce((s, e) => s + e.amount, 0);

  const classes = {};
  for (const key of Object.keys(CATEGORIES)) classes[key] = { key, value: 0, count: 0, profit: 0, cost: 0, monthW: 0, monthV: 0, subtypes: {} };
  for (const i of investments) {
    const c = classes[i.category] ?? classes.OUTROS;
    c.value += i.balance;
    c.count += 1;
    if (i.returnPct != null) { c.profit += i.amountProfit; c.cost += i.cost; }
    if (i.lastMonthRate != null) { c.monthW += i.balance; c.monthV += i.balance * i.lastMonthRate; }
    const st = i.category === 'FII' ? 'REAL_ESTATE_FUND' : i.subtype;
    if (st) c.subtypes[st] = (c.subtypes[st] ?? 0) + i.balance;
  }
  return { investments, accounts, cash, total, profit, cost, invested, income12m, classes };
}

function growthSeries(p, d, days) {
  const today = todayIso();
  const contrib = new Map();
  for (const c of p.contributions) contrib.set(c.date, (contrib.get(c.date) ?? 0) + c.delta);
  const values = new Map(p.history.map((h) => [h.date, h.invested]));
  values.set(today, d.total);
  const first = [...contrib.keys(), ...values.keys()].sort()[0] ?? today;
  const start = days ? [first, addDays(today, -days)].sort()[1] : first;
  const labels = [], applied = [], value = [];
  let cum = 0;
  for (let day = first; day <= today; day = addDays(day, 1)) {
    cum += contrib.get(day) ?? 0;
    if (day < start) continue;
    labels.push(day);
    applied.push(Math.max(cum, 0));
    value.push(values.get(day) ?? null);
  }
  return { labels, applied, value };
}

// ---------- Sections ----------

function heroHtml(p, d) {
  const series = growthSeries(p, d, ui.period);
  const known = series.value.filter((v) => v != null);
  const word = PERIODS.find((x) => x[1] === ui.period)[2];
  let chip, label;
  if (known.length >= 2) {
    const delta = known.at(-1) - known[0];
    chip = `<span class="chip ${toneClass(delta)}">${arrowPct(known[0] ? delta / known[0] : 0)}</span>`;
    label = `${signedBrl(delta)} ${word}`;
  } else if (d.cost > 0) {
    chip = `<span class="chip ${toneClass(d.profit)}">${arrowPct(d.profit / d.cost)}</span>`;
    label = 'desde o início · o histórico diário começa hoje';
  } else {
    chip = '';
    label = 'O histórico diário começa hoje';
  }
  const missing = p.coverage.total - p.coverage.withHistory;
  return `
  <section class="card" style="flex: 2 1 560px;">
    <div class="card-head">
      <div class="t" style="gap: 8px;">
        <span class="s" style="font-size: 14px; font-weight: 500;">Patrimônio investido</span>
        <span class="hero-value">${brl(d.total)}</span>
        <div class="hero-meta">${chip}<span>${esc(label)}</span></div>
      </div>
      <div class="seg" role="group" aria-label="Período">
        ${PERIODS.map(([l, v]) => `<button data-period="${v}" aria-pressed="${v === ui.period}">${l}</button>`).join('')}
      </div>
    </div>
    <div class="legend">
      <span><i class="sw line" style="background: var(--accent);"></i>Patrimônio</span>
      <span><i class="sw dash"></i>Valor aplicado</span>
    </div>
    <div class="chart"><canvas id="growth-chart" aria-label="Evolução do patrimônio e do valor aplicado"></canvas></div>
    <div class="stats">
      <div class="stat"><span>Valor aplicado</span><b>${brl(d.invested)}</b></div>
      <div class="stat"><span>Resultado</span><b class="${d.profit >= 0 ? 'pos-t' : 'neg-t'}">${signedBrl(d.profit)}</b></div>
      <div class="stat"><span>Rentabilidade total</span><b class="${d.profit >= 0 ? 'pos-t' : 'neg-t'}">${d.cost ? signedPct(d.profit / d.cost) : '–'}</b></div>
      <div class="stat"><span>Proventos (12 meses)</span><b>${brl(d.income12m)}</b></div>
      <div class="stat"><span>Saldo em conta</span><b>${brl(d.cash)}</b></div>
    </div>
    ${missing > 0 ? `<small class="muted">${plural(missing, 'ativo', 'ativos')} sem movimentações informadas — o valor aplicado deles entra na data da compra.</small>` : ''}
  </section>`;
}

function mountGrowth(p, d) {
  const series = growthSeries(p, d, ui.period);
  const t = chartTheme();
  const known = series.value.filter((v) => v != null).length;
  const narrow = $('#growth-chart').parentElement.clientWidth < 560;
  mountChart($('#growth-chart'), {
    type: 'line',
    data: {
      labels: series.labels,
      datasets: [
        {
          label: 'Patrimônio', data: series.value, borderColor: t.accent, borderWidth: 2.5, spanGaps: true, tension: 0.25,
          pointRadius: (ctx) => (known < 3 || ctx.dataIndex === series.labels.length - 1 ? 5 : 0),
          pointBackgroundColor: t.accent, pointBorderColor: t.surface, pointBorderWidth: 3, pointHoverRadius: 5,
          fill: 'start', backgroundColor: areaFill(t.accent),
        },
        { label: 'Valor aplicado', data: series.applied, borderColor: t.muted, borderWidth: 1.5, borderDash: [5, 5], stepped: true, pointRadius: 0, pointHoverRadius: 3, fill: false },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false, animation: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: { ...tooltip(t), filter: (i) => i.raw != null, callbacks: { title: (it) => fmtDate(series.labels[it[0].dataIndex]), label: (i) => ` ${i.dataset.label}: ${brl(i.raw)}` } },
      },
      scales: {
        x: { grid: { display: false }, border: { display: false }, ticks: { autoSkip: true, maxRotation: 0, maxTicksLimit: narrow ? 4 : 7, callback: (_v, i) => fmtDayMonth(series.labels[i]) } },
        y: { position: 'left', grid: { color: t.border, borderDash: [4, 4] }, border: { display: false }, ticks: { maxTicksLimit: 4, callback: (v) => brlCompact(v) } },
      },
    },
    plugins: [crosshair],
  });
}

function donutRows(d) {
  return Object.keys(CATEGORIES).filter((k) => k !== 'CAIXA' && d.classes[k].value > 0)
    .map((k) => ({ key: k, label: CATEGORIES[k].label, value: d.classes[k].value, color: CATEGORIES[k].color }));
}

function distributionHtml(d) {
  const rows = donutRows(d);
  return `
  <section class="card" style="flex: 1 1 340px;">
    <div class="card-head"><div class="t"><h2>Distribuição da carteira</h2><span class="s">Por classe de ativo</span></div></div>
    <div class="donut-box">
      <div class="donut"><canvas id="dist-chart" aria-label="Distribuição por classe" width="212" height="212"></canvas>
        <div class="donut-center"><span id="donut-label">Total</span><b id="donut-value">${brl0(d.total)}</b><span id="donut-sub">${plural(d.investments.length, 'ativo', 'ativos')}</span></div>
      </div>
    </div>
    <div class="legend-rows" id="dist-rows">
      ${rows.map((r, idx) => `<div class="list-row" data-idx="${idx}">
        <span class="sw" style="background: var(${r.color});"></span>
        <span style="flex: 1;">${r.label}</span>
        <span class="muted" style="font-size: 13px;">${brl(r.value)}</span>
        <b style="width: 52px; text-align: right;">${pct(d.total ? r.value / d.total : 0)}</b>
      </div>`).join('') || '<p class="empty">Sem investimentos.</p>'}
    </div>
  </section>`;
}

function mountDistribution(d) {
  const rows = donutRows(d);
  const setCenter = (idx) => {
    const r = rows[idx];
    $('#donut-label').textContent = r ? r.label : 'Total';
    $('#donut-value').textContent = r ? pct(r.value / d.total) : brl0(d.total);
    $('#donut-sub').textContent = r ? brl0(r.value) : plural(d.investments.length, 'ativo', 'ativos');
    $$('#dist-rows .list-row').forEach((el, i) => el.classList.toggle('hl', i === idx));
  };
  mountChart($('#dist-chart'), {
    type: 'doughnut',
    data: { labels: rows.map((r) => r.label), datasets: [{ data: rows.map((r) => r.value), backgroundColor: rows.map((r) => cssVar(r.color)), borderColor: cssVar('--surface'), borderWidth: 3, hoverOffset: 4 }] },
    options: { responsive: false, animation: false, cutout: '72%', plugins: { legend: { display: false }, tooltip: { enabled: false } }, onHover: (_e, els) => setCenter(els[0]?.index ?? -1) },
  });
  $('#dist-chart').onmouseleave = () => setCenter(-1);
  $$('#dist-rows .list-row').forEach((el) => {
    el.onmouseenter = () => setCenter(Number(el.dataset.idx));
    el.onmouseleave = () => setCenter(-1);
  });
}

function classCardsHtml(p, d) {
  const keys = Object.keys(CATEGORIES).filter((k) => k !== 'CAIXA' && (CORE_CATEGORIES.includes(k) || d.classes[k].value > 0));
  const hist = p.history.slice(-90);
  return `<div class="class-cards">${keys.map((k) => {
    const c = d.classes[k];
    const meta = CATEGORIES[k];
    const mix = Object.entries(c.subtypes).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([s]) => subtypeLabel(s));
    const sub = c.count ? (mix.length ? mix.join(' e ') : plural(c.count, 'ativo', 'ativos')) : 'Nenhum ativo';
    const month = c.monthW ? c.monthV / c.monthW / 100 : null;
    const spark = hist.map((h) => h.byCategory?.[k] ?? 0);
    const sparkOk = spark.filter((v) => v > 0).length >= 3;
    return `<button class="class-card" data-class="${k}" aria-pressed="${ui.filter === k}">
      <div class="top">
        <div class="tile" style="width: 38px; height: 38px; background: ${soft(meta.color)}; color: var(${meta.color});">${svg(ICON[meta.icon], 19)}</div>
        <div class="names"><b>${meta.label}</b><small>${esc(sub)}</small></div>
        <span class="chip neutral">${pct(d.total ? c.value / d.total : 0)}</span>
      </div>
      <div style="display: flex; flex-direction: column; gap: 8px;">
        <span class="value">${brl(c.value)}</span>
        <div class="meta">
          ${month != null ? `<span class="chip ${toneClass(month)}">${arrowPct(month)} no mês</span>` : ''}
          ${c.cost > 0 ? `<span>${signedPct(c.profit / c.cost)} desde o início</span>` : ''}
        </div>
      </div>
      ${sparkOk
        ? `<svg class="spark" viewBox="0 0 200 44" preserveAspectRatio="none" aria-hidden="true"><path d="${sparkPath(spark)}" style="fill: none; stroke: var(${meta.color}); stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; vector-effect: non-scaling-stroke;"/></svg>`
        : '<div class="spark-empty">Histórico em construção</div>'}
    </button>`;
  }).join('')}</div>`;
}

// ---------- Goals ----------

function monthKey(iso) { return iso.slice(0, 7); }

function goalsHtml(p, d, settings) {
  const g = settings.goals;
  const thisMonth = todayIso().slice(0, 7);
  const dated = p.contributions.filter((c) => !c.estimated);
  const monthAportes = dated.filter((c) => monthKey(c.date) === thisMonth && c.delta > 0).sort((a, b) => b.date.localeCompare(a.date));
  const aportado = dated.filter((c) => monthKey(c.date) === thisMonth).reduce((s, c) => s + c.delta, 0);
  const editLink = '<a class="btn sm" href="#/configuracoes">' + svg(ICON.edit, 16) + 'Editar metas</a>';

  // Aporte do mês
  let aporte;
  if (g.monthlyContribution) {
    const meta = g.monthlyContribution;
    const ratio = Math.max(aportado, 0) / meta;
    const left = Math.max(meta - aportado, 0);
    const [y, m] = thisMonth.split('-').map(Number);
    const daysLeft = new Date(Date.UTC(y, m, 0)).getUTCDate() - Number(todayIso().slice(8, 10));
    const months = Array.from({ length: 12 }, (_, k) => addMonths(thisMonth, k - 11));
    const net = Object.fromEntries(months.map((mm) => [mm, dated.filter((c) => monthKey(c.date) === mm).reduce((s, c) => s + c.delta, 0)]));
    const past = months.slice(0, -1);
    const hits = past.filter((mm) => net[mm] >= meta).length;
    aporte = `
      <div class="card-head">
        <div class="t"><h2>Aporte de ${fmtMonthName(thisMonth)}</h2><span class="s">Meta mensal de investimento</span></div>
        <span class="chip ${ratio >= 1 ? 'pos' : 'warn'}">${ratio >= 1 ? 'Meta batida' : plural(daysLeft, 'dia restante', 'dias restantes')}</span>
      </div>
      <div style="display: flex; align-items: center; gap: 20px;">
        <div class="ring" role="img" aria-label="Meta de aporte ${Math.round(ratio * 100)}% concluída" style="background: conic-gradient(var(--accent) 0 ${Math.min(ratio, 1) * 100}%, var(--surface-2) 0 100%);"><div>${Math.round(ratio * 100)}%</div></div>
        <div style="display: flex; flex-direction: column; gap: 4px; min-width: 0;">
          <small class="muted">Aportado</small>
          <b style="font-size: 24px; letter-spacing: -0.02em;">${brl(Math.max(aportado, 0))}</b>
          <small class="muted">de ${brl(meta)}</small>
          <b style="font-size: 13px;">${left > 0 ? `Faltam ${brl(left)}` : 'Meta concluída'}</b>
        </div>
      </div>
      <div>${monthAportes.slice(0, 3).map((a) => `<div class="list-row">
          <span class="sw" style="background: var(${cat(a.category).color});"></span>
          <div class="grow"><b>${esc(a.name)}</b><small>${fmtDay(a.date)}${a.quantity ? ` · ${num(a.quantity)} cotas` : ` · ${cat(a.category).label}`}</small></div>
          <b>${brl(a.delta)}</b></div>`).join('') || '<p class="empty" style="border-top: 1px solid var(--border); padding-top: 12px;">Nenhum aporte registrado neste mês ainda.</p>'}</div>
      <div style="display: flex; flex-direction: column; gap: 10px; padding-top: 14px; border-top: 1px solid var(--border);">
        <small class="muted">Meta batida em ${hits} dos últimos ${past.length} meses</small>
        <div class="months">${months.map((mm, i) => {
          const current = i === months.length - 1;
          const hit = net[mm] >= meta;
          const bg = current ? 'var(--surface-2)' : hit ? 'var(--pos)' : 'var(--neg-soft)';
          return `<div title="${fmtMonth(`${mm}-01`)}: ${brl(net[mm])}${current ? ' (em andamento)' : hit ? ' · meta batida' : ' · meta não batida'}"><div style="background: ${bg}; ${current ? 'box-shadow: inset 0 0 0 2px var(--accent);' : ''}"></div><span>${fmtMonth(`${mm}-01`)}</span></div>`;
        }).join('')}</div>
      </div>`;
  } else {
    aporte = `<div class="card-head"><div class="t"><h2>Aporte do mês</h2><span class="s">Meta mensal de investimento</span></div></div>
      <div class="empty">Você aportou <b>${brl(Math.max(aportado, 0))}</b> em ${fmtMonthName(thisMonth)}. Defina uma meta mensal para acompanhar o ritmo.<br><a class="btn sm" href="#/configuracoes">${svg(ICON.plus, 16)}Definir meta</a></div>`;
  }

  // Meta de patrimônio
  let wealth;
  if (g.wealthTarget) {
    const target = g.wealthTarget;
    const r = (g.monthlyRate ?? 0.9) / 100;
    const end = g.wealthDate ? g.wealthDate.slice(0, 7) : null;
    const now = todayIso().slice(0, 7);
    const months = end ? Math.max((Number(end.slice(0, 4)) - Number(now.slice(0, 4))) * 12 + Number(end.slice(5, 7)) - Number(now.slice(5, 7)), 0) : null;
    let pmt = null;
    if (months) {
      const grow = (1 + r) ** months;
      pmt = Math.max(r ? ((target - d.total * grow) * r) / (grow - 1) : (target - d.total) / months, 0);
    }
    const kind = pmt == null || !g.monthlyContribution ? 'accent' : pmt <= g.monthlyContribution ? 'pos' : pmt <= g.monthlyContribution * 1.25 ? 'warn' : 'neg';
    const status = { accent: d.total >= target ? 'Meta atingida' : 'Em andamento', pos: 'No ritmo', warn: 'Quase no ritmo', neg: 'Abaixo do ritmo' }[kind];
    wealth = `
      <div class="card-head"><div class="t"><h2>Meta de patrimônio</h2><span class="s">${brl0(target)}${end ? ` até ${fmtMonthYear(`${end}-01`)}` : ''}</span></div><span class="chip ${kind}">${status}</span></div>
      <div style="display: flex; align-items: baseline; justify-content: space-between; gap: 8px;">
        <b style="font-size: 28px; letter-spacing: -0.025em;">${pct(d.total / target)}</b>
        <small class="muted">${d.total >= target ? 'Meta atingida' : `Faltam ${brl0(target - d.total)}`}</small>
      </div>
      <div class="bar thick"><div style="width: ${Math.min(d.total / target, 1) * 100}%; background: var(--accent);"></div></div>
      ${pmt != null ? `<div class="soft-box"><span>Aporte necessário: <b>~${brl0(pmt)}/mês</b></span><small class="muted">Considerando rendimento de ${num(g.monthlyRate ?? 0.9)}% ao mês até ${fmtMonthYear(`${end}-01`)}</small></div>` : '<small class="muted">Defina uma data para calcular o aporte necessário.</small>'}`;
  } else {
    wealth = `<div class="card-head"><div class="t"><h2>Meta de patrimônio</h2><span class="s">Quanto você quer ter investido</span></div></div>
      <div class="empty">Defina um valor e uma data para ver quanto precisa aportar por mês.<br><a class="btn sm" href="#/configuracoes">${svg(ICON.plus, 16)}Definir meta</a></div>`;
  }

  // Meta de alocação
  const targets = g.allocation ?? {};
  let alloc;
  if (Object.keys(targets).length) {
    const keys = Object.keys(CATEGORIES).filter((k) => k !== 'CAIXA' && (targets[k] || d.classes[k].value > 0));
    const curOf = (k) => (d.total ? (d.classes[k].value / d.total) * 100 : 0);
    const scale = Math.max(40, Math.ceil(Math.max(...keys.map((k) => Math.max(curOf(k), targets[k] ?? 0))) / 10) * 10);
    const rows = keys.map((k) => {
      const cur = curOf(k), tg = targets[k] ?? 0, diff = cur - tg, ad = Math.abs(diff);
      const kind = ad <= 2 ? 'pos' : ad <= 5 ? 'warn' : 'neg';
      return `<div class="alloc-row">
        <div class="lbl"><b><span class="sw" style="background: var(${CATEGORIES[k].color});"></span>${CATEGORIES[k].label}</b><small>${brl0(d.classes[k].value)} · alvo ${brl0((tg / 100) * d.total)}</small></div>
        <div class="track"><div class="cur" style="width: ${Math.min(cur / scale, 1) * 100}%; background: var(${CATEGORIES[k].color});"></div><div class="tgt" style="left: ${(tg / scale) * 100}%;"></div></div>
        <span class="nums"><b>${num(cur, 1)}%</b><span class="muted"> / ${num(tg, 1)}%</span></span>
        <span class="chip ${kind}">${ad <= 2 ? 'No alvo' : `${diff > 0 ? '+' : '−'}${num(ad, 1)} p.p.`}</span>
      </div>`;
    }).join('');
    const remaining = g.monthlyContribution ? Math.max(g.monthlyContribution - Math.max(aportado, 0), 0) : 0;
    let suggest = '';
    if (remaining > 0) {
      const newTotal = d.total + remaining;
      const defs = keys.map((k) => ({ k, gap: Math.max(((targets[k] ?? 0) / 100) * newTotal - d.classes[k].value, 0) })).filter((x) => x.gap > 0);
      const sum = defs.reduce((s, x) => s + x.gap, 0);
      if (sum > 0) {
        suggest = `<div class="suggest">
          <div><b style="color: var(--accent);">Onde aportar os ${brl(remaining)} que faltam</b><br><small>Sugestão para aproximar a carteira do alvo sem vender nada</small></div>
          <div class="items">${defs.sort((a, b) => b.gap - a.gap).map((x) => `<div><span class="sw" style="background: var(${CATEGORIES[x.k].color});"></span><span>${CATEGORIES[x.k].label}</span><b>${brl((remaining * x.gap) / sum)}</b></div>`).join('')}</div>
        </div>`;
      }
    }
    alloc = `
      <div class="legend">
        <span><i class="sw" style="width: 18px; height: 8px; border-radius: 999px; background: var(--muted);"></i>Atual</span>
        <span><i class="sw" style="width: 3px; height: 14px; border-radius: 2px; background: var(--text);"></i>Alvo</span>
        <span><i class="sw round" style="background: var(--pos);"></i>até 2 p.p.</span>
        <span><i class="sw round" style="background: var(--warn);"></i>2 a 5 p.p.</span>
        <span><i class="sw round" style="background: var(--neg);"></i>acima de 5 p.p.</span>
      </div>
      <div>${rows}</div>${suggest}`;
  } else {
    alloc = `<div class="empty">Defina o percentual que você quer em cada classe (ex.: 40% renda fixa, 25% FIIs…) para comparar com a carteira atual.<br><a class="btn sm" href="#/configuracoes">${svg(ICON.plus, 16)}Definir alocação alvo</a></div>`;
  }

  return `
  <div class="row" id="metas" style="scroll-margin-top: 24px;">
    <div class="col" style="flex: 1 1 340px;">
      <section class="card">${aporte}</section>
      <section class="card" style="gap: 14px;">${wealth}</section>
    </div>
    <section class="card" style="flex: 2 1 520px;">
      <div class="card-head"><div class="t"><h2>Meta de alocação</h2><span class="s">Carteira atual comparada à distribuição alvo</span></div>${editLink}</div>
      ${alloc}
    </section>
  </div>`;
}

// ---------- Income & highlights ----------

function incomeData(p) {
  const months = Array.from({ length: 12 }, (_, k) => addMonths(todayIso().slice(0, 7), k - 11));
  const byCat = {};
  for (const e of p.income) {
    const idx = months.indexOf(e.date.slice(0, 7));
    if (idx < 0) continue;
    const k = CATEGORIES[e.category] ? e.category : 'OUTROS';
    (byCat[k] ??= new Array(12).fill(0))[idx] += e.amount;
  }
  const cats = ['FII', 'ACOES', ...Object.keys(CATEGORIES).filter((k) => !['FII', 'ACOES'].includes(k))].filter((k) => byCat[k]);
  const total = cats.reduce((s, k) => s + byCat[k].reduce((a, b) => a + b, 0), 0);
  return { months, byCat, cats, total };
}

function incomeHtml(p) {
  const { cats, total } = incomeData(p);
  return `
  <section class="card" style="flex: 3 1 520px;">
    <div class="card-head">
      <div class="t"><h2>Proventos</h2><span class="s">Dividendos, JCP e rendimentos · últimos 12 meses</span></div>
      <div style="display: flex; flex-wrap: wrap; gap: 28px;">
        <div class="stat"><span>Total no período</span><b style="font-size: 20px; font-weight: 700;">${brl(total)}</b></div>
        <div class="stat"><span>Média mensal</span><b style="font-size: 20px; font-weight: 700;">${brl(total / 12)}</b></div>
      </div>
    </div>
    ${cats.length ? `<div class="legend">${cats.map((k) => `<span><i class="sw" style="background: var(${CATEGORIES[k].color});"></i>${CATEGORIES[k].label}</span>`).join('')}</div>
    <div class="chart sm"><canvas id="income-chart" aria-label="Proventos por mês"></canvas></div>`
    : '<p class="empty">Nenhum provento (dividendos, JCP, rendimentos de FII, cupons) foi informado pelas instituições conectadas.</p>'}
  </section>`;
}

function mountIncome(p) {
  const { months, byCat, cats } = incomeData(p);
  if (!cats.length) return;
  const t = chartTheme();
  const totals = months.map((_, i) => cats.reduce((s, k) => s + byCat[k][i], 0));
  mountChart($('#income-chart'), {
    type: 'bar',
    data: {
      labels: months,
      datasets: cats.map((k, ci) => ({
        label: CATEGORIES[k].label, data: byCat[k], backgroundColor: cssVar(CATEGORIES[k].color),
        borderRadius: ci === cats.length - 1 ? { topLeft: 6, topRight: 6 } : 0, borderSkipped: false,
        borderColor: t.surface, borderWidth: { top: ci === 0 ? 0 : 2 }, maxBarThickness: 36,
      })),
    },
    options: {
      responsive: true, maintainAspectRatio: false, animation: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: { ...tooltip(t), filter: (i) => i.raw > 0, callbacks: { title: (it) => fmtMonthYear(`${months[it[0].dataIndex]}-01`), label: (i) => ` ${i.dataset.label}: ${brl(i.raw)}`, footer: (it) => `Total: ${brl(totals[it[0].dataIndex])}` } },
      },
      scales: {
        x: { stacked: true, grid: { display: false }, border: { display: false }, ticks: { color: (c) => (c.index === 11 ? t.text : t.muted), font: (c) => ({ weight: c.index === 11 ? '700' : '500' }), callback: (_v, i) => fmtMonth(`${months[i]}-01`) } },
        y: { stacked: true, beginAtZero: true, grid: { color: t.border }, border: { display: false }, ticks: { maxTicksLimit: 4, callback: (v) => brlCompact(v) } },
      },
    },
  });
}

function moversHtml(d) {
  let metric = (i) => (i.lastMonthRate != null ? i.lastMonthRate / 100 : null);
  let caption = `Variação de cotação em ${fmtMonthName(todayIso().slice(0, 7))}`;
  if (!d.investments.some((i) => metric(i) != null)) {
    metric = (i) => (i.lastTwelveMonthsRate != null ? i.lastTwelveMonthsRate / 100 : null);
    caption = 'Rentabilidade nos últimos 12 meses';
    if (!d.investments.some((i) => metric(i) != null)) { metric = (i) => i.returnPct; caption = 'Rentabilidade desde a compra'; }
  }
  const rows = d.investments.map((i) => ({ ...i, m: metric(i) })).filter((i) => i.m != null && i.category !== 'RENDA_FIXA');
  const list = (ui.movers === 'up' ? rows.filter((r) => r.m > 0).sort((a, b) => b.m - a.m) : rows.filter((r) => r.m < 0).sort((a, b) => a.m - b.m)).slice(0, 5);
  return `
  <section class="card" style="flex: 2 1 340px; gap: 14px;">
    <div class="card-head">
      <div class="t"><h2>Destaques</h2><span class="s">${caption}</span></div>
      <div class="seg" role="group" aria-label="Altas ou quedas">
        <button data-movers="up" aria-pressed="${ui.movers === 'up'}">Altas</button>
        <button data-movers="down" aria-pressed="${ui.movers === 'down'}">Quedas</button>
      </div>
    </div>
    <div>${list.map((r) => `<div class="list-row" style="padding: 12px 0;">
        <div class="tile lg" style="background: ${soft(cat(r.category).color)};">${esc(r.short)}</div>
        <div class="grow"><b>${esc(r.title)}</b><small>${esc(r.sub)}</small></div>
        <div class="end"><span>${money(r.value ?? r.balance, r.currencyCode)}</span><span class="chip ${toneClass(r.m)}">${arrowPct(r.m)}</span></div>
      </div>`).join('') || `<p class="empty">Nenhum ativo em ${ui.movers === 'up' ? 'alta' : 'queda'}.</p>`}</div>
  </section>`;
}

// ---------- Holdings table ----------

const COLS = [
  ['title', 'Ativo'], ['category', 'Classe'], ['quantity', 'Qtd.', 'r'], ['avgPrice', 'Preço médio', 'r'], ['value', 'Cotação', 'r'],
  ['cost', 'Aplicado', 'r'], ['balance', 'Saldo atual', 'r'], ['amountProfit', 'Resultado', 'r'], ['share', 'Peso'],
];

const classOptions = (selected) => Object.keys(CATEGORIES).filter((k) => k !== 'CAIXA')
  .map((k) => `<option value="${k}"${k === selected ? ' selected' : ''}>${CATEGORIES[k].label}</option>`).join('');

const SOURCE_HINT = {
  pluggy: 'Classe informada pela instituição — altere se estiver errada.',
  ticker: 'Classe deduzida pelo ticker — altere se estiver errada.',
  name: 'Classe deduzida pelo nome — altere se estiver errada.',
  manual: 'Classe definida por você.',
};

// Fixed-income lots of the same product (issuer + rate, or the same Tesouro bond) collapse into one row.
const lotKey = (i) => (i.category === 'RENDA_FIXA' ? [i.subtype, i.title, i.rateLabel].join('|') : null);

function groupRow(key, lots) {
  const first = lots[0];
  const active = lots.filter((i) => i.balance > 0);
  const shown = (active.length ? active : lots).sort((a, b) => String(a.dueDate ?? '').localeCompare(String(b.dueDate ?? '')));
  const sumOf = (list, f) => (list.some((i) => i[f] != null) ? list.reduce((s, i) => s + (i[f] ?? 0), 0) : null);
  const withReturn = lots.filter((i) => i.returnPct != null);
  const profitCost = withReturn.reduce((s, i) => s + i.cost, 0);
  const dues = shown.map((i) => i.dueDate).filter(Boolean);
  const range = dues.length ? (fmtMonthYear(dues[0]) === fmtMonthYear(dues.at(-1)) ? `vence ${fmtMonthYear(dues[0])}` : `vencimentos de ${fmtMonthYear(dues[0])} a ${fmtMonthYear(dues.at(-1))}`) : '';
  const treasury = first.subtype === 'TREASURY';
  return {
    group: key, lots: shown, category: first.category, short: first.short, currencyCode: first.currencyCode,
    categoryKeys: lots.map((i) => i.categoryKey), categorySource: first.categorySource,
    title: treasury ? first.title : [subtypeLabel(first.subtype) || 'Renda fixa', first.rateLabel].filter(Boolean).join(' '),
    sub: [treasury ? null : shortIssuer(first), plural(shown.length, 'aplicação', 'aplicações')].filter(Boolean).join(' · '),
    hint: range,
    cost: sumOf(lots, 'cost'), balance: sumOf(lots, 'balance'), amountProfit: sumOf(lots, 'amountProfit'), share: sumOf(lots, 'share'),
    returnPct: profitCost > 0 ? withReturn.reduce((s, i) => s + i.amountProfit, 0) / profitCost : null,
    dueDate: dues[0] ?? null,
  };
}

function tableRows(d) {
  const q = ui.search.trim().toLowerCase();
  const rows = d.investments
    .filter((i) => ui.filter === 'ALL' || i.category === ui.filter)
    .filter((i) => !q || [i.title, i.sub, i.name, i.code, i.issuer, i.institution].some((f) => f && String(f).toLowerCase().includes(q)));
  const groups = new Map();
  const entries = [];
  for (const i of rows) {
    const k = lotKey(i);
    if (!k) { entries.push(i); continue; }
    if (!groups.has(k)) { groups.set(k, []); entries.push(k); }
    groups.get(k).push(i);
  }
  const top = entries.map((e) => (typeof e !== 'string' ? e : groups.get(e).length > 1 ? groupRow(e, groups.get(e)) : groups.get(e)[0]));
  const { key, asc } = ui.sort;
  top.sort((a, b) => {
    const av = a[key], bv = b[key];
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    const c = typeof av === 'number' ? av - bv : String(av).localeCompare(String(bv), 'pt-BR');
    return asc ? c : -c;
  });
  return { rows, top };
}

function tableBodyHtml(d) {
  const { rows, top } = tableRows(d);
  const maxW = Math.max(...top.map((i) => i.balance), 1);
  const caret = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%235C6270' stroke-width='2.5' stroke-linecap='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")";
  const rowHtml = (i, child = false) => {
    const c = cat(i.category);
    const dot = `radial-gradient(circle, var(${c.color}) 0 3.5px, transparent 4px)`;
    const open = i.group && ui.open.has(i.group);
    const title = child ? (i.dueDate ? `Vence em ${fmtDate(i.dueDate)}` : i.title) : i.title;
    const sub = child ? (i.cost != null ? `Aplicado ${brl(i.cost)}` : i.rateLabel) : i.sub;
    const keys = i.group ? i.categoryKeys.join(',') : i.categoryKey;
    return `<div role="row" class="tgrid assets trow${i.group ? ' group' : ''}${child ? ' child' : ''}"${i.group ? ` data-group="${esc(i.group)}"` : ''}>
      <div role="cell" class="cell-main">
        ${i.group ? `<button class="expander" data-group="${esc(i.group)}" aria-expanded="${open}" aria-label="${open ? 'Recolher' : 'Expandir'} ${esc(i.title)}">${svg(ICON.right, 16)}</button>` : ''}
        ${child ? '' : `<div class="tile" style="background: ${soft(c.color)};">${esc(i.short)}</div>`}
        <div class="names"><b title="${esc(i.hint ?? i.name)}">${esc(title)}</b><small>${esc(sub)}</small></div>
      </div>
      <div role="cell">${child ? '' : `<select class="chip-select" data-key="${esc(keys)}" aria-label="Classe de ${esc(i.title)}" title="${SOURCE_HINT[i.categorySource] ?? ''}" style="background-image: ${dot}, ${caret};">${classOptions(i.category)}</select>`}</div>
      <span role="cell" class="r">${i.quantity != null && i.category !== 'RENDA_FIXA' ? num(i.quantity, 4) : '—'}</span>
      <span role="cell" class="r muted">${i.avgPrice != null ? money(i.avgPrice, i.currencyCode) : '—'}</span>
      <span role="cell" class="r">${i.value != null && i.category !== 'RENDA_FIXA' ? money(i.value, i.currencyCode) : '—'}</span>
      <span role="cell" class="r muted">${i.cost != null ? money(i.cost, i.currencyCode) : '—'}</span>
      <span role="cell" class="r" style="font-weight: 600;">${money(i.balance, i.currencyCode)}</span>
      <div role="cell" class="cell-end">${i.amountProfit != null
        ? `<b class="${i.amountProfit >= 0 ? 'pos-t' : 'neg-t'}">${signedBrl(i.amountProfit)}</b>${i.returnPct != null ? `<span class="chip ${toneClass(i.returnPct)}" style="font-size: 11px; padding: 1px 7px;">${signedPct(i.returnPct)}</span>` : ''}`
        : '<span class="muted">—</span>'}</div>
      <div role="cell" class="weight"><div class="bar thin"><div style="width: ${(i.balance / maxW) * 100}%; background: var(${c.color});"></div></div><span>${pct(i.share)}</span></div>
    </div>${open ? i.lots.map((l) => rowHtml(l, true)).join('') : ''}`;
  };
  const body = top.map((i) => rowHtml(i)).join('') || '<p class="empty" style="padding: 16px;">Nenhum ativo encontrado.</p>';
  const sum = (f) => rows.reduce((s, i) => s + (i[f] ?? 0), 0);
  const res = sum('amountProfit');
  const foot = rows.length ? `<div role="row" class="tgrid assets tfoot">
      <span role="cell">Total</span><span></span><span></span><span></span><span></span>
      <span role="cell" class="r muted">${brl(sum('cost'))}</span>
      <span role="cell" class="r">${brl(sum('balance'))}</span>
      <span role="cell" class="r ${res >= 0 ? 'pos-t' : 'neg-t'}">${signedBrl(res)}</span>
      <span role="cell">${pct(sum('share'))} da carteira</span>
    </div>` : '';
  return { body, foot, count: rows.length };
}

function holdingsHtml(d) {
  const present = Object.keys(CATEGORIES).filter((k) => k !== 'CAIXA' && d.classes[k].count > 0);
  if (ui.filter !== 'ALL' && !present.includes(ui.filter)) ui.filter = 'ALL';
  const { body, foot, count } = tableBodyHtml(d);
  return `
  <section class="card" id="holdings">
    <div class="card-head" style="align-items: center;">
      <div class="t"><h2>Meus ativos</h2><span class="s" id="holdings-caption">${plural(count, 'ativo', 'ativos')} · dados via Pluggy</span></div>
      <div class="pills" role="group" aria-label="Filtrar por classe">
        ${[['ALL', 'Todos', d.investments.length], ...present.map((k) => [k, CATEGORIES[k].label, d.classes[k].count])]
          .map(([k, l, n]) => `<button class="pill" data-filter="${k}" aria-pressed="${ui.filter === k}">${l}<span class="n">${n}</span></button>`).join('')}
      </div>
    </div>
    <div class="table-wrap">
      <div role="table" aria-label="Ativos da carteira">
        <div role="row" class="tgrid assets thead">
          ${COLS.map(([k, l, cls]) => `<span role="columnheader" data-sort="${k}" class="${cls ?? ''}${ui.sort.key === k ? ` sorted${ui.sort.asc ? ' asc' : ''}` : ''}">${l}</span>`).join('')}
        </div>
        <div id="holdings-body">${body}</div>
        <div id="holdings-foot">${foot}</div>
      </div>
    </div>
  </section>`;
}

function refreshTable(d) {
  const { body, foot, count } = tableBodyHtml(d);
  $('#holdings-body').innerHTML = body;
  $('#holdings-foot').innerHTML = foot;
  $('#holdings-caption').textContent = `${plural(count, 'ativo', 'ativos')} · dados via Pluggy`;
  $$('#holdings .thead [data-sort]').forEach((el) => {
    el.classList.toggle('sorted', el.dataset.sort === ui.sort.key);
    el.classList.toggle('asc', el.dataset.sort === ui.sort.key && ui.sort.asc);
  });
}

// ---------- View ----------

export function investmentsView(store) {
  const p = store.portfolio;
  const updated = new Date(p.generatedAt);
  const d = derive(p);
  const empty = !p.connections.length;
  return {
    title: 'Investimentos',
    sub: `Atualizado hoje às ${updated.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
    actions: empty ? '' : `<label class="search">${svg(ICON.search)}<span class="sr-only">Buscar ativo</span><input type="search" id="asset-search" placeholder="Buscar ativo" value="${esc(ui.search)}"></label>`,
    html: empty
      ? `<section class="notice"><h2>Nenhuma conta conectada</h2><p>Conecte um banco ou corretora em <a href="#/contas">Contas conectadas</a>. Para testar, use o <b>Pluggy Bank</b> com <code>user-ok</code> / <code>password-ok</code>.</p></section>`
      : `
      <div class="row">${heroHtml(p, d)}${distributionHtml(d)}</div>
      ${classCardsHtml(p, d)}
      ${goalsHtml(p, d, store.settings)}
      <div class="row">${incomeHtml(p)}${moversHtml(d)}</div>
      ${holdingsHtml(d)}`,
    mount(root) {
      if (empty) return;
      mountGrowth(p, d);
      mountDistribution(d);
      mountIncome(p);
      if (store.scrollTo) { $(`#${store.scrollTo}`)?.scrollIntoView({ block: 'start' }); store.scrollTo = null; }

      root.onclick = (e) => {
        if (e.target.closest('.chip-select')) return;
        const t = e.target.closest('[data-period],[data-movers],[data-filter],[data-class],[data-sort],[data-group]');
        if (!t) return;
        if (t.dataset.group) {
          const g = t.dataset.group;
          if (!ui.open.delete(g)) ui.open.add(g);
          refreshTable(d);
          return;
        }
        if (t.dataset.period != null) { ui.period = Number(t.dataset.period); store.rerender(); }
        else if (t.dataset.movers) { ui.movers = t.dataset.movers; store.rerender(); }
        else if (t.dataset.filter) { ui.filter = t.dataset.filter; store.rerender({ keepScroll: true }); }
        else if (t.dataset.class) {
          ui.filter = ui.filter === t.dataset.class ? 'ALL' : t.dataset.class;
          store.rerender({ keepScroll: true });
          if (ui.filter !== 'ALL') $('#holdings')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else if (t.dataset.sort) {
          const k = t.dataset.sort;
          ui.sort = { key: k, asc: ui.sort.key === k ? !ui.sort.asc : ['title', 'category'].includes(k) };
          refreshTable(d);
        }
      };
      root.onchange = async (e) => {
        const sel = e.target.closest('.chip-select');
        if (!sel) return;
        sel.disabled = true;
        try {
          // A grouped row carries every lot's key; save them one by one so the overrides file isn't written concurrently.
          for (const key of sel.dataset.key.split(',')) await api('/api/categories', { method: 'POST', body: { key, category: sel.value } });
          await store.reload({ keepScroll: true });
        } catch (err) { showError(err.message); sel.disabled = false; }
      };
      const search = $('#asset-search');
      if (search) search.oninput = () => { ui.search = search.value; refreshTable(d); };
    },
  };
}
