import styled, { css } from 'styled-components';
import { media } from '@/styles/media';

/* Gastos · Investido · Saldo e orçamento (the last one twice as wide, or on its own row) */
export const Container = styled.div`
  display: grid; gap: 16px; grid-template-columns: repeat(2, minmax(0, 1fr));
  ${media.wide} { grid-template-columns: 1fr 1fr 2fr; }
  ${media.small} { grid-template-columns: minmax(0, 1fr); }
`;

export const Kpi = styled.article<{ $wide?: boolean }>`
  background: var(--surface); border: 1px solid var(--border); border-radius: 22px; padding: 20px;
  display: flex; flex-direction: column; gap: 12px; box-shadow: var(--shadow); min-width: 0;
  ${(p) => p.$wide && css`
    grid-column: 1 / -1;
    ${media.wide} { grid-column: auto; }
  `}
`;

export const Top = styled.div`
  display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 14px; font-weight: 500; color: var(--muted);
`;
export const Ico = styled.span`
  width: 34px; height: 34px; border-radius: 11px; background: var(--surface-2); display: grid; place-items: center; color: var(--text);
`;

/** The big number. $size 'part' inside a split KPI, 'sm' for a short message instead of a number. */
export const Value = styled.span<{ $size?: 'part' | 'sm'; $tone?: 'pos' | 'neg' }>`
  font-size: ${(p) => (p.$size === 'sm' ? 20 : p.$size === 'part' ? 24 : 28)}px; font-weight: 700; letter-spacing: -0.025em;
  ${(p) => p.$tone && css`color: var(--${p.$tone});`}
`;

export const Meta = styled.div<{ $neg?: boolean }>`
  display: flex; flex-wrap: wrap; align-items: center; gap: 8px; font-size: 12px; color: var(${(p) => (p.$neg ? '--neg' : '--muted')});
`;

export const Progress = styled.div`display: flex; flex-direction: column; gap: 6px;`;

export const Split = styled.div`display: grid; grid-template-columns: repeat(auto-fit, minmax(min(220px, 100%), 1fr)); gap: 18px 28px;`;
export const Part = styled.div`display: flex; flex-direction: column; gap: 10px; min-width: 0;`;
export const PartLabel = styled.div`display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 13px; font-weight: 600;`;
