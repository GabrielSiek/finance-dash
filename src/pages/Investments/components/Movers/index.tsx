import { cat, soft } from '@/lib/categories';
import { arrowPct, fmtMonthName, money, todayIso } from '@/lib/format';
import { useSessionState } from '@/lib/hooks';
import { Chip, Empty, RowEnd, RowMain, Seg, SegButton, Tile, toneOf } from '@/components/ui';
import { CardHeader } from '@/components/CardHeader';
import type { Derived, Holding } from '../../derive';
import * as Styled from './styles';

export function Movers({ d }: { d: Derived }) {
  const [movers, setMovers] = useSessionState<'up' | 'down'>('inv.movers', 'up');
  let metric = (i: Holding) => (i.lastMonthRate != null ? i.lastMonthRate / 100 : null);
  let caption = `Variação de cotação em ${fmtMonthName(todayIso().slice(0, 7))}`;
  if (!d.investments.some((i) => metric(i) != null)) {
    metric = (i) => (i.lastTwelveMonthsRate != null ? i.lastTwelveMonthsRate / 100 : null);
    caption = 'Rentabilidade nos últimos 12 meses';
    if (!d.investments.some((i) => metric(i) != null)) { metric = (i) => i.returnPct; caption = 'Rentabilidade desde a compra'; }
  }
  const rows = d.investments.map((i) => ({ ...i, m: metric(i) })).filter((i): i is Holding & { m: number } => i.m != null && i.category !== 'RENDA_FIXA');
  const list = (movers === 'up' ? rows.filter((r) => r.m > 0).sort((a, b) => b.m - a.m) : rows.filter((r) => r.m < 0).sort((a, b) => a.m - b.m)).slice(0, 5);
  return (
    <Styled.Container>
      <CardHeader title="Destaques" sub={caption}>
        <Seg role="group" aria-label="Altas ou quedas">
          <SegButton aria-pressed={movers === 'up'} onClick={() => setMovers('up')}>Altas</SegButton>
          <SegButton aria-pressed={movers === 'down'} onClick={() => setMovers('down')}>Quedas</SegButton>
        </Seg>
      </CardHeader>
      <div>
        {list.map((r) => (
          <Styled.Mover key={r.id}>
            <Tile $size="lg" $bg={soft(cat(r.category).color)}>{r.short}</Tile>
            <RowMain><b>{r.title}</b><small>{r.sub}</small></RowMain>
            <RowEnd><span>{money(r.value ?? r.balance, r.currencyCode)}</span><Chip $tone={toneOf(r.m)}>{arrowPct(r.m)}</Chip></RowEnd>
          </Styled.Mover>
        ))}
        {!list.length && <Empty>Nenhum ativo em {movers === 'up' ? 'alta' : 'queda'}.</Empty>}
      </div>
    </Styled.Container>
  );
}
