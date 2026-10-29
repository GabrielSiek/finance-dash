import styled from 'styled-components';
import { media } from '@/styles/media';
import { Button, Input, Pills, Select } from '@/components/ui';
import { Icon } from '@/components/Icon';

export const Summary = styled.summary`
  display: flex; align-items: center; gap: 12px; padding: 14px 0; cursor: pointer; list-style: none;
  &::-webkit-details-marker { display: none; }
`;
export const Titles = styled.div`
  flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px;
  & > b { font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  & > small { font-size: 12px; color: var(--muted); }
`;
export const Chevron = styled(Icon)`color: var(--muted); flex-shrink: 0; transition: transform .15s ease;`;

export const Container = styled.details`
  border-top: 1px solid var(--border);
  &[open] > ${Summary} ${Chevron} { transform: rotate(180deg); }
`;

export const Body = styled.div`
  display: grid; grid-template-columns: minmax(160px, 1fr) 160px minmax(240px, 2fr) auto; gap: 12px; align-items: start; padding: 4px 0 18px;
  ${media.narrow} { grid-template-columns: 1fr; }
`;
export const Remove = styled(Button)`
  margin-top: 23px;
  ${media.narrow} { margin-top: 0; justify-self: start; }
`;
export const IconSelect = styled(Select)`width: 100%;`;
export const Patterns = styled(Input)`
  min-height: 88px; padding: 10px 14px; height: auto; resize: vertical; font: inherit; font-size: 13px; line-height: 1.5;
`;
export const Hint = styled.span`color: var(--muted); font-weight: 400;`;
export const Strong = styled.b`font-weight: 600;`;

export const Cats = styled.details`display: flex; flex-direction: column; gap: 6px; font-size: 13px; grid-column: 1 / -1;`;
export const CatsSummary = styled.summary`cursor: pointer; font-weight: 600;`;
export const CatPills = styled(Pills)`margin-top: 10px;`;
