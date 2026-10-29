import type { SpendingData } from '@shared/types';
import { brl, brl0, num, plural } from '@/lib/format';
import { Bar, BarFill, CardSub, CardTitle, CardTitles, Chip, Empty, Swatch, Tile } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { categoryRows, status, type CatRow, type Computed } from '../../logic';
import * as Styled from './styles';

interface CategoriesProps {
  s: SpendingData;
  c: Computed;
  /** The transaction filter's group or category. */
  selected: string;
  onFilter: (key: string) => void;
}

export function Categories({ s, c, selected, onFilter }: CategoriesProps) {
  const budgets = s.budgets ?? {};
  const list = categoryRows(s, c);
  const total = c.cur.total;
  return (
    <Styled.Container>
      <Styled.Head>
        <CardTitles>
          <CardTitle>Para onde vai seu dinheiro</CardTitle>
          <CardSub>Seus grupos e as categorias{Object.keys(budgets).length ? ', comparados ao orçamento' : ''}</CardSub>
        </CardTitles>
        <Styled.HeadLegend>
          <span><Swatch $kind="round" $color="--pos" />Dentro</span>
          <span><Swatch $kind="round" $color="--warn" />Atenção (85%+)</span>
          <span><Swatch $kind="round" $color="--neg" />Estourou</span>
        </Styled.HeadLegend>
      </Styled.Head>
      {list.map((r) => <CategoryRow key={r.key} r={r} budget={budgets[r.key]} total={total} pressed={selected === r.key} onFilter={onFilter} />)}
      {!list.length && <Empty>Nenhum gasto neste mês.</Empty>}
    </Styled.Container>
  );
}

function CategoryRow({ r, budget, total, pressed, onFilter }: { r: CatRow; budget: number | undefined; total: number; pressed: boolean; onFilter: (key: string) => void }) {
  let prog, chip;
  if (budget) {
    const ratio = r.value / budget, st = status(ratio);
    prog = <><Bar><BarFill $value={ratio} $color={st.color} /></Bar><small>{brl0(r.value)} de {brl0(budget)} · {Math.round(ratio * 100)}%</small></>;
    chip = <Chip $tone={st.tone} $size="sm">{st.label}</Chip>;
  } else {
    const share = total > 0 ? Math.max(r.value, 0) / total : 0;
    prog = <><Bar><BarFill $value={share} $color={r.color ?? '--accent'} /></Bar><small>Sem orçamento definido</small></>;
    chip = r.offTotals ? <Chip $tone="neutral" $size="sm">Fora dos totais</Chip>
      : r.isGroup ? <Chip $tone="accent" $size="sm">Grupo</Chip> : <Chip $tone="neutral" $size="sm">Sem limite</Chip>;
    if (r.offTotals) prog = <><Bar><BarFill $value={0} /></Bar><small>Não entra em Gastos nem no Saldo</small></>;
  }
  const meta = r.isGroup
    ? `${plural(r.n, 'pagamento', 'pagamentos')}${r.received ? ` · ${brl(r.received)} recebidos` : ''}`
    : `${plural(r.n, 'transação', 'transações')} · ${num(total > 0 ? (r.value / total) * 100 : 0, 1)}% do total`;
  return (
    <Styled.Row aria-pressed={pressed} title={`Ver as transações de ${r.label}`} onClick={() => onFilter(r.key)}>
      <Styled.Who>
        <Tile $color={r.isGroup ? r.color : undefined}><Icon d={r.icon} size={19} /></Tile>
        <Styled.Names><b>{r.label}</b><small>{meta}</small></Styled.Names>
      </Styled.Who>
      <Styled.Prog>{prog}</Styled.Prog>
      <Styled.Amount><b>{r.value < 0 ? '+' : ''}{brl(Math.abs(r.value))}</b>{chip}</Styled.Amount>
    </Styled.Row>
  );
}
