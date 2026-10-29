import { useMemo, useState } from 'react';
import type { ChartConfiguration } from 'chart.js';
import { cssVar } from '@/lib/charts';
import { brl, brl0, pct, plural } from '@/lib/format';
import { useStore } from '@/store';
import { Empty, Swatch } from '@/components/ui';
import { CardHeader } from '@/components/CardHeader';
import { ChartCanvas } from '@/components/ChartCanvas';
import { donutRows, type Derived } from '../../derive';
import * as Styled from './styles';

export function Distribution({ d }: { d: Derived }) {
  const dark = useStore((s) => s.dark);
  const rows = useMemo(() => donutRows(d), [d]);
  const [hover, setHover] = useState(-1);
  const r = rows[hover];

  const config = useMemo((): ChartConfiguration<'doughnut', number[], string> => ({
    type: 'doughnut',
    data: { labels: rows.map((x) => x.label), datasets: [{ data: rows.map((x) => x.value), backgroundColor: rows.map((x) => cssVar(x.color)), borderColor: cssVar('--surface'), borderWidth: 3, hoverOffset: 4 }] },
    options: { responsive: false, animation: false, cutout: '72%', plugins: { legend: { display: false }, tooltip: { enabled: false } }, onHover: (_e, els) => setHover(els[0]?.index ?? -1) },
  }), [rows, dark]);

  return (
    <Styled.Container>
      <CardHeader title="Distribuição da carteira" sub="Por classe de ativo" />
      <Styled.DonutBox>
        <Styled.Donut>
          <ChartCanvas config={config} size={212} aria-label="Distribuição por classe" onMouseLeave={() => setHover(-1)} />
          <Styled.Center>
            <span>{r ? r.label : 'Total'}</span>
            <b>{r ? pct(r.value / d.total) : brl0(d.total)}</b>
            <span>{r ? brl0(r.value) : plural(d.investments.length, 'ativo', 'ativos')}</span>
          </Styled.Center>
        </Styled.Donut>
      </Styled.DonutBox>
      <div>
        {rows.map((x, idx) => (
          <Styled.LegendRow key={x.key} $hl={idx === hover} onMouseEnter={() => setHover(idx)} onMouseLeave={() => setHover(-1)}>
            <Swatch as="span" $color={x.color} />
            <Styled.RowLabel>{x.label}</Styled.RowLabel>
            <Styled.RowValue>{brl(x.value)}</Styled.RowValue>
            <Styled.RowShare>{pct(d.total ? x.value / d.total : 0)}</Styled.RowShare>
          </Styled.LegendRow>
        ))}
        {!rows.length && <Empty>Sem investimentos.</Empty>}
      </div>
    </Styled.Container>
  );
}
