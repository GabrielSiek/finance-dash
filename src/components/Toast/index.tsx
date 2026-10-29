import styled from 'styled-components';
import { useStore } from '@/store';

const Container = styled.div`
  position: fixed; left: 50%; bottom: 24px; transform: translateX(-50%); z-index: 50; background: var(--text); color: var(--surface);
  padding: 10px 16px; border-radius: 12px; font-size: 14px; font-weight: 500; box-shadow: 0 8px 24px rgba(0, 0, 0, .2);
`;

export function Toast() {
  const toast = useStore((s) => s.toast);
  return <Container role="status" hidden={!toast}>{toast?.message}</Container>;
}
