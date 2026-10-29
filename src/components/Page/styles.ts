import styled from 'styled-components';
import { media } from '@/styles/media';

export const Container = styled.div`
  max-width: 1240px; margin: 0 auto; display: flex; flex-direction: column; gap: 20px;
`;

export const Head = styled.header`display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 16px;`;
export const Titles = styled.div`display: flex; flex-direction: column; gap: 4px;`;
export const Sub = styled.span`font-size: 14px; color: var(--muted);`;
export const Title = styled.h1`
  font-size: 30px; font-weight: 700; letter-spacing: -0.025em;
  ${media.phone} { font-size: 26px; }
`;
export const Actions = styled.div`display: flex; flex-wrap: wrap; align-items: center; gap: 10px;`;

export const View = styled.div`display: flex; flex-direction: column; gap: 20px; min-width: 0;`;
