import styled, { css } from 'styled-components';
import { Cell, TRow } from '@/components/ui';
import { txColumns } from '../../styles';

export const Container = styled(TRow)<{ $wide?: boolean }>`${txColumns}`;

export const DateCell = styled(Cell)`color: var(--muted);`;

export const PlainSelect = styled.select<{ $grouped?: boolean }>`
  appearance: none; -webkit-appearance: none; border: 1px solid transparent; background: transparent; color: inherit; font: inherit;
  padding: 2px 18px 2px 4px; margin-left: -5px; border-radius: 8px; cursor: pointer; max-width: 100%;
  &:hover, &:focus { border-color: var(--border); background: var(--surface-2); outline: none; }
  ${(p) => p.$grouped && css`font-weight: 600;`}
`;

export const Method = styled.div.attrs({ role: 'cell' })`
  display: flex; align-items: center; gap: 8px; min-width: 0;
  & > span:last-child { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
`;

export const Amount = styled.span.attrs({ role: 'cell' })<{ $color?: 'pos' | 'muted' }>`
  text-align: right; font-weight: 600;
  ${(p) => p.$color && css`color: var(--${p.$color});`}
`;
