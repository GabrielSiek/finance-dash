import styled from 'styled-components';
import { Card, CardSub } from '@/components/ui';
import { media } from '@/styles/media';

export const Container = styled(Card)`flex: 2 1 560px;`;
export const Label = styled(CardSub)`font-size: 14px; font-weight: 500;`;
export const Value = styled.span`
  font-size: 40px; font-weight: 700; letter-spacing: -0.03em; line-height: 1.05;
  ${media.phone} { font-size: 32px; }
`;
export const Meta = styled.div`display: flex; flex-wrap: wrap; align-items: center; gap: 8px; font-size: 13px; color: var(--muted);`;
