import styled from 'styled-components';
import { Card, Field } from '@/components/ui';

export const Container = styled(Card)``;
export const Limits = styled(Field)`
  padding-top: 6px; border-top: 1px solid var(--border);
  & > label { padding-top: 12px; }
`;
