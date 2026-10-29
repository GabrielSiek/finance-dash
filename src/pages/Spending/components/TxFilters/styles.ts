import styled from 'styled-components';
import { Input } from '@/components/ui';

export const Container = styled.div.attrs({ role: 'search' })`
  display: flex; flex-wrap: wrap; align-items: center; gap: 10px; padding: 14px; border-radius: 18px; background: var(--bg); border: 1px solid var(--border);
`;

export const DateInput = styled(Input).attrs({ type: 'date' })`width: 160px;`;
