import type { Goals } from '@shared/types';
import { ASSET_CLASSES, CATEGORIES } from '@/lib/categories';
import { brl, brl0, num } from '@/lib/format';
import { ICON } from '@/lib/icons';
import { Button, Empty, Legend, Muted, Swatch } from '@/components/ui';
import { CardHeader } from '@/components/CardHeader';
import { Icon } from '@/components/Icon';
import type { Derived } from '../../derive';
import * as Styled from './styles';

interface Props {
  goals: Goals;
  d: Derived;
  /** Net amount contributed this month. */
  aportado: number;
}

// Meta de alocação
export function AllocationGoal({ goals: g, d, aportado }: Props) {
  const targets = g.allocation ?? {};
  return (
    <Styled.Container>
      <CardHeader title="Meta de alocação" sub="Carteira atual comparada à distribuição alvo">
        <Button as="a" $size="sm" href="#/configuracoes"><Icon d={ICON.edit} size={16} />Editar metas</Button>
      </CardHeader>
      {Object.keys(targets).length
        ? <Allocation targets={targets} d={d} remaining={g.monthlyContribution ? Math.max(g.monthlyContribution - Math.max(aportado, 0), 0) : 0} />
        : (
          <Empty as="div">
            Defina o percentual que você quer em cada classe (ex.: 40% renda fixa, 25% FIIs…) para comparar com a carteira atual.<br />
            <Button as="a" $size="sm" href="#/configuracoes"><Icon d={ICON.plus} size={16} />Definir alocação alvo</Button>
          </Empty>
        )}
    </Styled.Container>
  );
}

function Allocation({ targets, d, remaining }: { targets: Goals['allocation']; d: Derived; remaining: number }) {
  const keys = ASSET_CLASSES.filter((k) => targets[k] || d.classes[k].value > 0);
  const curOf = (k: (typeof keys)[number]) => (d.total ? (d.classes[k].value / d.total) * 100 : 0);
  const scale = Math.max(40, Math.ceil(Math.max(...keys.map((k) => Math.max(curOf(k), targets[k] ?? 0))) / 10) * 10);

  let suggest = null;
  if (remaining > 0) {
    const newTotal = d.total + remaining;
    const defs = keys.map((k) => ({ k, gap: Math.max(((targets[k] ?? 0) / 100) * newTotal - d.classes[k].value, 0) })).filter((x) => x.gap > 0);
    const sum = defs.reduce((s, x) => s + x.gap, 0);
    if (sum > 0) {
      suggest = (
        <Styled.Suggest>
          <div><Styled.SuggestTitle>Onde aportar os {brl(remaining)} que faltam</Styled.SuggestTitle><br /><small>Sugestão para aproximar a carteira do alvo sem vender nada</small></div>
          <Styled.Items>
            {defs.sort((a, b) => b.gap - a.gap).map((x) => (
              <Styled.Item key={x.k}>
                <Swatch as="span" $color={CATEGORIES[x.k].color} />
                <Styled.ItemLabel>{CATEGORIES[x.k].label}</Styled.ItemLabel>
                <b>{brl((remaining * x.gap) / sum)}</b>
              </Styled.Item>
            ))}
          </Styled.Items>
        </Styled.Suggest>
      );
    }
  }

  return (
    <>
      <Legend>
        <span><Styled.CurrentKey />Atual</span>
        <span><Styled.TargetKey />Alvo</span>
        <span><Swatch $kind="round" $color="--pos" />até 2 p.p.</span>
        <span><Swatch $kind="round" $color="--warn" />2 a 5 p.p.</span>
        <span><Swatch $kind="round" $color="--neg" />acima de 5 p.p.</span>
      </Legend>
      <div>
        {keys.map((k) => {
          const cur = curOf(k), tg = targets[k] ?? 0, diff = cur - tg, ad = Math.abs(diff);
          const kind = ad <= 2 ? 'pos' : ad <= 5 ? 'warn' : 'neg';
          return (
            <Styled.AllocRow key={k}>
              <Styled.Label>
                <b><Swatch as="span" $color={CATEGORIES[k].color} />{CATEGORIES[k].label}</b>
                <small>{brl0(d.classes[k].value)} · alvo {brl0((tg / 100) * d.total)}</small>
              </Styled.Label>
              <Styled.Track>
                <Styled.Current style={{ width: `${Math.min(cur / scale, 1) * 100}%`, background: `var(${CATEGORIES[k].color})` }} />
                <Styled.Target style={{ left: `${(tg / scale) * 100}%` }} />
              </Styled.Track>
              <Styled.Nums><b>{num(cur, 1)}%</b><Muted> / {num(tg, 1)}%</Muted></Styled.Nums>
              <Styled.GapChip $tone={kind}>{ad <= 2 ? 'No alvo' : `${diff > 0 ? '+' : '−'}${num(ad, 1)} p.p.`}</Styled.GapChip>
            </Styled.AllocRow>
          );
        })}
      </div>
      {suggest}
    </>
  );
}
