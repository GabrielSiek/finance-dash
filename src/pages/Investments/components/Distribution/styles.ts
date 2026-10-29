import styled, { css } from 'styled-components';
import { Card, ListRow, Muted } from '@/components/ui';

export const Container = styled(Card)`flex: 1 1 340px;`;
export const DonutBox = styled.div`display: flex; justify-content: center; padding: 6px 0;`;
export const Donut = styled.div`position: relative; width: 212px; height: 212px;`;
export const Center = styled.div`
  position: absolute; inset: 30px; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 2px; text-align: center; pointer-events: none;
  & > span { font-size: 12px; color: var(--muted); max-width: 130px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  & > b { font-size: 19px; font-weight: 700; letter-spacing: -0.02em; }
`;
export const LegendRow = styled(ListRow)<{ $hl: boolean }>`
  padding: 9px 4px;
  ${(p) => p.$hl && css`background: var(--surface-2); border-radius: 8px;`}
`;
export const RowLabel = styled.span`flex: 1;`;
export const RowValue = styled(Muted)`font-size: 13px;`;
export const RowShare = styled.b`width: 52px; text-align: right;`;
