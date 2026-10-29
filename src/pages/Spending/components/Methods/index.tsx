import { brl, fmtMonthName, num, plural } from '@/lib/format';
import { ICON, type IconName } from '@/lib/icons';
import { Empty, ListRow, RowEnd, RowMain, Tile } from '@/components/ui';
import { CardHeader } from '@/components/CardHeader';
import { Icon } from '@/components/Icon';
import { METHOD_KEYS, METHODS, sum, type Computed } from '../../logic';
import { SplitBar } from '../../styles';
import * as Styled from './styles';

export function Methods({ c, month }: { c: Computed; month: string }) {
  const gross = sum(c.cur.out);
  const groups = METHOD_KEYS.map((k) => {
    const list = c.cur.out.filter((t) => t.method === k);
    return { k, ...METHODS[k], n: list.length, value: sum(list) };
  }).filter((m) => m.n);
  return (
    <Styled.Container>
      <CardHeader title="Por meio de pagamento" sub={`Como você pagou em ${fmtMonthName(month)}`} />
      {groups.length ? <>
        <SplitBar role="img" aria-label="Divisão dos gastos por meio de pagamento">
          {groups.map((m) => <div key={m.k} title={`${m.label}: ${brl(m.value)}`} style={{ width: `${(m.value / gross) * 100}%`, background: `var(${m.color})` }} />)}
        </SplitBar>
        <div>{groups.map((m) => (
          <ListRow key={m.k}>
            <Tile $size="sm" $color={m.color}><Icon d={ICON[m.k as IconName] ?? ICON.outros} /></Tile>
            <RowMain><b>{m.label}</b><small>{plural(m.n, 'transação', 'transações')}</small></RowMain>
            <RowEnd><span>{brl(m.value)}</span><small>{num((m.value / gross) * 100, 1)}%</small></RowEnd>
          </ListRow>
        ))}</div>
      </> : <Empty>Nenhum gasto neste mês.</Empty>}
    </Styled.Container>
  );
}
