import styled from 'styled-components';
import { Card } from '@/components/ui';

export const Container = styled(Card)`gap: 16px;`;

export const CreditCard = styled.div`
  display: flex; flex-direction: column; gap: 10px; padding: 16px; border-radius: 18px; background: var(--bg); border: 1px solid var(--border);
`;
export const Head = styled.div`display: flex; align-items: center; gap: 12px;`;
export const Plastic = styled.div.attrs({ 'aria-hidden': true })`width: 44px; height: 30px; border-radius: 7px; flex-shrink: 0;`;
export const Names = styled.div`
  flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px;
  & > b { font-size: 14px; }
  & > small { font-size: 12px; color: var(--muted); }
`;
export const Amount = styled.div`
  display: flex; justify-content: space-between; align-items: baseline; gap: 8px;
  & > b { font-size: 20px; font-weight: 700; letter-spacing: -0.02em; }
  & > small { font-size: 12px; color: var(--muted); }
`;
