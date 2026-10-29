import { useState, type FormEvent } from 'react';
import type { CategoryKey, Settings } from '@shared/types';
import { api, errorMessage } from '@/lib/api';
import { ASSET_CLASSES, CATEGORIES } from '@/lib/categories';
import { num } from '@/lib/format';
import { setSettings, showError, toast, useStore } from '@/store';
import { Button, Field, FormActions, FormGrid, Input, InputAffix, Saved, Suffix, Swatch } from '@/components/ui';
import { CardHeader } from '@/components/CardHeader';
import { MoneyField } from '../MoneyField';
import { fieldValue, parseNum } from '../../helpers';
import * as Styled from './styles';

export function GoalsForm() {
  const g = useStore((s) => s.settings.goals);
  const [monthly, setMonthly] = useState(() => fieldValue(g.monthlyContribution));
  const [target, setTarget] = useState(() => fieldValue(g.wealthTarget));
  const [date, setDate] = useState(g.wealthDate ?? '');
  const [rate, setRate] = useState(() => num(g.monthlyRate ?? 0.9));
  const [alloc, setAlloc] = useState<Partial<Record<CategoryKey, string>>>(() =>
    Object.fromEntries(ASSET_CLASSES.map((k) => [k, g.allocation?.[k] ? num(g.allocation[k]) : ''])));
  const [saved, setSaved] = useState(false);

  const total = ASSET_CLASSES.reduce((s, k) => s + (parseNum(alloc[k]) || 0), 0);
  const off = Math.abs(total - 100) > 0.05;

  const save = async (e: FormEvent) => {
    e.preventDefault();
    const allocation = Object.fromEntries(ASSET_CLASSES.map((k) => [k, parseNum(alloc[k])]).filter(([, v]) => v));
    const goals = {
      monthlyContribution: parseNum(monthly), wealthTarget: parseNum(target),
      wealthDate: date || null, monthlyRate: parseNum(rate), allocation,
    };
    if (Object.values(goals).some((v) => Number.isNaN(v))) { showError('Confira os valores: use apenas números.'); return; }
    try {
      setSettings(await api.put<Settings>('/settings', { goals }));
      showError('');
      setSaved(true);
      toast('Metas salvas');
    } catch (err) { showError(errorMessage(err)); }
  };

  return (
    <Styled.Container as="form" onSubmit={save}>
      <CardHeader title="Metas de investimento" sub="Usadas na seção Metas da página Investimentos" />
      <FormGrid>
        <MoneyField id="g-monthly" label="Aporte mensal" value={monthly} onChange={setMonthly} hint="Quanto você quer investir por mês" />
        <MoneyField id="g-target" label="Meta de patrimônio" value={target} onChange={setTarget} />
        <Field>
          <label htmlFor="g-date">Prazo da meta</label>
          <Input type="month" id="g-date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field>
          <label htmlFor="g-rate">Rendimento esperado</label>
          <InputAffix><Input $suf id="g-rate" inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} /><Suffix>% a.m.</Suffix></InputAffix>
          <small>Usado para estimar o aporte necessário</small>
        </Field>
      </FormGrid>
      <Field>
        <label>Alocação alvo</label>
        <small>
          Percentual desejado de cada classe na carteira.{' '}
          <Styled.Sum $warn={Boolean(total) && off}>{total ? `Soma atual: ${num(total, 1)}%${off ? ' (o ideal é 100%)' : ' ✓'}` : ''}</Styled.Sum>
        </small>
      </Field>
      <Styled.AllocGrid>
        {ASSET_CLASSES.map((k) => (
          <Field key={k}>
            <Styled.ClassLabel htmlFor={`a-${k}`}><Swatch as="span" $color={CATEGORIES[k].color} />{CATEGORIES[k].label}</Styled.ClassLabel>
            <InputAffix>
              <Input $suf id={`a-${k}`} inputMode="decimal" value={alloc[k] ?? ''} placeholder="0" onChange={(e) => setAlloc((a) => ({ ...a, [k]: e.target.value }))} />
              <Suffix>%</Suffix>
            </InputAffix>
          </Field>
        ))}
      </Styled.AllocGrid>
      <FormActions>
        {saved && <Saved>Metas salvas</Saved>}
        <Button $variant="primary" type="submit">Salvar metas</Button>
      </FormActions>
    </Styled.Container>
  );
}
