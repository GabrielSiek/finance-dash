import type { Goals } from '@shared/types';
import { brl0, fmtMonthYear, num, pct, todayIso } from '@/lib/format';
import { ICON } from '@/lib/icons';
import { Bar, BarFill, Button, Chip, Empty, Muted, type Tone } from '@/components/ui';
import { CardHeader } from '@/components/CardHeader';
import { Icon } from '@/components/Icon';
import type { Derived } from '../../derive';
import * as Styled from './styles';

// Meta de patrimônio
export function WealthGoal({ goals: g, d }: { goals: Goals; d: Derived }) {
  if (!g.wealthTarget) {
    return (
      <Styled.Container>
        <CardHeader title="Meta de patrimônio" sub="Quanto você quer ter investido" />
        <Empty as="div">
          Defina um valor e uma data para ver quanto precisa aportar por mês.<br />
          <Button as="a" $size="sm" href="#/configuracoes"><Icon d={ICON.plus} size={16} />Definir meta</Button>
        </Empty>
      </Styled.Container>
    );
  }

  const target = g.wealthTarget;
  const r = (g.monthlyRate ?? 0.9) / 100;
  const end = g.wealthDate ? g.wealthDate.slice(0, 7) : null;
  const now = todayIso().slice(0, 7);
  const months = end ? Math.max((Number(end.slice(0, 4)) - Number(now.slice(0, 4))) * 12 + Number(end.slice(5, 7)) - Number(now.slice(5, 7)), 0) : null;
  let pmt: number | null = null;
  if (months) {
    const grow = (1 + r) ** months;
    pmt = Math.max(r ? ((target - d.total * grow) * r) / (grow - 1) : (target - d.total) / months, 0);
  }
  const kind: Tone = pmt == null || !g.monthlyContribution ? 'accent' : pmt <= g.monthlyContribution ? 'pos' : pmt <= g.monthlyContribution * 1.25 ? 'warn' : 'neg';
  const status = { accent: d.total >= target ? 'Meta atingida' : 'Em andamento', pos: 'No ritmo', warn: 'Quase no ritmo', neg: 'Abaixo do ritmo', neutral: '' }[kind];

  return (
    <Styled.Container>
      <CardHeader title="Meta de patrimônio" sub={`${brl0(target)}${end ? ` até ${fmtMonthYear(`${end}-01`)}` : ''}`}>
        <Chip $tone={kind}>{status}</Chip>
      </CardHeader>
      <Styled.Progress>
        <Styled.Pct>{pct(d.total / target)}</Styled.Pct>
        <Muted as="small">{d.total >= target ? 'Meta atingida' : `Faltam ${brl0(target - d.total)}`}</Muted>
      </Styled.Progress>
      <Bar $size="thick"><BarFill $value={d.total / target} $color="--accent" /></Bar>
      {pmt != null
        ? (
          <Styled.SoftBox>
            <span>Aporte necessário: <b>~{brl0(pmt)}/mês</b></span>
            <Muted as="small">Considerando rendimento de {num(g.monthlyRate ?? 0.9)}% ao mês até {fmtMonthYear(`${end}-01`)}</Muted>
          </Styled.SoftBox>
        )
        : <Muted as="small">Defina uma data para calcular o aporte necessário.</Muted>}
    </Styled.Container>
  );
}
