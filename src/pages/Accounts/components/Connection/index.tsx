import { useState } from 'react';
import type { Connection as ConnectionData } from '@shared/types';
import { api, errorMessage } from '@/lib/api';
import { connectionStatus } from '@/lib/categories';
import { plural } from '@/lib/format';
import { ICON } from '@/lib/icons';
import { reload, showError, toast, waitForSync } from '@/store';
import { Button, Chip, Tile } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { openConnect } from '../../connect';
import * as Styled from './styles';

type Action = 'refresh' | 'reconnect' | 'remove';

export function Connection({ connection: c }: { connection: ConnectionData }) {
  const [busy, setBusy] = useState<Action | null>(null);
  const [tone, label] = connectionStatus(c);
  const needsLogin = ['LOGIN_ERROR', 'WAITING_USER_INPUT', 'OUTDATED'].includes(c.status);

  const run = async (action: Action) => {
    setBusy(action);
    try {
      if (action === 'refresh') {
        await api.post(`/items/${c.id}/refresh`);
        toast('Sincronização solicitada');
        await waitForSync([c.id]);
      } else if (action === 'reconnect') {
        await openConnect(c.id);
      } else {
        if (!confirm('Remover esta conexão do painel? (Ela continua na sua conta Pluggy.)')) return;
        await api.delete(`/items/${c.id}`);
        await reload();
      }
    } catch (err) {
      showError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const main: Action = needsLogin ? 'reconnect' : 'refresh';
  return (
    <Styled.Container>
      {c.connectorImage ? <Styled.Logo src={c.connectorImage} alt="" /> : <Tile><Icon d={ICON.caixa} /></Tile>}
      <Styled.Info>
        <b>
          {c.connector}
          {c.via && c.via !== c.connector && <> <Chip $tone="neutral">via {c.via}</Chip></>}
          {c.isSandbox && <> <Chip $tone="neutral">sandbox</Chip></>}
        </b>
        <small>
          {c.lastUpdatedAt ? `Sincronizado ${new Date(c.lastUpdatedAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })} · ` : ''}
          {plural(c.investments.length, 'investimento', 'investimentos')} · {plural(c.accounts.length, 'conta', 'contas')}
          {c.error ? ` · ${c.error}` : ''}
        </small>
      </Styled.Info>
      <Chip $tone={tone}>{label}</Chip>
      <Styled.Buttons>
        <Button $size="sm" disabled={busy === main} onClick={() => void run(main)}>{needsLogin ? 'Reconectar' : 'Sincronizar'}</Button>
        <Button $size="sm" disabled={busy === 'remove'} onClick={() => void run('remove')} title="Remover deste painel (continua na Pluggy)">Remover</Button>
      </Styled.Buttons>
    </Styled.Container>
  );
}
