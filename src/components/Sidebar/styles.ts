import styled from 'styled-components';
import { media } from '@/styles/media';

export const Container = styled.aside`
  flex: 0 0 248px; padding: 24px 16px; background: var(--surface); border-right: 1px solid var(--border);
  display: flex; flex-direction: column; gap: 28px; position: sticky; top: 0; height: 100vh; overflow-y: auto;
  ${media.tablet} {
    position: static; height: auto; flex: none; flex-direction: row; flex-wrap: wrap; align-items: center; gap: 12px 20px;
    padding: 12px 16px; border-right: 0; border-bottom: 1px solid var(--border);
  }
`;

export const Brand = styled.div`display: flex; align-items: center; gap: 10px; padding: 0 8px;`;
export const BrandMark = styled.div`
  width: 36px; height: 36px; border-radius: 11px; background: var(--accent); color: var(--on-accent); display: grid; place-items: center;
`;
export const BrandName = styled.span`font-size: 19px; font-weight: 700; letter-spacing: -0.02em;`;

export const Nav = styled.nav`
  display: flex; flex-direction: column; gap: 4px;
  ${media.tablet} { flex-direction: row; flex-wrap: wrap; }
`;
export const NavTitle = styled.span`
  font-size: 12px; font-weight: 600; color: var(--muted); padding: 0 12px 6px; letter-spacing: .06em; text-transform: uppercase;
  ${media.tablet} { display: none; }
`;
export const NavLink = styled.a`
  display: flex; align-items: center; gap: 12px; height: 44px; padding: 0 12px; border-radius: 12px;
  font-size: 15px; font-weight: 500; color: var(--muted); text-decoration: none;
  &:hover { background: var(--surface-2); color: var(--text); }
  &[aria-current="page"] { color: var(--accent); background: var(--accent-soft); font-weight: 600; }
  ${media.tablet} { height: 40px; font-size: 14px; }
  ${media.phone} { padding: 0 10px; gap: 8px; svg { display: none; } }
`;

export const ConnBox = styled.div`
  margin-top: auto; border: 1px solid var(--border); border-radius: 18px; padding: 16px; display: flex; flex-direction: column; gap: 12px; background: var(--bg);
  ${media.tablet} { display: none; }
`;
export const ConnHead = styled.div`display: flex; justify-content: space-between; align-items: center; gap: 8px; font-size: 13px;`;
export const ConnRow = styled.a`display: flex; align-items: center; gap: 10px; font-size: 13px; color: inherit; text-decoration: none;`;
export const ConnName = styled.span`flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;`;
export const ConnStatus = styled.b<{ $tone: string }>`font-size: 12px; color: var(--${(p) => p.$tone});`;
