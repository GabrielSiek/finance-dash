import styled from 'styled-components';
import { Card, Empty, THead } from '@/components/ui';
import { txColumns } from '../../styles';

export const Container = styled(Card).attrs({ id: 'tx-card' })``;

export const Summary = styled.p`
  margin: 0; font-size: 13px; color: var(--muted);
  & b { color: var(--text); font-weight: 600; }
`;

export const Head = styled(THead)<{ $wide?: boolean }>`${txColumns}`;
export const HeadRight = styled.span`text-align: right;`;

export const TableEmpty = styled(Empty)`padding: 16px;`;

export const More = styled.div`display: flex; justify-content: center;`;
