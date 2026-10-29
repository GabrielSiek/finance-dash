import styled, { css } from 'styled-components';
import { Card, Cell, Empty, TFoot, THead } from '@/components/ui';
import { assetsGrid } from '../HoldingRow/styles';

export const Container = styled(Card)``;
export const Head = styled(THead)`${assetsGrid}`;
export const Foot = styled(TFoot)`${assetsGrid}`;

export const SortHeader = styled.span.attrs({ role: 'columnheader' })<{ $right?: boolean; $sorted: boolean; $asc: boolean }>`
  cursor: pointer; user-select: none;
  &:hover { color: var(--text); }
  ${(p) => p.$right && css`text-align: right;`}
  ${(p) => p.$sorted && css`&::after { content: "${p.$asc ? ' ↑' : ' ↓'}"; }`}
`;
export const NoRows = styled(Empty)`padding: 16px;`;
export const MutedTotal = styled(Cell)`color: var(--muted);`;
export const ResultTotal = styled(Cell)<{ $tone: 'pos' | 'neg' }>`color: var(--${(p) => p.$tone});`;
