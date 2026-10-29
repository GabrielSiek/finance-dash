// App shell: routing, shared data store, theme, sync and the sidebar connection status.
import { $, $$, esc, api, showError, toast, destroyCharts, relativeTime, ICON, svg } from './core.js';
import { investmentsView } from './investments.js';
import { spendingView } from './spending.js';
import { accountsView, settingsView, connectionStatus } from './settings.js';

const pendingSpending = new Map();

const store = {
  status: null,
  portfolio: null,
  settings: { goals: {}, budgets: {}, txRules: {} },
  spending: {},
  scrollTo: null,

  async reload(opts) {
    showError('');
    try {
      [this.portfolio, this.settings] = await Promise.all([api('/api/portfolio'), api('/api/settings')]);
    } catch (err) {
      showError(err.message);
    }
    render(opts);
  },

  rerender(opts) { render(opts); },

  loadSpending(month, opts) {
    if (pendingSpending.has(month)) return pendingSpending.get(month);
    const p = api(`/api/spending?month=${month}`)
      .then((s) => { this.spending[month] = s; render({ keepScroll: true, ...opts }); })
      .catch((err) => showError(err.message))
      .finally(() => pendingSpending.delete(month));
    pendingSpending.set(month, p);
    return p;
  },

  // After connecting or syncing, Pluggy keeps collecting for a while: poll until it's done.
  async waitForSync(ids, attempts = 25) {
    for (let i = 0; i < attempts; i++) {
      await new Promise((r) => setTimeout(r, i ? 4000 : 1500));
      try { this.portfolio = await api('/api/portfolio'); } catch { continue; }
      renderSidebar();
      const busy = this.portfolio.connections.filter((c) => ids.includes(c.id) && c.status === 'UPDATING');
      if (!busy.length) break;
    }
    this.spending = {};
    this.settings = await api('/api/settings').catch(() => this.settings);
    render({ keepScroll: true });
    toast('Dados atualizados');
  },
};

const ROUTES = {
  investimentos: investmentsView,
  metas: investmentsView,
  gastos: spendingView,
  contas: accountsView,
  configuracoes: settingsView,
};

const currentRoute = () => {
  const r = location.hash.replace(/^#\/?/, '').split(/[/?]/)[0];
  return ROUTES[r] ? r : 'investimentos';
};

function setupView() {
  const rejected = store.status?.configured && store.status?.authError;
  return {
    title: 'Bem-vindo ao Fluxo',
    sub: 'Configuração',
    actions: '',
    html: `<section class="notice${rejected ? ' error' : ''}">
      <h2>${rejected ? 'A Pluggy recusou as credenciais' : 'Conectar a Pluggy'}</h2>
      <p>${rejected
        ? 'O <b>Client ID</b> ou o <b>Client Secret</b> no arquivo <code>.env</code> não é válido, então não dá para abrir a janela de conexão. Confira se os dois são da <b>mesma aplicação</b> e se o secret não foi regenerado.'
        : 'O servidor ainda não tem credenciais da Pluggy.'}</p>
      <ol>
        <li>Abra <a href="https://dashboard.pluggy.ai" target="_blank" rel="noopener">dashboard.pluggy.ai</a> → sua aplicação → copie o <b>Client ID</b> e o <b>Client Secret</b> (não a API key).</li>
        <li>Cole os dois no arquivo <code>.env</code> na pasta do projeto.</li>
        <li>Reinicie o servidor (<code>Ctrl+C</code> e depois <code>npm start</code>) e recarregue esta página.</li>
      </ol>
    </section>`,
    mount() {},
  };
}

function renderSidebar() {
  const box = $('#conn-box');
  const conns = store.portfolio?.connections ?? [];
  if (!conns.length) { box.hidden = true; return; }
  const latest = conns.map((c) => c.lastUpdatedAt).filter(Boolean).sort().at(-1);
  box.hidden = false;
  box.innerHTML = `
    <div class="head"><b>Conexões Pluggy</b><span class="muted">${latest ? relativeTime(latest) : ''}</span></div>
    ${conns.map((c) => {
      const [tone, label] = connectionStatus(c);
      return `<a class="row" href="#/contas" style="color: inherit; text-decoration: none;"><span class="sw round" style="background: var(--${tone === 'neg' ? 'neg' : tone});"></span><span>${esc(c.connector)}</span><b style="font-size: 12px; color: var(--${tone});">${esc(label)}</b></a>`;
    }).join('')}`;
}

function renderThemeButton() {
  const dark = document.documentElement.classList.contains('dark');
  $('#btn-theme').innerHTML = svg(dark ? ICON.sun : ICON.moon);
}

function render(opts = {}) {
  const route = currentRoute();
  $$('.navlink').forEach((a) => { if (a.dataset.route === route) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  renderSidebar();
  renderThemeButton();

  const scrollY = window.scrollY;
  let view;
  if (store.status && (!store.status.configured || store.status.authError)) view = setupView();
  else if (!store.portfolio) view = { title: 'Fluxo', sub: 'Carregando…', actions: '', html: '<section class="card"><p class="empty">Carregando seus dados da Pluggy…</p></section>', mount() {} };
  else view = ROUTES[route](store);

  destroyCharts();
  $('#page-title').textContent = view.title;
  $('#page-sub').textContent = view.sub;
  $('#view-actions').innerHTML = view.actions ?? '';
  $('#btn-sync').hidden = !store.status?.configured || !store.portfolio?.connections.length;
  document.title = `${view.title} · Fluxo`;
  const root = $('#view');
  root.onclick = null;
  root.onchange = null;
  root.innerHTML = view.html;
  view.mount(root);
  if (opts.keepScroll) window.scrollTo(0, scrollY);
}

// ---------- Events ----------

window.addEventListener('hashchange', () => {
  if (currentRoute() === 'metas') store.scrollTo = 'metas';
  render();
  if (currentRoute() !== 'metas') window.scrollTo(0, 0);
});

$('#btn-theme').onclick = () => {
  const dark = document.documentElement.classList.toggle('dark');
  try { localStorage.setItem('theme', dark ? 'dark' : 'light'); } catch { /* ignore */ }
  render({ keepScroll: true });
};

$('#btn-sync').onclick = async () => {
  const btn = $('#btn-sync');
  btn.disabled = true;
  btn.querySelector('svg')?.classList.add('spin');
  try {
    await api('/api/sync', { method: 'POST' });
    toast('Sincronização solicitada à Pluggy…');
    await store.waitForSync(store.portfolio.connections.map((c) => c.id));
  } catch (err) {
    showError(err.message);
  } finally {
    btn.disabled = false;
    btn.querySelector('svg')?.classList.remove('spin');
  }
};

matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
  try { if (localStorage.getItem('theme')) return; } catch { /* ignore */ }
  document.documentElement.classList.toggle('dark', e.matches);
  render({ keepScroll: true });
});

// ---------- Boot ----------

(async function boot() {
  if (currentRoute() === 'metas') store.scrollTo = 'metas';
  render();
  try {
    store.status = await api('/api/status');
  } catch (err) {
    showError(err.message);
    return;
  }
  if (!store.status.configured || store.status.authError) { render(); return; }
  await store.reload();
})();
