import styled, { css } from 'styled-components';
import { Field } from '@/components/ui';

export const Container = styled(Field)``;
export const Label = styled.label<{ $icon?: boolean }>`
  ${(p) => p.$icon && css`display: flex; align-items: center; gap: 8px;`}
`;
export const LabelIcon = styled.span<{ $color?: string }>`
  display: inline-flex;
  ${(p) => p.$color && css`color: var(${p.$color});`}
`;
