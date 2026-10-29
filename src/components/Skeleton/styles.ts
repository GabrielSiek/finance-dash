import styled, { css, keyframes } from 'styled-components';
import { media } from '@/styles/media';

const shimmer = keyframes`to { transform: translateX(100%); }`;

/** Lets the placeholder blocks lay out as direct children of the page. */
export const Container = styled.div.attrs({ 'aria-busy': true })`display: contents;`;

/** One shimmering block. $w is any CSS width (omit to stretch), $h is px. */
export const Sk = styled.span<{ $w?: string; $h?: number; $r?: number | string; $max?: string }>`
  display: block; position: relative; overflow: hidden; max-width: ${(p) => p.$max ?? '100%'}; border-radius: 8px; background: var(--surface-2);
  height: ${(p) => p.$h ?? 14}px;
  ${(p) => p.$w && css`width: ${p.$w};`}
  ${(p) => p.$r != null && css`border-radius: ${typeof p.$r === 'number' ? `${p.$r}px` : p.$r};`}
  &::after {
    content: ""; position: absolute; inset: 0; transform: translateX(-100%);
    background: linear-gradient(90deg, transparent, var(--sk-shine), transparent); animation: ${shimmer} 1.4s ease-in-out infinite;
  }
  ${media.reducedMotion} { &::after { animation: none; display: none; } }
`;

export const Donut = styled(Sk)`
  width: 212px; height: 212px; border-radius: 50%;
  -webkit-mask: radial-gradient(circle, transparent 57%, #000 58%); mask: radial-gradient(circle, transparent 57%, #000 58%);
`;
export const DonutBox = styled.div`display: flex; justify-content: center; padding: 6px 0;`;

export const Stack = styled.div<{ $gap?: number; $flex?: string }>`
  display: flex; flex-direction: column; gap: ${(p) => p.$gap ?? 4}px; min-width: 0;
  ${(p) => p.$flex && css`flex: ${p.$flex};`}
`;
export const Line = styled.div<{ $gap?: number; $flex?: string }>`
  display: flex; align-items: center; gap: ${(p) => p.$gap ?? 12}px; min-width: 0;
  ${(p) => p.$flex && css`flex: ${p.$flex};`}
`;

export const ClassCards = styled.div`
  display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 16px;
  ${media.phone} { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
`;
export const ClassCard = styled.div`
  background: var(--surface); border: 1px solid var(--border); border-radius: 22px; padding: 18px; display: flex; flex-direction: column; gap: 14px;
  box-shadow: var(--shadow); min-width: 0;
`;

export const KpiGrid = styled.div`
  display: grid; gap: 16px; grid-template-columns: repeat(2, minmax(0, 1fr));
  ${media.wide} { grid-template-columns: 1fr 1fr 2fr; }
  ${media.small} { grid-template-columns: minmax(0, 1fr); }
`;
export const Kpi = styled.article<{ $wide?: boolean }>`
  background: var(--surface); border: 1px solid var(--border); border-radius: 22px; padding: 20px; display: flex; flex-direction: column; gap: 12px;
  box-shadow: var(--shadow); min-width: 0;
  ${(p) => p.$wide && css`grid-column: 1 / -1; ${media.wide} { grid-column: auto; }`}
`;
export const KpiTop = styled.div`display: flex; align-items: center; justify-content: space-between; gap: 8px;`;
export const KpiSplit = styled.div`display: grid; grid-template-columns: repeat(auto-fit, minmax(min(220px, 100%), 1fr)); gap: 18px 28px;`;

export const TxRow = styled.div`
  display: grid; column-gap: 12px; align-items: center; padding: 12px 16px;
  grid-template-columns: 64px minmax(240px, 2fr) minmax(170px, 1.2fr) minmax(150px, 1fr) 124px minmax(120px, 1fr); min-width: 900px;
`;

export const Connection = styled.div`
  display: flex; flex-wrap: wrap; align-items: center; gap: 14px; padding: 14px 16px; border: 1px solid var(--border); border-radius: 18px; background: var(--bg);
`;
export const Connections = styled.div`display: flex; flex-direction: column; gap: 10px;`;
export const AllocGrid = styled.div`display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 12px;`;
