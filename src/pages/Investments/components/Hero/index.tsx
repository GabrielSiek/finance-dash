import { useMemo, type ReactNode } from 'react';
import type { ChartConfiguration } from 'chart.js';
import type { Portfolio } from '@shared/types';
import { areaFill, chartTheme, crosshair, tooltip } from '@/lib/charts';
import { arrowPct, brl, brlCompact, fmtDate, fmtDayMonth, plural, signedBrl, signedPct } from '@/lib/format';
import { useSessionState } from '@/lib/hooks';
import { useStore } from '@/store';
import { CardHead, CardTitles, Chip, Legend, Muted, Seg, SegButton, Stat, Stats, Swatch, Toned, toneOf } from '@/components/ui';
import { ChartCanvas } from '@/components/ChartCanvas';
import { PERIODS, growthSeries, type Derived } from '../../derive';
import * as Styled from './styles';

export function Hero({ p, d }: { p: Portfolio; d: Derived }) {
  const [period, setPeriod] = useSessionState('inv.period', 365);
  const dark = useStore((s) => s.dark);
  const series = useMemo(() => growthSeries(p, d, period), [p, d, period]);
  const known = series.value.filter((v): v is number => v != null);
  const word = PERIODS.find((x) => x[1] === period)![2];
  let chip: ReactNode = null, label: string;
  if (known.length >= 2) {
    const delta = known.at(-1)! - known[0];
    chip = <Chip $tone={toneOf(delta)}>{arrowPct(known[0] ? delta / known[0] : 0)}</Chip>;
    label = `${signedBrl(delta)} ${word}`;
  } else if (d.cost > 0) {
    chip = <Chip $tone={toneOf(d.profit)}>{arrowPct(d.profit / d.cost)}</Chip>;
    label = 'desde o início · o histórico diário começa hoje';
  } else {
    label = 'O histórico diário começa hoje';
  }
  const missing = p.coverage.total - p.coverage.withHistory;
  const profitTone = d.profit >= 0 ? 'pos' : 'neg';

  const config = useMemo(() => (canvas: HTMLCanvasElement): ChartConfiguration<'line', (number | null)[], string> => {
    const t = chartTheme();
    const knownCount = series.value.filter((v) => v != null).length;
    const narrow = (canvas.parentElement?.clientWidth ?? 0) < 560;
    return {
      type: 'line',
      data: {
        labels: series.labels,
        datasets: [
          {
            label: 'Patrimônio', data: series.value, borderColor: t.accent, borderWidth: 2.5, spanGaps: true, tension: 0.25,
            pointRadius: (ctx) => (knownCount < 3 || ctx.dataIndex === series.labels.length - 1 ? 5 : 0),
            pointBackgroundColor: t.accent, pointBorderColor: t.surface, pointBorderWidth: 3, pointHoverRadius: 5,
            fill: 'start', backgroundColor: areaFill(t.accent),
          },
          { label: 'Valor aplicado', data: series.applied, borderColor: t.muted, borderWidth: 1.5, borderDash: [5, 5], stepped: true, pointRadius: 0, pointHoverRadius: 3, fill: false },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false, animation: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: { ...tooltip(t), filter: (i) => i.raw != null, callbacks: { title: (it) => fmtDate(series.labels[it[0].dataIndex]), label: (i) => ` ${i.dataset.label}: ${brl(i.raw as number)}` } },
        },
        scales: {
          x: { grid: { display: false }, border: { display: false }, ticks: { autoSkip: true, maxRotation: 0, maxTicksLimit: narrow ? 4 : 7, callback: (_v, i) => fmtDayMonth(series.labels[i]) } },
          y: { position: 'left', grid: { color: t.border }, border: { display: false }, ticks: { maxTicksLimit: 4, callback: (v) => brlCompact(Number(v)) } },
        },
      },
      plugins: [crosshair],
    };
  }, [series, dark]);

  return (
    <Styled.Container>
      <CardHead>
        <CardTitles $gap={8}>
          <Styled.Label>Patrimônio investido</Styled.Label>
          <Styled.Value>{brl(d.total)}</Styled.Value>
          <Styled.Meta>{chip}<span>{label}</span></Styled.Meta>
        </CardTitles>
        <Seg role="group" aria-label="Período">
          {PERIODS.map(([l, v]) => <SegButton key={v} aria-pressed={v === period} onClick={() => setPeriod(v)}>{l}</SegButton>)}
        </Seg>
      </CardHead>
      <Legend>
        <span><Swatch $kind="line" $color="--accent" />Patrimônio</span>
        <span><Swatch $kind="dash" />Valor aplicado</span>
      </Legend>
      <ChartCanvas config={config} aria-label="Evolução do patrimônio e do valor aplicado" />
      <Stats>
        <Stat><span>Valor aplicado</span><b>{brl(d.invested)}</b></Stat>
        <Stat><span>Resultado</span><Toned as="b" $tone={profitTone}>{signedBrl(d.profit)}</Toned></Stat>
        <Stat><span>Rentabilidade total</span><Toned as="b" $tone={profitTone}>{d.cost ? signedPct(d.profit / d.cost) : '–'}</Toned></Stat>
        <Stat><span>Proventos (12 meses)</span><b>{brl(d.income12m)}</b></Stat>
        <Stat><span>Saldo em conta</span><b>{brl(d.cash)}</b></Stat>
      </Stats>
      {missing > 0 && <Muted as="small">{plural(missing, 'ativo', 'ativos')} sem movimentações informadas — o valor aplicado deles entra na data da compra.</Muted>}
    </Styled.Container>
  );
}
