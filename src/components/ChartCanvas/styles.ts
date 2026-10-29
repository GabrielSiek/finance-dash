import styled, { css } from 'styled-components';

/** $height for responsive charts; $size for fixed square ones (the donut). */
export const Container = styled.div<{ $height?: number; $size?: number }>`
  position: relative;
  ${(p) => (p.$size ? css`width: ${p.$size}px; height: ${p.$size}px;` : css`height: ${p.$height ?? 240}px;`)}
`;
