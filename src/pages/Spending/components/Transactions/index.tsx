import { useEffect } from 'react';
import type { SpendingData, Transaction, TransactionsData } from '@shared/types';
import { brl, fmtDate, fmtMonthName, plural } from '@/lib/format';
import { loadRange, rangeKey, useStore } from '@/store';
import { Button, Notice, TableWrap, Toned } from '@/components/ui';
import { CardHeader } from '@/components/CardHeader';
import { TxTableSkeleton } from '@/components/Skeleton';
import { applyTxFilters, PAGE, sum, txRange, type Computed, type TxFilters as Filters } from '../../logic';
import { TxFilters } from '../TxFilters';
import { TxRow } from '../TxRow';
import * as Styled from './styles';

interface TransactionsProps {
  s: SpendingData;
  c: Computed;
  month: string;
  filters: Filters;
  onFilters: (patch: Partial<Filters>) => void;
  shown: number;
  onShowMore: () => void;
}

interface Source { data: TransactionsData; list: Transaction[]; label: string; loading?: boolean; invalid?: boolean; errors?: string[] }

export function Transactions({ s, c, month, filters, onFilters, shown, onShowMore }: TransactionsProps) {
  const range = filters.period === 'month' ? null : txRange(filters);
  const from = range?.from, to = range?.to;
  const r = useStore((st) => (from && to ? st.ranges[rangeKey(from, to)] : undefined));
  // Longer periods are fetched on demand and cached with the month data (cleared together).
  useEffect(() => { if (from && to && !r) void loadRange(from, to); }, [from, to, r]);

  // Which transactions the filter bar shows: the picked month, or a longer range fetched on demand.
  let src: Source;
  if (filters.period === 'month') src = { data: s, list: c.cur.list, label: `em ${fmtMonthName(month)}` };
  else if (!range) src = { data: s, list: [], label: '', invalid: true };
  else if (!r) src = { data: s, list: [], label: '', loading: true };
  else {
    const scopeIds = new Set(c.scope.map((a) => a.id));
    src = { data: r, list: r.transactions.filter((t) => scopeIds.has(t.accountId)), label: `de ${fmtDate(range.from)} a ${fmtDate(range.to)}`, errors: r.errors };
  }

  return (
    <Styled.Container>
      <CardHeader center title="Transações" sub="Mude a categoria de uma transação para colocá-la num grupo" />
      <TxFilters data={src.data} list={src.list} filters={filters} month={month} onChange={onFilters} />
      <div>
        <TxTable src={src} c={c} month={month} filters={filters} shown={shown} onShowMore={onShowMore} />
      </div>
    </Styled.Container>
  );
}

function TxTable({ src, c, month, filters, shown, onShowMore }: { src: Source; c: Computed; month: string; filters: Filters; shown: number; onShowMore: () => void }) {
  if (src.loading) return <TxTableSkeleton />;
  if (src.invalid) return <Styled.TableEmpty>Escolha a data inicial e a final.</Styled.TableEmpty>;
  const list = applyTxFilters(src.list, filters);
  const wide = filters.period !== 'month';
  const counts = (t: Transaction) => !t.excluded && c.accountCounts(t.accountId);
  const out = sum(list.filter((t) => t.direction === 'out' && counts(t)));
  const inn = sum(list.filter((t) => t.direction === 'in' && counts(t)));
  return <>
    <Styled.Summary>
      {plural(list.length, 'transação', 'transações')} · <b>{brl(out)}</b> em saídas · <Toned as="b" $tone="pos">{brl(inn)}</Toned> em entradas {src.label}
    </Styled.Summary>
    {src.errors?.length ? <Notice $error as="div">Algumas conexões não responderam: {src.errors.join(' · ')}</Notice> : null}
    <TableWrap>
      <div role="table" aria-label="Transações">
        <Styled.Head $wide={wide}><span>Data</span><span>Descrição</span><span>Grupo / categoria</span><span>Meio</span><span>Status</span><Styled.HeadRight>Valor</Styled.HeadRight></Styled.Head>
        {list.slice(0, shown).map((t) => <TxRow key={t.id} t={t} data={src.data} c={c} month={month} wide={wide} />)}
        {!list.length && <Styled.TableEmpty>Nenhuma transação com esses filtros.</Styled.TableEmpty>}
      </div>
    </TableWrap>
    {list.length > shown && (
      <Styled.More>
        <Button $size="sm" type="button" onClick={onShowMore}>Mostrar mais {Math.min(PAGE, list.length - shown)} de {list.length - shown}</Button>
      </Styled.More>
    )}
  </>;
}
