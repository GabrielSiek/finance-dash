import { useState, type FormEvent } from 'react';
import type { Connection as ConnectionData } from '@shared/types';
import { api, errorMessage } from '@/lib/api';
import { plural } from '@/lib/format';
import { reload, showError } from '@/store';
import { Button, Empty } from '@/components/ui';
import { CardHeader } from '@/components/CardHeader';
import { Connection } from '../Connection';
import * as Styled from './styles';

export function ConnectionsCard({ connections }: { connections: ConnectionData[] }) {
  const [itemId, setItemId] = useState('');

  const add = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/items', { itemId: itemId.trim() });
      await reload();
    } catch (err) { showError(errorMessage(err)); }
  };

  return (
    <Styled.Container>
      <CardHeader title="Conexões" sub={plural(connections.length, 'conexão', 'conexões')} />
      <Styled.List>
        {connections.length
          ? connections.map((c) => <Connection key={c.id} connection={c} />)
          : <Empty>Nenhuma conexão ainda. Clique em <b>Conectar conta</b>. Para testar, escolha <b>Pluggy Bank</b> e entre com <code>user-ok</code> / <code>password-ok</code>.</Empty>}
      </Styled.List>
      <Styled.AddItem onSubmit={add}>
        <Styled.AddField>
          <label htmlFor="item-id">Já tem um item ID (ex.: criado no dashboard da Pluggy)?</label>
          <Styled.ItemInput
            id="item-id" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" pattern="[0-9a-fA-F-]{36}" required
            value={itemId} onChange={(e) => setItemId(e.target.value)}
          />
        </Styled.AddField>
        <Button type="submit">Adicionar</Button>
      </Styled.AddItem>
    </Styled.Container>
  );
}
