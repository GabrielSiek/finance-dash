import styled from 'styled-components';
import { Card, CardHead, Legend } from '@/components/ui';

export const Container = styled(Card)`flex: 3 1 560px; gap: 10px;`;
export const Head = styled(CardHead)`padding-bottom: 6px;`;
export const HeadLegend = styled(Legend)`font-size: 12px; gap: 12px;`;

export const Row = styled.button.attrs({ type: 'button' })`
  display: flex; flex-wrap: wrap; align-items: center; gap: 12px 20px; padding: 12px 8px; margin: 0 -8px; border: 0; border-top: 1px solid var(--border);
  background: none; font: inherit; color: inherit; text-align: left; cursor: pointer; border-radius: 12px; width: calc(100% + 16px);
  &:hover { background: var(--surface-2); }
  &[aria-pressed="true"] { background: var(--accent-soft); }
`;

export const Who = styled.div`
  flex: 1 1 210px; display: flex; align-items: center; gap: 12px; min-width: 0;
`;
export const Names = styled.div`
  display: flex; flex-direction: column; gap: 2px; min-width: 0;
  & > b { font-size: 14px; font-weight: 600; }
  & > small { font-size: 12px; color: var(--muted); }
`;
export const Prog = styled.div`
  flex: 1 1 180px; display: flex; flex-direction: column; gap: 6px; min-width: 0;
  & > small { font-size: 12px; color: var(--muted); }
`;
export const Amount = styled.div`
  flex: 0 0 auto; display: flex; flex-direction: column; align-items: flex-end; gap: 4px; min-width: 110px;
  & > b { font-size: 15px; font-weight: 700; }
`;
