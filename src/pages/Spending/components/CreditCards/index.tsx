import { brl, brl0, fmtDayMonth, todayIso } from '@/lib/format';
import { Bar, BarFill, Chip } from '@/components/ui';
import { CardHeader } from '@/components/CardHeader';
import { BRANDS, type Computed } from '../../logic';
import * as Styled from './styles';

export function CreditCards({ c }: { c: Computed }) {
  const cards = c.scope.filter((a) => a.type === 'CREDIT');
  if (!cards.length) return null;
  const today = todayIso();
  return (
    <Styled.Container>
      <CardHeader title="Cartões de crédito" sub="Fatura atual e uso do limite" />
      {cards.map((a) => {
        const cr = a.credit;
        const used = cr?.limit != null && cr.available != null ? cr.limit - cr.available : a.balance;
        const u = cr?.limit ? used / cr.limit : null;
        const color = u == null ? '--accent' : u >= 0.85 ? '--neg' : u >= 0.6 ? '--warn' : '--pos';
        const brand = BRANDS.find(([re]) => re.test(`${a.connector} ${a.name}`))?.[1] ?? 'var(--accent)';
        const closed = Boolean(cr?.closeDate && today >= cr.closeDate.slice(0, 10) && (!cr.dueDate || today <= cr.dueDate.slice(0, 10)));
        const dates = [cr?.closeDate && !closed ? `Fecha ${fmtDayMonth(cr.closeDate)}` : null, cr?.dueDate ? `vence ${fmtDayMonth(cr.dueDate)}` : null].filter(Boolean).join(' · ');
        const last4 = a.number ? ` · ${String(a.number).slice(-4)}` : '';
        const off = c.excludedAcc.has(a.id);
        return (
          <Styled.CreditCard key={a.id}>
            <Styled.Head>
              <Styled.Plastic style={{ background: brand }} />
              <Styled.Names><b>{a.name}{last4}</b><small>{dates || a.connector}</small></Styled.Names>
              {off
                ? <Chip $tone="neutral" title="Os gastos deste cartão aparecem na lista, mas não entram nos totais. Altere em Configurações.">Fora dos totais</Chip>
                : <Chip $tone={closed ? 'warn' : 'accent'}>{closed ? 'Fechada' : 'Aberta'}</Chip>}
            </Styled.Head>
            <Styled.Amount><b>{brl(a.balance)}</b><small>{u != null && cr?.limit ? `${Math.round(u * 100)}% de ${brl0(cr.limit)}` : ''}</small></Styled.Amount>
            {u != null && <Bar $size="thin"><BarFill $value={u} $color={color} /></Bar>}
          </Styled.CreditCard>
        );
      })}
    </Styled.Container>
  );
}
