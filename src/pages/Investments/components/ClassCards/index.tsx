import type { CategoryKey, Portfolio } from '@shared/types';
import { ASSET_CLASSES, CATEGORIES, CORE_CATEGORIES, subtypeLabel } from '@/lib/categories';
import { sparkPath } from '@/lib/charts';
import { arrowPct, brl, pct, plural, signedPct } from '@/lib/format';
import { ICON } from '@/lib/icons';
import { Chip, Tile, toneOf } from '@/components/ui';
import { Icon } from '@/components/Icon';
import type { ClassFilter, Derived } from '../../derive';
import * as Styled from './styles';

interface Props {
  p: Portfolio;
  d: Derived;
  filter: ClassFilter;
  onToggle: (key: CategoryKey) => void;
}

export function ClassCards({ p, d, filter, onToggle }: Props) {
  const keys = ASSET_CLASSES.filter((k) => CORE_CATEGORIES.includes(k) || d.classes[k].value > 0);
  const hist = p.history.slice(-90);
  return (
    <Styled.Container>
      {keys.map((k) => {
        const c = d.classes[k];
        const meta = CATEGORIES[k];
        const mix = Object.entries(c.subtypes).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([s]) => subtypeLabel(s));
        const sub = c.count ? (mix.length ? mix.join(' e ') : plural(c.count, 'ativo', 'ativos')) : 'Nenhum ativo';
        const month = c.monthW ? c.monthV / c.monthW / 100 : null;
        const spark = hist.map((h) => h.byCategory?.[k] ?? 0);
        const sparkOk = spark.filter((v) => v > 0).length >= 3;
        return (
          <Styled.Card key={k} aria-pressed={filter === k} onClick={() => onToggle(k)}>
            <Styled.Top>
              <Tile $size={38} $color={meta.color}><Icon d={ICON[meta.icon]} size={19} /></Tile>
              <Styled.Names><b>{meta.label}</b><small>{sub}</small></Styled.Names>
              <Chip $tone="neutral">{pct(d.total ? c.value / d.total : 0)}</Chip>
            </Styled.Top>
            <Styled.Body>
              <Styled.Value>{brl(c.value)}</Styled.Value>
              <Styled.Meta>
                {month != null && <Chip $tone={toneOf(month)}>{arrowPct(month)} no mês</Chip>}
                {c.cost > 0 && <span>{signedPct(c.profit / c.cost)} desde o início</span>}
              </Styled.Meta>
            </Styled.Body>
            {sparkOk
              ? <Styled.Spark viewBox="0 0 200 44" preserveAspectRatio="none" aria-hidden="true"><Styled.SparkLine d={sparkPath(spark)} style={{ stroke: `var(${meta.color})` }} /></Styled.Spark>
              : <Styled.SparkEmpty>Histórico em construção</Styled.SparkEmpty>}
          </Styled.Card>
        );
      })}
    </Styled.Container>
  );
}
