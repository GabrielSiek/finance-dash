import type { Group, Settings, Transaction } from '@shared/types';
import { api } from '@/lib/api';
import { reloadSpending, setSettings, toast } from '@/store';

/** Move a transaction to a group (or a new one), back to automatic, or to a category (as a rule). */
export async function changeCategory(t: Transaction, value: string, month: string) {
  if (value === 'new-group') {
    const name = prompt('Nome do novo grupo (ex.: Basquete, Cinema):');
    if (!name?.trim()) return;
    const group = await api.post<Group>('/groups', { name: name.trim() });
    await api.post('/tx-group', { txId: t.id, groupId: group.id });
    toast(`Grupo “${group.name}” criado. Adicione palavras-chave em Configurações para agrupar automaticamente.`);
  } else if (value === 'auto') {
    await api.post('/tx-group', { txId: t.id, groupId: null });
  } else if (value.startsWith('group:')) {
    await api.post('/tx-group', { txId: t.id, groupId: value.slice(6) });
  } else {
    if (t.group) await api.post('/tx-group', { txId: t.id, groupId: 'none' });
    if (value !== t.category.id) await api.post('/tx-rules', { key: t.ruleKey, categoryId: value });
  }
  setSettings(await api.get<Settings>('/settings'));
  await reloadSpending(month); // groups and rules apply to every month
}
