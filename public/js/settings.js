// "Contas conectadas" and "Configurações" views.
import {
  $, $$, esc, brl, num, plural, fmtMonthName, addMonths, todayIso, ICON, svg, CATEGORIES, spendIcon, subtypeLabel, api, showError, toast,
  GROUP_ICON_OPTIONS, groupIcon, groupColor, soft,
} from './core.js';

// Unsaved edits to the groups list survive re-renders until saved (or until the saved list changes).
let groupDraft = null;
let groupDraftBase = null;

const STATUS = {
  UPDATED: ['pos', 'Ativa'],
  UPDATING: ['warn', 'Sincronizando…'],
  WAITING_USER_INPUT: ['warn', 'Precisa da sua ação'],
  OUTDATED: ['warn', 'Reconectar'],
  LOGIN_ERROR: ['neg', 'Erro de login'],
  ERROR: ['neg', 'Erro'],
};
export const connectionStatus = (c) => STATUS[c.status] ?? ['warn', c.status];

// ---------- Pluggy Connect ----------

export async function openConnect(store, itemId) {
  showError('');
  try {
    const { accessToken, includeSandbox } = await api('/api/connect-token', { method: 'POST', body: itemId ? { itemId } : {} });
    new window.PluggyConnect({
      connectToken: accessToken,
      includeSandbox,
      ...(itemId ? { updateItem: itemId } : {}),
      onSuccess: async ({ item }) => {
        await api('/api/items', { method: 'POST', body: { itemId: item.id } });
        toast('Conta conectada. Buscando dados…');
        await store.waitForSync([item.id]);
      },
      onError: (err) => showError(err?.message || 'Falha na conexão.'),
    }).init();
  } catch (err) {
    showError(err.message);
  }
}

export function accountsView(store) {
  const conns = store.portfolio?.connections ?? [];
  const accounts = conns.flatMap((c) => c.accounts);
  return {
    title: 'Contas conectadas',
    sub: 'Bancos e corretoras via Pluggy',
    actions: `<button class="btn" id="btn-connect">${svg(ICON.plus)}Conectar conta</button>`,
    html: `
      <section class="card">
        <div class="card-head"><div class="t"><h2>Conexões</h2><span class="s">${plural(conns.length, 'conexão', 'conexões')}</span></div></div>
        <div class="connections">${conns.map((c) => {
          const [tone, label] = connectionStatus(c);
          const needsLogin = ['LOGIN_ERROR', 'WAITING_USER_INPUT', 'OUTDATED'].includes(c.status);
          return `<div class="connection">
            ${c.connectorImage ? `<img src="${esc(c.connectorImage)}" alt="">` : `<div class="tile">${svg(ICON.caixa)}</div>`}
            <div class="grow"><b>${esc(c.connector)}${c.via && c.via !== c.connector ? ` <span class="chip neutral">via ${esc(c.via)}</span>` : ''}${c.isSandbox ? ' <span class="chip neutral">sandbox</span>' : ''}</b>
              <small>${c.lastUpdatedAt ? `Sincronizado ${new Date(c.lastUpdatedAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })} · ` : ''}${plural(c.investments.length, 'investimento', 'investimentos')} · ${plural(c.accounts.length, 'conta', 'contas')}${c.error ? ` · ${esc(c.error)}` : ''}</small></div>
            <span class="chip ${tone}">${esc(label)}</span>
            <div class="btns">
              <button class="btn sm" data-action="${needsLogin ? 'reconnect' : 'refresh'}" data-id="${c.id}">${needsLogin ? 'Reconectar' : 'Sincronizar'}</button>
              <button class="btn sm" data-action="remove" data-id="${c.id}" title="Remover deste painel (continua na Pluggy)">Remover</button>
            </div>
          </div>`;
        }).join('') || '<p class="empty">Nenhuma conexão ainda. Clique em <b>Conectar conta</b>. Para testar, escolha <b>Pluggy Bank</b> e entre com <code>user-ok</code> / <code>password-ok</code>.</p>'}</div>
        <form class="add-item" id="add-item-form">
          <div class="field"><label for="item-id">Já tem um item ID (ex.: criado no dashboard da Pluggy)?</label>
            <input class="input" id="item-id" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" pattern="[0-9a-fA-F-]{36}" required></div>
          <button class="btn" type="submit">Adicionar</button>
        </form>
      </section>
      ${accounts.length ? `<section class="card">
        <div class="card-head"><div class="t"><h2>Contas e cartões</h2><span class="s">Saldos informados pelas instituições</span></div></div>
        <div>${accounts.map((a) => `<div class="list-row">
            <div class="tile sm">${svg(a.type === 'CREDIT' ? ICON.cartao : ICON.caixa)}</div>
            <div class="grow"><b>${esc(a.name)}</b><small>${esc(subtypeLabel(a.subtype || a.type))} · ${esc(a.connector)}</small></div>
            <div class="end"><span>${brl(a.balance)}</span>${a.type === 'CREDIT' && a.credit?.limit ? `<small>limite ${brl(a.credit.limit)}</small>` : ''}</div>
          </div>`).join('')}</div>
      </section>` : ''}`,
    mount(root) {
      $('#btn-connect').onclick = () => openConnect(store);
      root.onclick = async (e) => {
        const btn = e.target.closest('button[data-action]');
        if (!btn) return;
        const { action, id } = btn.dataset;
        btn.disabled = true;
        try {
          if (action === 'refresh') {
            await api(`/api/items/${id}/refresh`, { method: 'POST' });
            toast('Sincronização solicitada');
            await store.waitForSync([id]);
          } else if (action === 'reconnect') {
            await openConnect(store, id);
          } else if (action === 'remove') {
            if (!confirm('Remover esta conexão do painel? (Ela continua na sua conta Pluggy.)')) return;
            await api(`/api/items/${id}`, { method: 'DELETE' });
            await store.reload();
          }
        } catch (err) {
          showError(err.message);
        } finally {
          btn.disabled = false;
        }
      };
      $('#add-item-form').onsubmit = async (e) => {
        e.preventDefault();
        try {
          await api('/api/items', { method: 'POST', body: { itemId: $('#item-id').value.trim() } });
          await store.reload();
        } catch (err) { showError(err.message); }
      };
    },
  };
}

// ---------- Configurações ----------

const moneyField = (id, label, value, hint = '') => `<div class="field"><label for="${id}">${label}</label>
  <div class="input-affix"><span class="pre">R$</span><input class="input has-pre" id="${id}" inputmode="decimal" value="${value != null ? num(value) : ''}" placeholder="0"></div>${hint ? `<small>${hint}</small>` : ''}</div>`;

// Accepts "1.500,50", "1500,5", "1500.5" and "1.500".
const parseNum = (s) => {
  let t = String(s ?? '').trim().replace(/\s|R\$|%/g, '');
  if (!t) return null;
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, '');
  const n = Number(t);
  return Number.isFinite(n) ? n : NaN;
};

export function settingsView(store) {
  const g = store.settings.goals;
  const spending = store.spending?.[todayIso().slice(0, 7)];
  if (!spending && store.portfolio?.connections.length) store.loadSpending(todayIso().slice(0, 7));
  const prevMonth = addMonths(todayIso().slice(0, 7), -1);
  const prevByCat = {};
  for (const t of spending?.transactions ?? []) {
    if (t.direction === 'out' && !t.excluded && t.date.startsWith(prevMonth)) prevByCat[t.category.id] = (prevByCat[t.category.id] ?? 0) + t.amount;
  }
  const budgetCats = spending?.categories ?? [];
  const rules = Object.entries(store.settings.txRules ?? {});
  const catLabel = new Map(budgetCats.map((c) => [c.id, c.label]));
  const savedGroups = store.settings.groups ?? [];
  if (!groupDraft || groupDraftBase !== JSON.stringify(savedGroups)) {
    groupDraft = savedGroups.map((x) => ({ ...x, patterns: [...x.patterns] }));
    groupDraftBase = JSON.stringify(savedGroups);
  }
  for (const t of spending?.transactions ?? []) {
    if (t.group && t.date.startsWith(prevMonth) && !t.excluded) {
      const k = `group:${t.group.id}`;
      prevByCat[k] = (prevByCat[k] ?? 0) + (t.direction === 'out' ? t.amount : -t.amount);
    }
  }
  const accounts = (store.portfolio?.connections ?? []).flatMap((c) => c.accounts);
  const excluded = new Set(store.settings.excludedAccounts ?? []);
  const budgetField = (key, label, icon, color) => `<div class="field">
      <label for="b-${esc(key)}" style="display: flex; align-items: center; gap: 8px;"><span style="display: inline-flex; ${color ? `color: var(${color});` : ''}">${svg(icon, 16)}</span>${esc(label)}</label>
      <div class="input-affix"><span class="pre">R$</span><input class="input has-pre budget-input" id="b-${esc(key)}" data-cat="${esc(key)}" inputmode="decimal" value="${store.settings.budgets?.[key] ? num(store.settings.budgets[key]) : ''}" placeholder="Sem limite"></div>
      ${prevByCat[key] ? `<small>${prevByCat[key] < 0 ? 'Recebeu a mais' : 'Gastou'} ${brl(Math.abs(prevByCat[key]))} em ${fmtMonthName(prevMonth)}</small>` : ''}
    </div>`;

  return {
    title: 'Configurações',
    sub: 'Grupos, orçamentos, metas e categorias',
    actions: '',
    html: `
      <form class="card" id="groups-form">
        <div class="card-head">
          <div class="t"><h2>Grupos de gastos</h2><span class="s">Juntam transações pela descrição ou pelo nome de quem recebe/envia o Pix. Pix <b>recebidos</b> que caem num grupo (ex.: colegas pagando a quadra) descontam do gasto do grupo.</span></div>
          <button class="btn sm" type="button" id="add-group">${svg(ICON.plus, 16)}Novo grupo</button>
        </div>
        ${groupDraft.map((gr, i) => `<div class="group-edit" data-i="${i}">
            <div class="field"><label for="gn-${i}">Nome</label><input class="input g-name" id="gn-${i}" value="${esc(gr.name)}" placeholder="Ex.: Basquete" maxlength="40" required></div>
            <div class="field"><label for="gi-${i}">Ícone</label><select class="select g-icon" id="gi-${i}" style="width: 100%;">${GROUP_ICON_OPTIONS.map(([k, l]) => `<option value="${k}"${k === gr.icon ? ' selected' : ''}>${l}</option>`).join('')}</select></div>
            <div class="field"><label for="gp-${i}">Palavras-chave e nomes <span class="muted" style="font-weight: 400;">(um por linha)</span></label>
              <textarea class="input g-patterns" id="gp-${i}" placeholder="${gr.categories?.length ? 'Nenhuma — este grupo usa categorias inteiras' : 'Uma palavra-chave ou nome por linha'}">${esc(gr.patterns.join('\n'))}</textarea>
              <small>Encontra a palavra inteira, sem diferenciar maiúsculas ou acentos.</small></div>
            <button class="btn sm" type="button" data-remove-group="${i}" aria-label="Remover grupo ${esc(gr.name)}">Remover</button>
            <label class="toggle-row" style="grid-column: 1 / -1; border-top: 0; padding: 0;">
              <input type="checkbox" class="g-totals" ${gr.excludeFromTotals ? '' : 'checked'}>
              <span><b style="font-weight: 600;">Somar nos totais de Gastos e Saldo</b> <span class="muted">— desmarque para só acompanhar o grupo (ex.: Investimentos)</span></span>
            </label>
            ${budgetCats.length ? `<details class="field" style="grid-column: 1 / -1;" ${gr.categories?.length ? 'open' : ''}>
              <summary style="cursor: pointer; font-weight: 600;">Incluir categorias inteiras${gr.categories?.length ? ` (${gr.categories.length})` : ''} <span class="muted" style="font-weight: 400;">— opcional; palavras-chave de outros grupos têm prioridade</span></summary>
              <div class="pills" style="margin-top: 10px;">${budgetCats.map((c) => `<label class="pill" style="cursor: pointer;" aria-pressed="${(gr.categories ?? []).includes(c.id)}">
                <input type="checkbox" class="g-cat sr-only" value="${esc(c.id)}" ${(gr.categories ?? []).includes(c.id) ? 'checked' : ''}>${esc(c.label)}</label>`).join('')}</div></details>` : ''}
          </div>`).join('') || '<p class="empty">Nenhum grupo ainda. Crie um para juntar gastos como Cinema, Basquete ou Futebol.</p>'}
        <div class="form-actions"><span class="saved" id="groups-saved" hidden>Grupos salvos</span><button class="btn primary" type="submit">Salvar grupos</button></div>
      </form>

      ${accounts.length ? `<section class="card" style="gap: 6px;">
        <div class="card-head" style="margin-bottom: 8px;"><div class="t"><h2>Contas nos totais</h2><span class="s">Desmarque para continuar vendo os gastos de uma conta ou cartão sem somá-los aos totais</span></div></div>
        ${accounts.map((a) => `<label class="toggle-row">
            <input type="checkbox" class="acc-toggle" data-acc="${esc(a.id)}" ${excluded.has(a.id) ? '' : 'checked'}>
            <div class="tile sm">${svg(a.type === 'CREDIT' ? ICON.cartao : ICON.caixa)}</div>
            <div style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px;"><b style="font-weight: 600;">${esc(a.name)}${a.number ? ` · ${esc(String(a.number).slice(-4))}` : ''}</b><small class="muted" style="font-size: 12px;">${esc(subtypeLabel(a.subtype || a.type))} · ${esc(a.connector)}</small></div>
            <span class="chip ${excluded.has(a.id) ? 'neutral' : 'pos'}">${excluded.has(a.id) ? 'Fora dos totais' : 'Conta nos totais'}</span>
          </label>`).join('')}
      </section>` : ''}

      <form class="card" id="goals-form">
        <div class="card-head"><div class="t"><h2>Metas de investimento</h2><span class="s">Usadas na seção Metas da página Investimentos</span></div></div>
        <div class="form-grid">
          ${moneyField('g-monthly', 'Aporte mensal', g.monthlyContribution, 'Quanto você quer investir por mês')}
          ${moneyField('g-target', 'Meta de patrimônio', g.wealthTarget)}
          <div class="field"><label for="g-date">Prazo da meta</label><input class="input" type="month" id="g-date" value="${esc(g.wealthDate ?? '')}"></div>
          <div class="field"><label for="g-rate">Rendimento esperado</label>
            <div class="input-affix"><input class="input has-suf" id="g-rate" inputmode="decimal" value="${num(g.monthlyRate ?? 0.9)}"><span class="suf">% a.m.</span></div>
            <small>Usado para estimar o aporte necessário</small></div>
        </div>
        <div class="field"><label>Alocação alvo</label><small>Percentual desejado de cada classe na carteira. <span id="alloc-sum"></span></small></div>
        <div class="alloc-edit">${Object.keys(CATEGORIES).filter((k) => k !== 'CAIXA').map((k) => `
          <div class="field"><label for="a-${k}" style="display: flex; align-items: center; gap: 8px;"><span class="sw" style="background: var(${CATEGORIES[k].color});"></span>${CATEGORIES[k].label}</label>
            <div class="input-affix"><input class="input has-suf alloc-input" id="a-${k}" data-cat="${k}" inputmode="decimal" value="${g.allocation?.[k] ? num(g.allocation[k]) : ''}" placeholder="0"><span class="suf">%</span></div></div>`).join('')}
        </div>
        <div class="form-actions"><span class="saved" id="goals-saved" hidden>Metas salvas</span><button class="btn primary" type="submit">Salvar metas</button></div>
      </form>

      <form class="card" id="budgets-form">
        <div class="card-head"><div class="t"><h2>Orçamento mensal</h2><span class="s">Limites por grupo e por categoria, usados na página Gastos · deixe em branco para não limitar</span></div></div>
        ${budgetCats.length ? `<div class="form-grid">
            ${savedGroups.map((gr) => budgetField(`group:${gr.id}`, gr.name, groupIcon(gr.icon), groupColor(savedGroups, gr.id))).join('')}
            ${budgetCats.filter((c) => !savedGroups.some((gr) => (gr.categories ?? []).includes(c.id))).map((c) => budgetField(c.id, c.label, spendIcon(c.key))).join('')}
          </div>
          <div class="form-actions"><span class="saved" id="budgets-saved" hidden>Orçamentos salvos</span><button class="btn primary" type="submit">Salvar orçamentos</button></div>`
        : `<p class="empty">${store.portfolio?.connections.length ? 'Carregando categorias…' : 'Conecte uma conta para ver as categorias de gastos.'}</p>`}
      </form>

      <section class="card">
        <div class="card-head"><div class="t"><h2>Regras de categoria</h2><span class="s">Criadas quando você muda a categoria de uma transação</span></div></div>
        ${rules.length ? rules.map(([key, id]) => `<div class="list-row">
            <div class="grow"><b>“${esc(key)}”</b><small>sempre como ${esc(catLabel.get(id) ?? (id === 'outros' ? 'Outros' : id))}</small></div>
            <button class="btn sm" data-remove-rule="${esc(key)}">Remover</button>
          </div>`).join('') : '<p class="empty">Nenhuma regra ainda. Em Gastos, mude a categoria de uma transação para criar uma.</p>'}
      </section>`,
    mount(root) {
      const sumEl = $('#alloc-sum');
      const updateSum = () => {
        const total = $$('.alloc-input').reduce((s, el) => s + (parseNum(el.value) || 0), 0);
        sumEl.textContent = total ? `Soma atual: ${num(total, 1)}%${Math.abs(total - 100) > 0.05 ? ' (o ideal é 100%)' : ' ✓'}` : '';
        sumEl.style.color = total && Math.abs(total - 100) > 0.05 ? 'var(--warn)' : 'var(--pos)';
      };
      $$('.alloc-input').forEach((el) => { el.oninput = updateSum; });
      updateSum();

      $('#goals-form').onsubmit = async (e) => {
        e.preventDefault();
        const allocation = Object.fromEntries($$('.alloc-input').map((el) => [el.dataset.cat, parseNum(el.value)]).filter(([, v]) => v));
        const goals = {
          monthlyContribution: parseNum($('#g-monthly').value), wealthTarget: parseNum($('#g-target').value),
          wealthDate: $('#g-date').value || null, monthlyRate: parseNum($('#g-rate').value), allocation,
        };
        if (Object.values(goals).some((v) => Number.isNaN(v))) { showError('Confira os valores: use apenas números.'); return; }
        try {
          store.settings = await api('/api/settings', { method: 'PUT', body: { goals } });
          showError('');
          $('#goals-saved').hidden = false;
          toast('Metas salvas');
        } catch (err) { showError(err.message); }
      };

      $('#budgets-form').onsubmit = async (e) => {
        e.preventDefault();
        if (!$('.budget-input')) return;
        const budgets = Object.fromEntries($$('.budget-input').map((el) => [el.dataset.cat, parseNum(el.value)]).filter(([, v]) => v));
        if (Object.values(budgets).some((v) => Number.isNaN(v))) { showError('Confira os valores: use apenas números.'); return; }
        try {
          store.settings = await api('/api/settings', { method: 'PUT', body: { budgets } });
          for (const m of Object.keys(store.spending ?? {})) store.spending[m].budgets = store.settings.budgets;
          showError('');
          $('#budgets-saved').hidden = false;
          toast('Orçamentos salvos');
        } catch (err) { showError(err.message); }
      };

      // ----- Groups -----
      const readDraft = () => {
        $$('.group-edit').forEach((row) => {
          const gr = groupDraft[Number(row.dataset.i)];
          gr.name = $('.g-name', row).value;
          gr.icon = $('.g-icon', row).value;
          gr.patterns = $('.g-patterns', row).value.split('\n').map((p) => p.trim()).filter(Boolean);
          gr.categories = $$('.g-cat', row).filter((el) => el.checked).map((el) => el.value);
          gr.excludeFromTotals = !$('.g-totals', row).checked;
        });
      };
      $('#groups-form').oninput = readDraft;
      $('#groups-form').onchange = (e) => {
        readDraft();
        const box = e.target.closest('.g-cat');
        if (box) box.parentElement.setAttribute('aria-pressed', String(box.checked));
      };
      $('#add-group').onclick = () => {
        readDraft();
        groupDraft.push({ name: '', icon: 'outros', patterns: [], categories: [] });
        store.rerender({ keepScroll: true });
        $$('.g-name').at(-1)?.focus();
      };
      $('#groups-form').onsubmit = async (e) => {
        e.preventDefault();
        readDraft();
        try {
          store.settings = await api('/api/settings', { method: 'PUT', body: { groups: groupDraft } });
          groupDraft = null;
          store.spending = {};
          showError('');
          toast('Grupos salvos');
          store.rerender({ keepScroll: true });
        } catch (err) { showError(err.message); }
      };

      // ----- Accounts in totals -----
      $$('.acc-toggle').forEach((box) => {
        box.onchange = async () => {
          const ids = $$('.acc-toggle').filter((b) => !b.checked).map((b) => b.dataset.acc);
          try {
            store.settings = await api('/api/settings', { method: 'PUT', body: { excludedAccounts: ids } });
            store.spending = {};
            toast(box.checked ? 'Conta volta a contar nos totais' : 'Conta fora dos totais (continua aparecendo)');
            store.rerender({ keepScroll: true });
          } catch (err) { showError(err.message); }
        };
      });

      root.onclick = async (e) => {
        const rm = e.target.closest('[data-remove-group]');
        if (rm) {
          readDraft();
          groupDraft.splice(Number(rm.dataset.removeGroup), 1);
          store.rerender({ keepScroll: true });
          return;
        }
        const btn = e.target.closest('[data-remove-rule]');
        if (!btn) return;
        try {
          store.settings.txRules = await api('/api/tx-rules', { method: 'POST', body: { key: btn.dataset.removeRule, categoryId: null } });
          store.spending = {};
          store.rerender({ keepScroll: true });
        } catch (err) { showError(err.message); }
      };
    },
  };
}
