import type { ReactNode } from 'react';
import type { ColorVar } from '@/lib/categories';
import { Input, InputAffix, Prefix } from '@/components/ui';
import { Icon } from '@/components/Icon';
import * as Styled from './styles';

interface MoneyFieldProps {
  id: string;
  label: ReactNode;
  value: string;
  onChange: (value: string) => void;
  /** Shown under the input; pass '' to keep an empty line. */
  hint?: ReactNode;
  placeholder?: string;
  /** Icon (and its color) before the label, for the per-category budgets. */
  icon?: string;
  color?: ColorVar;
}

/** An "R$" amount input. */
export function MoneyField({ id, label, value, onChange, hint, placeholder = '0', icon, color }: MoneyFieldProps) {
  return (
    <Styled.Container>
      <Styled.Label htmlFor={id} $icon={Boolean(icon)}>
        {icon && <Styled.LabelIcon $color={color}><Icon d={icon} size={16} /></Styled.LabelIcon>}
        {label}
      </Styled.Label>
      <InputAffix>
        <Prefix>R$</Prefix>
        <Input $pre id={id} inputMode="decimal" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      </InputAffix>
      {hint !== undefined && <small>{hint}</small>}
    </Styled.Container>
  );
}
