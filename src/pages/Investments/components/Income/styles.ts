import styled from 'styled-components';
import { Card, Stat } from '@/components/ui';

export const Container = styled(Card)`flex: 3 1 520px;`;
export const Totals = styled.div`display: flex; flex-wrap: wrap; gap: 28px;`;
export const Total = styled(Stat)`& > b { font-size: 20px; font-weight: 700; }`;
