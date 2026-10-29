import styled from 'styled-components';

export const Container = styled.div`
  display: flex; flex-wrap: wrap; align-items: center; gap: 14px; padding: 14px 16px; border: 1px solid var(--border); border-radius: 18px; background: var(--bg);
`;
export const Logo = styled.img`width: 36px; height: 36px; border-radius: 10px; object-fit: contain; background: #fff;`;
export const Info = styled.div`
  flex: 1; min-width: 200px; display: flex; flex-direction: column; gap: 2px;
  & > b { font-weight: 600; }
  & > small { font-size: 12px; color: var(--muted); }
`;
export const Buttons = styled.div`display: flex; gap: 8px;`;
