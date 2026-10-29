// Pluggy Connect: the widget that logs into a bank or broker and creates (or updates) an item.
import type { ConnectToken } from '@shared/types';
import { api, errorMessage } from '@/lib/api';
import { showError, toast, waitForSync } from '@/store';

export async function openConnect(itemId?: string) {
  showError('');
  try {
    const { accessToken, includeSandbox } = await api.post<ConnectToken>('/connect-token', itemId ? { itemId } : {});
    void new window.PluggyConnect({
      connectToken: accessToken,
      includeSandbox,
      ...(itemId ? { updateItem: itemId } : {}),
      onSuccess: async ({ item }) => {
        await api.post('/items', { itemId: item.id });
        toast('Conta conectada. Buscando dados…');
        await waitForSync([item.id]);
      },
      onError: (err) => showError(err?.message || 'Falha na conexão.'),
    }).init();
  } catch (err) {
    showError(errorMessage(err));
  }
}
