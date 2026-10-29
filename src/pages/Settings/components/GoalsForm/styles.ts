import styled from 'styled-components';
import { Card } from '@/components/ui';

export const Container = styled(Card)``;
export const Sum = styled.span<{ $warn: boolean }>`color: var(${(p) => (p.$warn ? '--warn' : '--pos')});`;
export const AllocGrid = styled.div`display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 12px;`;
export const ClassLabel = styled.label`display: flex; align-items: center; gap: 8px;`;
