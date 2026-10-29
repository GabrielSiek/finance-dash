// "Contas conectadas": connect, sync, reconnect or remove institutions.
import { ICON } from '@/lib/icons';
import { useStore } from '@/store';
import { Button } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { Page } from '@/components/Page';
import { openConnect } from './connect';
import { ConnectionsCard } from './components/ConnectionsCard';
import { AccountsList } from './components/AccountsList';

export function AccountsPage() {
  const conns = useStore((s) => s.portfolio?.connections) ?? [];
  const accounts = conns.flatMap((c) => c.accounts);
  return (
    <Page
      title="Contas conectadas"
      sub="Bancos e corretoras via Pluggy"
      actions={<Button onClick={() => void openConnect()}><Icon d={ICON.plus} />Conectar conta</Button>}
    >
      <ConnectionsCard connections={conns} />
      {accounts.length > 0 && <AccountsList accounts={accounts} />}
    </Page>
  );
}
