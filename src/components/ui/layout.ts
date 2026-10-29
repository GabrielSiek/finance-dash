// Cards, rows/columns, notices, legends and stats.
import styled, { css } from 'styled-components';
import { media } from '@/styles/media';
import { Button } from './controls';

/** $flex sets the flex shorthand inside a Row (e.g. "2 1 560px"); $gap overrides the 18px between children. */
export const Card = styled.section<{ $flex?: string; $gap?: number }>`
  background: var(--surface); border: 1px solid var(--border); border-radius: 24px; padding: 24px;
  display: flex; flex-direction: column; gap: ${(p) => p.$gap ?? 18}px; box-shadow: var(--shadow); min-width: 0;
  ${(p) => p.$flex && css`flex: ${p.$flex};`}
  ${media.phone} { padding: 18px; border-radius: 20px; }
`;

export const CardHead = styled.div<{ $center?: boolean }>`
  display: flex; flex-wrap: wrap; justify-content: space-between; align-items: ${(p) => (p.$center ? 'center' : 'flex-start')}; gap: 12px 16px;
`;
export const CardTitles = styled.div<{ $gap?: number }>`display: flex; flex-direction: column; gap: ${(p) => p.$gap ?? 4}px;`;
export const CardTitle = styled.h2`font-size: 17px; font-weight: 600;`;
export const CardSub = styled.span`font-size: 13px; color: var(--muted);`;

export const Row = styled.div`display: flex; flex-wrap: wrap; gap: 20px; align-items: stretch;`;
export const Col = styled.div<{ $flex?: string }>`
  display: flex; flex-direction: column; gap: 20px; min-width: 0;
  ${(p) => p.$flex && css`flex: ${p.$flex};`}
`;

export const Notice = styled.section<{ $error?: boolean }>`
  background: var(--surface); border: 1px solid var(--border); border-radius: 20px; padding: 20px 24px;
  h2 { font-size: 17px; margin-bottom: 8px; }
  ol { margin: 8px 0 0; padding-left: 20px; }
  ${(p) => p.$error && css`border-color: var(--neg); background: var(--neg-soft); color: var(--text);`}
`;

export const Empty = styled.p`
  color: var(--muted); font-size: 14px; padding: 8px 0;
  ${Button} { margin-top: 12px; }
`;

export const Legend = styled.div<{ $size?: 'sm' }>`
  display: flex; flex-wrap: wrap; gap: 8px 20px; font-size: 13px; color: var(--muted);
  & > span { display: inline-flex; align-items: center; gap: 8px; }
  ${(p) => p.$size === 'sm' && css`font-size: 12px; gap: 6px 14px;`}
`;

/** Color key. $color is a CSS custom property name ('--c-rf'). */
export const Swatch = styled.i<{ $kind?: 'line' | 'dash' | 'dot' | 'round'; $color?: string }>`
  display: inline-block; width: 10px; height: 10px; border-radius: 3px; flex-shrink: 0;
  ${(p) => p.$color && css`background: var(${p.$color});`}
  ${(p) => p.$kind === 'line' && css`width: 18px; height: 3px; border-radius: 2px;`}
  ${(p) => p.$kind === 'dash' && css`width: 18px; height: 0; border-radius: 0; border-top: 2px dashed var(--muted); background: none;`}
  ${(p) => p.$kind === 'dot' && css`width: 18px; height: 0; border-radius: 0; border-top: 2px dotted var(--accent); background: none;`}
  ${(p) => p.$kind === 'round' && css`border-radius: 50%; width: 8px; height: 8px;`}
`;

export const Stats = styled.div`
  display: grid; grid-template-columns: repeat(auto-fit, minmax(min(150px, 100%), 1fr)); gap: 12px; padding-top: 18px; border-top: 1px solid var(--border);
`;
export const Stat = styled.div`
  display: flex; flex-direction: column; gap: 4px;
  & > span { font-size: 12px; color: var(--muted); }
  & > b { font-size: 17px; font-weight: 600; }
`;
