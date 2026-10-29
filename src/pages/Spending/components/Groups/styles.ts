import styled from 'styled-components';
import { Card } from '@/components/ui';

export const Container = styled(Card)`gap: 14px;`;

export const Row = styled.button.attrs({ type: 'button' })`
  display: flex; align-items: center; gap: 12px; min-width: 0;
  background: none; border: 0; border-top: 1px solid var(--border); font: inherit; color: inherit; text-align: left; cursor: pointer;
  padding: 10px 8px; margin: 0 -8px; width: calc(100% + 16px); border-radius: 12px;
  &:hover { background: var(--surface-2); }
  &[aria-pressed="true"] { background: var(--accent-soft); }
`;
