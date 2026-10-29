// Form fields (Configurações, Contas conectadas, transaction filters).
import styled, { css } from 'styled-components';

export const FormGrid = styled.div`display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px;`;

export const Field = styled.div`
  display: flex; flex-direction: column; gap: 6px; font-size: 13px;
  & > label { font-weight: 600; }
  & > small { color: var(--muted); font-size: 12px; }
`;

export const Input = styled.input<{ $pre?: boolean; $suf?: boolean }>`
  height: 44px; padding: 0 14px; border-radius: 12px; border: 1px solid var(--border); background: var(--bg); color: var(--text); font-size: 14px; width: 100%;
  &:focus { outline: 2px solid var(--accent); outline-offset: -1px; }
  ${(p) => p.$pre && css`padding-left: 40px;`}
  ${(p) => p.$suf && css`padding-right: 34px;`}
`;

/** Wraps an Input with a fixed prefix ("R$") or suffix ("%"). */
export const InputAffix = styled.div`position: relative;`;
const affix = css`position: absolute; top: 50%; transform: translateY(-50%); color: var(--muted); font-size: 14px; pointer-events: none;`;
export const Prefix = styled.span`${affix} left: 14px;`;
export const Suffix = styled.span`${affix} right: 14px;`;

export const FormActions = styled.div`display: flex; flex-wrap: wrap; align-items: center; gap: 12px; justify-content: flex-end;`;
export const Saved = styled.span`font-size: 13px; color: var(--pos);`;

/** A checkbox row: <ToggleRow><input type="checkbox" />…</ToggleRow>. */
export const ToggleRow = styled.label<{ $flush?: boolean }>`
  display: flex; align-items: center; gap: 12px; padding: 12px 0; border-top: 1px solid var(--border); cursor: pointer;
  & > input { width: 20px; height: 20px; accent-color: var(--accent); flex-shrink: 0; }
  ${(p) => p.$flush && css`grid-column: 1 / -1; border-top: 0; padding: 0;`}
`;
