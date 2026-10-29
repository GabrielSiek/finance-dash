// "Configurações": groups, accounts in the totals, goals, income and budgets, category rules.
import { useEffect } from 'react';
import { todayIso } from '@/lib/format';
import { loadSpending, useStore } from '@/store';
import { Page } from '@/components/Page';
import { GroupsForm } from './components/GroupsForm';
import { AccountsInTotals } from './components/AccountsInTotals';
import { GoalsForm } from './components/GoalsForm';
import { BudgetsForm } from './components/BudgetsForm';
import { Rules } from './components/Rules';

export function SettingsPage() {
  const month = todayIso().slice(0, 7);
  const spending = useStore((s) => s.spending[month]);
  const hasConnections = useStore((s) => Boolean(s.portfolio?.connections.length));
  useEffect(() => { if (!spending && hasConnections) void loadSpending(month); }, [spending, hasConnections, month]);
  const categories = spending?.categories ?? [];

  return (
    <Page title="Configurações" sub="Grupos, renda, orçamentos, metas e categorias">
      <GroupsForm categories={categories} />
      <AccountsInTotals />
      <GoalsForm />
      <BudgetsForm spending={spending} hasConnections={hasConnections} />
      <Rules categories={categories} />
    </Page>
  );
}
