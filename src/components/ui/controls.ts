// Buttons, segmented controls, pills, chips and selects.
import styled, { css, keyframes } from 'styled-components';
import { media } from '@/styles/media';

export type Tone = 'pos' | 'neg' | 'warn' | 'accent' | 'neutral';
export const toneOf = (v: number): Tone => (v > 0 ? 'pos' : v < 0 ? 'neg' : 'neutral');

const spin = keyframes`to { transform: rotate(360deg); }`;

export const Button = styled.button<{ $variant?: 'primary'; $size?: 'sm'; $icon?: boolean; $spinning?: boolean }>`
  height: 44px; padding: 0 16px; border-radius: 14px; border: 1px solid var(--border); background: var(--surface); color: var(--text);
  font-size: 14px; font-weight: 600; display: inline-flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer; white-space: nowrap;
  text-decoration: none;
  &:hover { background: var(--surface-2); color: var(--text); }
  &:disabled { opacity: .55; cursor: default; }
  ${(p) => p.$variant === 'primary' && css`
    background: var(--accent); border-color: transparent; color: var(--on-accent);
    &:hover { filter: brightness(1.07); background: var(--accent); color: var(--on-accent); }
  `}
  ${(p) => p.$size === 'sm' && css`height: 36px; padding: 0 12px; border-radius: 12px; font-size: 13px;`}
  ${(p) => p.$icon && css`width: 44px; padding: 0;`}
  ${(p) => p.$spinning && css`svg { animation: ${spin} 1s linear infinite; }`}
`;

/** Segmented control: buttons with aria-pressed. */
export const Seg = styled.div`
  display: inline-flex; gap: 4px; padding: 4px; background: var(--surface-2); border-radius: 14px;
`;
export const SegButton = styled.button.attrs({ type: 'button' })`
  border: 0; height: 36px; min-width: 52px; padding: 0 12px; border-radius: 10px; font-size: 13px; font-weight: 600; cursor: pointer;
  background: transparent; color: var(--muted);
  &[aria-pressed="true"] { background: var(--surface); color: var(--text); box-shadow: 0 1px 3px rgba(16, 18, 26, .14); }
`;

export const Pills = styled.div`display: flex; flex-wrap: wrap; gap: 8px;`;
export const Pill = styled.button`
  height: 36px; padding: 0 14px; border-radius: 999px; font-size: 13px; font-weight: 600; cursor: pointer;
  display: inline-flex; align-items: center; gap: 6px; background: transparent; color: var(--text); border: 1px solid var(--border);
  &[aria-pressed="true"] { background: var(--text); color: var(--surface); border-color: var(--text); }
`;
export const PillCount = styled.span`opacity: .7; font-weight: 500;`;

const TONES: Record<Tone, [string, string]> = {
  pos: ['--pos-soft', '--pos'],
  neg: ['--neg-soft', '--neg'],
  warn: ['--warn-soft', '--warn'],
  accent: ['--accent-soft', '--accent'],
  neutral: ['--surface-2', '--muted'],
};

/** Small rounded label. $size 'sm' and 'xs' are the compact ones used inside rows. */
export const Chip = styled.span<{ $tone?: Tone; $size?: 'sm' | 'xs' }>`
  font-size: 12px; font-weight: 600; padding: 3px 9px; border-radius: 999px; white-space: nowrap; display: inline-block;
  background: var(${(p) => TONES[p.$tone ?? 'neutral'][0]}); color: var(${(p) => TONES[p.$tone ?? 'neutral'][1]});
  ${(p) => p.$size === 'sm' && css`font-size: 11px; padding: 2px 8px;`}
  ${(p) => p.$size === 'xs' && css`font-size: 11px; padding: 1px 7px;`}
`;

/** Text colored by sign (the old .pos-t / .neg-t). */
export const Toned = styled.span<{ $tone: 'pos' | 'neg' | 'warn' }>`color: var(--${(p) => p.$tone});`;
export const Muted = styled.span`color: var(--muted);`;

export const Select = styled.select`
  height: 44px; padding: 0 36px 0 14px; border-radius: 14px; border: 1px solid var(--border); background: var(--surface); color: var(--text);
  font-size: 14px; font-weight: 500; cursor: pointer; appearance: none; max-width: 100%;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%235C6270' stroke-width='2' stroke-linecap='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat; background-position: right 12px center; background-size: 16px;
`;

export const SearchBox = styled.label<{ $grow?: boolean }>`
  display: flex; align-items: center; gap: 8px; height: 44px; padding: 0 14px; border-radius: 14px;
  background: var(--surface); border: 1px solid var(--border); color: var(--muted); width: 240px; max-width: 100%;
  ${(p) => p.$grow && css`width: auto; flex: 1 1 240px;`}
  ${media.phone} { width: 100%; }
`;
export const SearchInput = styled.input.attrs({ type: 'search' })`
  border: 0; outline: 0; background: transparent; color: var(--text); font-size: 14px; flex: 1; min-width: 0;
`;

export const SrOnly = styled.span`
  position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap;
`;
