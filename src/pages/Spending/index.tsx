// Gastos view: month KPIs, your groups, categories vs budget, payment methods, credit cards, pace, transactions.
import { useEffect, useMemo } from 'react';
import { todayIso } from '@/lib/format';
import { useSessionState } from '@/lib/hooks';
import { loadSpending, useStore } from '@/store';
import { Col, Notice, Row, Select, SrOnly } from '@/components/ui';
import { Page } from '@/components/Page';
import { SpendingSkeleton } from '@/components/Skeleton';
import { compute, DEFAULT_TX, PAGE, type TxFilters } from './logic';
import { MonthPicker } from './components/MonthPicker';
import { Kpis } from './components/Kpis';
import { Categories } from './components/Categories';
import { Groups } from './components/Groups';
import { Methods } from './components/Methods';
import { CreditCards } from './components/CreditCards';
import { Pace } from './components/Pace';
import { Transactions } from './components/Transactions';
import * as Styled from './styles';

const TITLE = 'Gastos';
const SUB = 'Cartões, Pix, débito e boletos';

export function SpendingPage() {
  const [month, setMonth] = useSessionState('spend.month', () => todayIso().slice(0, 7));
  const [account, setAccount] = useSessionState('spend.account', 'all');
  const [shown, setShown] = useSessionState('spend.shown', PAGE);
  const [tx, setTx] = useSessionState<TxFilters>('spend.tx', DEFAULT_TX);
  const s = useStore((st) => st.spending[month]);
  const hasConnections = useStore((st) => Boolean(st.portfolio?.connections.length));
  const goals = useStore((st) => st.settings.goals);

  useEffect(() => { if (hasConnections && !s) void loadSpending(month); }, [hasConnections, s, month]);

  // An account or group that no longer exists falls back to everything.
  const effAccount = s && account !== 'all' && !s.accounts.some((a) => a.id === account) ? 'all' : account;
  const filters = s && tx.cat.startsWith('group:') && !(s.groups ?? []).some((g) => `group:${g.id}` === tx.cat) ? { ...tx, cat: '' } : tx;
  const c = useMemo(() => (s ? compute(s, month, effAccount) : null), [s, month, effAccount]);

  const accounts = s?.accounts ?? [];
  const off = new Set(s?.excludedAccounts ?? []);
  const actions = <>
    <MonthPicker month={month} onChange={(m) => { setMonth(m); setShown(PAGE); }} />
    <SrOnly as="label" htmlFor="account-filter">Conta</SrOnly>
    <Select id="account-filter" value={accounts.some((a) => a.id === effAccount) ? effAccount : 'all'} onChange={(e) => setAccount(e.target.value)}>
      <option value="all">Todas as contas</option>
      {accounts.map((a) => <option key={a.id} value={a.id}>{a.name} · {a.connector}{off.has(a.id) ? ' (fora dos totais)' : ''}</option>)}
    </Select>
  </>;

  if (!hasConnections) {
    return (
      <Page title={TITLE} sub={SUB}>
        <Notice><h2>Nenhuma conta conectada</h2><p>Conecte seu banco em <a href="#/contas">Contas conectadas</a> para ver seus gastos.</p></Notice>
      </Page>
    );
  }
  if (!s || !c) return <Page title={TITLE} sub={SUB} actions={actions}><SpendingSkeleton /></Page>;

  const updateTx = (patch: Partial<TxFilters>) => { setTx((prev) => ({ ...prev, ...patch })); setShown(PAGE); };
  // Clicking a group or category elsewhere on the page filters the transactions to it.
  const filterTo = (cat: string) => {
    const next = filters.cat === cat ? '' : cat;
    updateTx({ cat: next });
    if (next) document.getElementById('tx-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <Page title={TITLE} sub={SUB} actions={actions}>
      <Styled.Container>
        {s.errors?.length ? <Notice $error as="div">Algumas conexões não responderam: {s.errors.join(' · ')}</Notice> : null}
        <Kpis s={s} c={c} goals={goals} month={month} account={effAccount} />
        <Row>
          <Categories s={s} c={c} selected={filters.cat} onFilter={filterTo} />
          <Col $flex="2 1 360px">
            <Groups c={c} selected={filters.cat} onFilter={filterTo} />
            <Methods c={c} month={month} />
            <CreditCards c={c} />
          </Col>
        </Row>
        <Pace s={s} c={c} month={month} />
        <Transactions s={s} c={c} month={month} filters={filters} onFilters={updateTx} shown={shown} onShowMore={() => setShown((n) => n + PAGE)} />
      </Styled.Container>
    </Page>
  );
}
