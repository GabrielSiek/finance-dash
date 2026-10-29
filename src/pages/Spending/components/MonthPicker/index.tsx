import { addMonths, fmtMonthLong, todayIso } from '@/lib/format';
import { ICON } from '@/lib/icons';
import { Icon } from '@/components/Icon';
import * as Styled from './styles';

export function MonthPicker({ month, onChange }: { month: string; onChange: (month: string) => void }) {
  const current = todayIso().slice(0, 7);
  return (
    <Styled.Container>
      <Styled.Step aria-label="Mês anterior" onClick={() => onChange(addMonths(month, -1))}><Icon d={ICON.left} /></Styled.Step>
      <Styled.Label>{fmtMonthLong(month)}</Styled.Label>
      <Styled.Step aria-label="Próximo mês" disabled={month >= current} onClick={() => onChange(addMonths(month, 1))}><Icon d={ICON.right} /></Styled.Step>
    </Styled.Container>
  );
}
