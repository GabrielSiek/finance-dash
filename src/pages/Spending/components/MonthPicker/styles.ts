import styled from 'styled-components';

export const Container = styled.div`
  display: flex; align-items: center; gap: 4px; height: 44px; padding: 0 4px; border-radius: 14px; background: var(--surface); border: 1px solid var(--border);
`;

export const Step = styled.button.attrs({ type: 'button' })`
  width: 36px; height: 36px; border: 0; border-radius: 10px; background: transparent; color: var(--text); display: grid; place-items: center; cursor: pointer;
  &:hover:not(:disabled) { background: var(--surface-2); }
  &:disabled { opacity: .35; cursor: default; }
`;

export const Label = styled.span`
  font-size: 14px; font-weight: 600; padding: 0 8px; white-space: nowrap; min-width: 140px; text-align: center;
`;
