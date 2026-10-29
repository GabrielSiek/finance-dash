// App shell: sidebar, the page for the current route, and the toast.
import { useEffect } from 'react';
import styled from 'styled-components';
import { useRoute, type Route } from '@/lib/hooks';
import { useStore } from '@/store';
import { media } from '@/styles/media';
import { Sidebar } from '@/components/Sidebar';
import { PageSkeleton } from '@/components/Skeleton';
import { Toast } from '@/components/Toast';
import { SetupPage } from '@/pages/Setup';
import { InvestmentsPage } from '@/pages/Investments';
import { SpendingPage } from '@/pages/Spending';
import { AccountsPage } from '@/pages/Accounts';
import { SettingsPage } from '@/pages/Settings';

const Container = styled.div`
  min-height: 100vh; display: flex; align-items: stretch;
  ${media.tablet} { flex-direction: column; }
`;
const Main = styled.main`
  flex: 1; min-width: 0; padding: 28px clamp(16px, 3vw, 36px) 56px;
  ${media.phone} { padding: 20px 16px 48px; }
`;

function Content({ route }: { route: Route }) {
  const status = useStore((s) => s.status);
  const loaded = useStore((s) => Boolean(s.portfolio));
  if (status && (!status.configured || status.authError)) return <SetupPage />;
  if (!loaded) return <PageSkeleton route={route} />;
  switch (route) {
    case 'investimentos':
    case 'metas': return <InvestmentsPage focusGoals={route === 'metas'} />;
    case 'gastos': return <SpendingPage />;
    case 'contas': return <AccountsPage />;
    case 'configuracoes': return <SettingsPage />;
  }
}

export function App() {
  const route = useRoute();
  // A new page starts at the top; Metas scrolls itself to the goals section.
  useEffect(() => { if (route !== 'metas') window.scrollTo(0, 0); }, [route]);
  return (
    <Container>
      <Sidebar route={route} />
      <Main><Content route={route} /></Main>
      <Toast />
    </Container>
  );
}
