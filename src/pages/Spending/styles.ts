import styled, { css } from 'styled-components';

/** The page body keeps the Page's own column layout. */
export const Container = styled.div`display: contents;`;

/** A bar split into colored segments (widths set per segment). */
export const SplitBar = styled.div<{ $size?: 'sm' }>`
  display: flex; gap: 3px; height: 14px; border-radius: 999px; overflow: hidden;
  & > div { height: 100%; min-width: 3px; }
  ${(p) => p.$size === 'sm' && css`height: 10px; gap: 2px;`}
`;

/** Columns of the transactions table; $wide fits full dates when the period spans several months. */
export const txColumns = css<{ $wide?: boolean }>`
  grid-template-columns: ${(p) => (p.$wide ? '92px' : '64px')} minmax(240px, 2fr) minmax(170px, 1.2fr) minmax(150px, 1fr) 124px minmax(120px, 1fr);
  min-width: 900px;
`;
