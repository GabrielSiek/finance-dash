// List rows, icon tiles, progress bars and grid tables.
import styled, { css } from 'styled-components';
import { soft, type ColorVar } from '@/lib/categories';

export const ListRow = styled.div`
  display: flex; align-items: center; gap: 12px; padding: 10px 0; border-top: 1px solid var(--border); font-size: 14px; min-width: 0;
`;
/** The stretching middle of a ListRow: a bold title over a small muted line. */
export const RowMain = styled.div`
  flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px;
  & > b { font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  & > small { font-size: 12px; color: var(--muted); }
`;
/** Right-aligned amounts at the end of a ListRow. */
export const RowEnd = styled.div`
  display: flex; flex-direction: column; align-items: flex-end; gap: 4px; font-weight: 600; white-space: nowrap;
  & > small { font-size: 12px; color: var(--muted); }
`;

/**
 * Square icon/initials tile. $color tints it with a class or group color (soft background, colored icon);
 * $bg sets only the background.
 */
export const Tile = styled.div<{ $size?: 'sm' | 'lg' | number; $color?: ColorVar; $bg?: string }>`
  width: 40px; height: 40px; border-radius: 12px; background: var(--surface-2); display: grid; place-items: center; flex-shrink: 0;
  font-size: 10px; font-weight: 700; letter-spacing: .02em;
  ${(p) => p.$size === 'lg' && css`width: 42px; height: 42px; border-radius: 13px; font-size: 11px;`}
  ${(p) => p.$size === 'sm' && css`width: 36px; height: 36px; border-radius: 11px;`}
  ${(p) => typeof p.$size === 'number' && css`width: ${p.$size}px; height: ${p.$size}px;`}
  ${(p) => p.$color && css`background: ${soft(p.$color)}; color: var(${p.$color});`}
  ${(p) => p.$bg && css`background: ${p.$bg};`}
`;

export const Bar = styled.div<{ $size?: 'thin' | 'thick' }>`
  height: ${(p) => (p.$size === 'thin' ? 6 : p.$size === 'thick' ? 10 : 8)}px; border-radius: 999px; background: var(--surface-2); overflow: hidden;
`;
/** Fill of a Bar. $value is a ratio, clamped to 0…1; $color a CSS custom property name. */
export const BarFill = styled.div.attrs<{ $value: number; $color?: string }>((p) => ({
  style: { width: `${Math.min(Math.max(p.$value, 0), 1) * 100}%`, background: `var(${p.$color ?? '--accent'})` },
}))`
  height: 100%; border-radius: 999px;
`;

// ---------- Grid tables (role="table") ----------
// Each table defines its columns: styled(THead)`grid-template-columns: …; min-width: …;` and the same for TRow/TFoot.

export const TableWrap = styled.div`overflow-x: auto; margin: 0 -8px; padding: 0 8px;`;
const grid = css`display: grid; column-gap: 12px; align-items: center;`;
export const THead = styled.div.attrs({ role: 'row' })`
  ${grid}
  padding: 0 16px 10px; font-size: 12px; font-weight: 600; color: var(--muted); letter-spacing: .03em; text-transform: uppercase;
  border-bottom: 1px solid var(--border);
`;
export const TRow = styled.div.attrs({ role: 'row' })`
  ${grid}
  padding: 12px 16px; border-radius: 14px; font-size: 14px;
  &:hover { background: var(--surface-2); }
`;
export const TFoot = styled.div.attrs({ role: 'row' })`
  ${grid}
  padding: 14px 16px 2px; margin-top: 6px; border-top: 1px solid var(--border); font-size: 14px; font-weight: 600;
`;
export const Cell = styled.span.attrs({ role: 'cell' })<{ $right?: boolean }>`
  ${(p) => p.$right && css`text-align: right;`}
`;
/** First cell: tile + names. */
export const CellMain = styled.div.attrs({ role: 'cell' })`display: flex; align-items: center; gap: 12px; min-width: 0;`;
export const Names = styled.div`
  display: flex; flex-direction: column; gap: 2px; min-width: 0;
  & > b { font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  & > small { font-size: 12px; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
`;
