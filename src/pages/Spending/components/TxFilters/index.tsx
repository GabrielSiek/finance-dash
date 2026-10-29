import type { Transaction, TransactionsData } from '@shared/types';
import { fmtMonthLong, todayIso } from '@/lib/format';
import { Button, Seg, SegButton, Select, SrOnly } from '@/components/ui';
import { SearchField } from '@/components/SearchField';
import { METHOD_KEYS, METHODS, PERIODS, type TxFilters as Filters, type TxPeriod } from '../../logic';
import * as Styled from './styles';

interface TxFiltersProps {
  data: TransactionsData;
  list: Transaction[];
  filters: Filters;
  month: string;
  onChange: (patch: Partial<Filters>) => void;
}

const DIRS: [Filters['dir'], string][] = [['all', 'Todas'], ['out', 'Saídas'], ['in', 'Entradas']];

export function TxFilters({ data, list, filters: f, month, onChange }: TxFiltersProps) {
  const groups = data.groups ?? [];
  const cats = [...new Map(list.filter((t) => !t.group).map((t) => [t.category.id, t.category])).values()].sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
  if (f.cat && !f.cat.startsWith('group:') && !cats.some((x) => x.id === f.cat)) {
    const known = (data.categories ?? []).find((x) => x.id === f.cat);
    if (known) cats.push(known);
  }
  const methods = METHOD_KEYS.filter((k) => list.some((t) => t.method === k) || f.method === k);
  const active = f.q || f.cat || f.method !== 'all' || f.dir !== 'all' || f.period !== 'month';
  const periodLabel: Record<TxPeriod, string> = { month: fmtMonthLong(month), '3m': 'Últimos 3 meses', '6m': 'Últimos 6 meses', '12m': 'Últimos 12 meses', custom: 'Período personalizado' };

  const setPeriod = (period: TxPeriod) => {
    if (period === 'custom' && !f.from) onChange({ period, from: `${month}-01`, to: todayIso() });
    else onChange({ period });
  };

  return (
    <Styled.Container aria-label="Filtrar transações">
      <SearchField grow label="Buscar transação" placeholder="Buscar descrição, nome ou categoria" value={f.q} onChange={(q) => onChange({ q })} />
      <SrOnly as="label" htmlFor="tx-period">Período</SrOnly>
      <Select id="tx-period" value={f.period} onChange={(e) => setPeriod(e.target.value as TxPeriod)}>
        {PERIODS.map(([k]) => <option key={k} value={k}>{periodLabel[k]}</option>)}
      </Select>
      {f.period === 'custom' && <>
        <SrOnly as="label" htmlFor="tx-from">De</SrOnly>
        <Styled.DateInput id="tx-from" value={f.from ?? ''} max={todayIso()} onChange={(e) => onChange({ from: e.target.value })} />
        <SrOnly as="label" htmlFor="tx-to">Até</SrOnly>
        <Styled.DateInput id="tx-to" value={f.to ?? ''} max={todayIso()} onChange={(e) => onChange({ to: e.target.value })} />
      </>}
      <SrOnly as="label" htmlFor="tx-cat">Grupo ou categoria</SrOnly>
      <Select id="tx-cat" value={f.cat} onChange={(e) => onChange({ cat: e.target.value })}>
        <option value="">Todos os grupos e categorias</option>
        {groups.length > 0 && <optgroup label="Meus grupos">{groups.map((g) => <option key={g.id} value={`group:${g.id}`}>{g.name}</option>)}</optgroup>}
        {cats.length > 0 && <optgroup label="Categorias">{cats.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}</optgroup>}
      </Select>
      <SrOnly as="label" htmlFor="tx-method">Meio de pagamento</SrOnly>
      <Select id="tx-method" value={f.method} onChange={(e) => onChange({ method: e.target.value as Filters['method'] })}>
        <option value="all">Todos os meios</option>
        {methods.map((k) => <option key={k} value={k}>{METHODS[k].label}</option>)}
      </Select>
      <Seg role="group" aria-label="Tipo">
        {DIRS.map(([k, l]) => <SegButton key={k} aria-pressed={f.dir === k} onClick={() => onChange({ dir: k })}>{l}</SegButton>)}
      </Seg>
      {active && <Button $size="sm" type="button" onClick={() => onChange({ period: 'month', cat: '', method: 'all', dir: 'all', q: '' })}>Limpar filtros</Button>}
    </Styled.Container>
  );
}
