import styled from 'styled-components';
import { Card } from '@/components/ui';

export const Container = styled(Card)`gap: 14px;`;
export const Progress = styled.div`display: flex; align-items: baseline; justify-content: space-between; gap: 8px;`;
export const Pct = styled.b`font-size: 28px; letter-spacing: -0.025em;`;
export const SoftBox = styled.div`
  display: flex; flex-direction: column; gap: 2px; padding: 12px 14px; border-radius: 14px; background: var(--bg); font-size: 13px;
`;
