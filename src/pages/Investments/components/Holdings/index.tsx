import { useMemo } from 'react';
import type { CategoryKey } from '@shared/types';
import { CATEGORIES } from '@/lib/categories';
import { brl, pct, plural, signedBrl } from '@/lib/format';
import { useSessionState } from '@/lib/hooks';
import { Cell, Pill, PillCount, Pills, TableWrap } from '@/components/ui';
import { CardHeader } from '@/components/CardHeader';
import { isGroup, tableRows, type ClassFilter, type Derived, type Sort, type SortKey } from '../../derive';
import { HoldingRow } from '../HoldingRow';
import * as Styled from './styles';

const COLS: [SortKey, string, boolean?][] = [
  ['title', 'Ativo'], ['category', 'Classe'], ['quantity', 'Qtd.', true], ['avgPrice', 'Preço médio', true], ['value', 'Cotação', true],
  ['cost', 'Aplicado', true], ['balance', 'Saldo atual', true], ['amountProfit', 'Resultado', true], ['share', 'Peso'],
];

interface Props {
  d: Derived;
  filter: ClassFilter;
  onFilter: (filter: ClassFilter) => void;
  search: string;
  /** Classes with at least one asset. */
  present: CategoryKey[];
}

export function Holdings({ d, filter, onFilter, search, present }: Props) {
  const [sort, setSort] = useSessionState<Sort>('inv.sort', { key: 'balance', asc: false });
  const [open, setOpen] = useSessionState<string[]>('inv.open', []);
  const { rows, top } = useMemo(() => tableRows(d, filter, search, sort), [d, filter, search, sort]);
  const maxW = Math.max(...top.map((i) => i.balance), 1);
  const sum = (f: 'cost' | 'balance' | 'amountProfit' | 'share') => rows.reduce((s, i) => s + (i[f] ?? 0), 0);
  const res = sum('amountProfit');

  const toggle = (g: string) => setOpen((o) => (o.includes(g) ? o.filter((x) => x !== g) : [...o, g]));
  const sortBy = (k: SortKey) => setSort((s) => ({ key: k, asc: s.key === k ? !s.asc : ['title', 'category'].includes(k) }));

  return (
    <Styled.Container id="holdings">
      <CardHeader center title="Meus ativos" sub={`${plural(rows.length, 'ativo', 'ativos')} · dados via Pluggy`}>
        <Pills role="group" aria-label="Filtrar por classe">
          {([['ALL', 'Todos', d.investments.length], ...present.map((k) => [k, CATEGORIES[k].label, d.classes[k].count])] as [ClassFilter, string, number][])
            .map(([k, l, n]) => <Pill key={k} aria-pressed={filter === k} onClick={() => onFilter(k)}>{l}<PillCount>{n}</PillCount></Pill>)}
        </Pills>
      </CardHeader>
      <TableWrap>
        <div role="table" aria-label="Ativos da carteira">
          <Styled.Head>
            {COLS.map(([k, l, right]) => (
              <Styled.SortHeader key={k} $right={right} $sorted={sort.key === k} $asc={sort.asc} onClick={() => sortBy(k)}>{l}</Styled.SortHeader>
            ))}
          </Styled.Head>
          <div>
            {top.map((i) => <HoldingRow key={isGroup(i) ? `group:${i.group}` : i.id} row={i} maxW={maxW} open={open} onToggle={toggle} />)}
            {!top.length && <Styled.NoRows>Nenhum ativo encontrado.</Styled.NoRows>}
          </div>
          {rows.length > 0 && (
            <Styled.Foot>
              <Cell>Total</Cell><span /><span /><span /><span />
              <Styled.MutedTotal $right>{brl(sum('cost'))}</Styled.MutedTotal>
              <Cell $right>{brl(sum('balance'))}</Cell>
              <Styled.ResultTotal $right $tone={res >= 0 ? 'pos' : 'neg'}>{signedBrl(res)}</Styled.ResultTotal>
              <Cell>{pct(sum('share'))} da carteira</Cell>
            </Styled.Foot>
          )}
        </div>
      </TableWrap>
    </Styled.Container>
  );
}
