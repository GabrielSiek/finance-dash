import styled from 'styled-components';
import { Card } from '@/components/ui';

export const Container = styled(Card)`gap: 6px;`;
export const Head = styled.div`margin-bottom: 8px;`;
export const Name = styled.div`
  flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px;
  & > b { font-weight: 600; }
  & > small { font-size: 12px; color: var(--muted); }
`;
