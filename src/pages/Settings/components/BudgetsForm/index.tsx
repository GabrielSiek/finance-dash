import { useState, type FormEvent } from 'react';
import type { Settings, SpendingData } from '@shared/types';
import { api, errorMessage } from '@/lib/api';
import { groupColor, type ColorVar } from '@/lib/categories';
import { addMonths, brl, fmtMonthName, num, todayIso } from '@/lib/format';
import { groupIcon, spendIcon } from '@/lib/icons';
import { patchSpending, setSettings, showError, toast, useStore } from '@/store';
import { Button, Empty, FormActions, FormGrid, Saved } from '@/components/ui';
import { CardHeader } from '@/components/CardHeader';
import { FieldsSkeleton } from '@/components/Skeleton';
import { MoneyField } from '../MoneyField';
import { fieldValue, parseNum } from '../../helpers';
import * as Styled from './styles';

interface BudgetsFormProps {
  /** The current month (with the one before), for the categories and last month's spending. */
  spending: SpendingData | undefined;
  hasConnections: boolean;
}

interface BudgetField { key: string; label: string; icon: string; color?: ColorVar }

export function BudgetsForm({ spending, hasConnections }: BudgetsFormProps) {
  const settings = useStore((s) => s.settings);
  const [income, setIncome] = useState(() => fieldValue(settings.monthlyIncome));
  const [total, setTotal] = useState(() => fieldValue(settings.budgetTotal));
  const [budgets, setBudgets] = useState<Record<string, string>>(() =>
    Object.fromEntries(Object.entries(settings.budgets).map(([k, v]) => [k, v ? num(v) : ''])));
  const [saved, setSaved] = useState(false);

  const prevMonth = addMonths(todayIso().slice(0, 7), -1);
  const prevByCat: Record<string, number> = {};
  for (const t of spending?.transactions ?? []) {
    if (t.direction === 'out' && !t.excluded && t.date.startsWith(prevMonth)) prevByCat[t.category.id] = (prevByCat[t.category.id] ?? 0) + t.amount;
  }
  for (const t of spending?.transactions ?? []) {
    if (t.group && t.date.startsWith(prevMonth) && !t.excluded) {
      const k = `group:${t.group.id}`;
      prevByCat[k] = (prevByCat[k] ?? 0) + (t.direction === 'out' ? t.amount : -t.amount);
    }
  }

  const budgetCats = spending?.categories ?? [];
  const groups = settings.groups;
  const fields: BudgetField[] = budgetCats.length ? [
    ...groups.map((gr) => ({ key: `group:${gr.id}`, label: gr.name, icon: groupIcon(gr.icon), color: groupColor(groups, gr.id) })),
    ...budgetCats.filter((c) => !groups.some((gr) => (gr.categories ?? []).includes(c.id))).map((c) => ({ key: c.id, label: c.label, icon: spendIcon(c.key) })),
  ] : [];

  // How the general limit compares to your income and to the per-category limits, as you type.
  const incomeN = parseNum(income) ?? 0, totalN = parseNum(total);
  const byCat = fields.reduce((a, f) => a + (parseNum(budgets[f.key]) || 0), 0);
  const totalHint = [
    (totalN ?? 0) > 0 && incomeN > 0 ? `${num(((totalN ?? 0) / incomeN) * 100, 0)}% da renda` : '',
    byCat ? `Soma dos limites por categoria: ${brl(byCat)}${(totalN ?? 0) > 0 && byCat > (totalN ?? 0) ? ' (passa do limite geral)' : ''}` : '',
    !totalN ? `Em branco, usa ${byCat ? 'a soma das categorias' : incomeN > 0 ? 'a renda mensal' : 'nenhum limite'}` : '',
  ].filter(Boolean).join(' · ');

  const save = async (e: FormEvent) => {
    e.preventDefault();
    const body: { monthlyIncome: number | null; budgetTotal: number | null; budgets?: Record<string, number | null> } = {
      monthlyIncome: parseNum(income), budgetTotal: parseNum(total),
    };
    // Only send the per-category limits once their fields have loaded, so a quick save can't wipe them.
    if (fields.length) body.budgets = Object.fromEntries(fields.map((f) => [f.key, parseNum(budgets[f.key])]).filter(([, v]) => v));
    if ([body.monthlyIncome, body.budgetTotal, ...Object.values(body.budgets ?? {})].some((v) => Number.isNaN(v))) { showError('Confira os valores: use apenas números.'); return; }
    try {
      const next = await api.put<Settings>('/settings', body);
      setSettings(next);
      patchSpending({ budgets: next.budgets, budgetTotal: next.budgetTotal, monthlyIncome: next.monthlyIncome });
      showError('');
      setSaved(true);
      toast('Orçamento salvo');
    } catch (err) { showError(errorMessage(err)); }
  };

  return (
    <Styled.Container as="form" onSubmit={save}>
      <CardHeader title="Renda e orçamento" sub="Usados no Saldo, no Orçamento e no Ritmo de gastos da página Gastos · deixe em branco para não limitar" />
      <FormGrid>
        <MoneyField
          id="b-income" label="Renda mensal" value={income} onChange={setIncome} placeholder="Detectar automaticamente"
          hint="Quanto você recebe por mês. Em branco, usa as entradas detectadas nas contas."
        />
        <MoneyField id="b-total" label="Limite geral de gastos" value={total} onChange={setTotal} hint={totalHint} placeholder="Sem limite geral" />
      </FormGrid>
      <Styled.Limits>
        <label>Limites por grupo e categoria</label>
        <small>Cada um é acompanhado em “Para onde vai seu dinheiro”. Sem limite geral, a soma deles vira o orçamento do mês.</small>
      </Styled.Limits>
      {fields.length ? (
        <FormGrid>
          {fields.map((f) => {
            const prev = prevByCat[f.key];
            return (
              <MoneyField
                key={f.key} id={`b-${f.key}`} label={f.label} icon={f.icon} color={f.color} placeholder="Sem limite"
                value={budgets[f.key] ?? ''} onChange={(v) => setBudgets((b) => ({ ...b, [f.key]: v }))}
                hint={prev ? `${prev < 0 ? 'Recebeu a mais' : 'Gastou'} ${brl(Math.abs(prev))} em ${fmtMonthName(prevMonth)}` : undefined}
              />
            );
          })}
        </FormGrid>
      ) : !hasConnections ? <Empty>Conecte uma conta para ver as categorias de gastos.</Empty>
        : !spending ? <FieldsSkeleton />
          : <Empty>Nenhuma categoria de gasto neste mês ainda.</Empty>}
      <FormActions>
        {saved && <Saved>Orçamento salvo</Saved>}
        <Button $variant="primary" type="submit">Salvar orçamento</Button>
      </FormActions>
    </Styled.Container>
  );
}
