import type { Settings, SpendCategory } from '@shared/types';
import { api, errorMessage } from '@/lib/api';
import { clearSpending, getState, setSettings, showError, useStore } from '@/store';
import { Button, Empty, ListRow, RowMain } from '@/components/ui';
import { CardHeader } from '@/components/CardHeader';
import * as Styled from './styles';

export function Rules({ categories }: { categories: SpendCategory[] }) {
  const txRules = useStore((s) => s.settings.txRules);
  const rules = Object.entries(txRules);
  const catLabel = new Map(categories.map((c) => [c.id, c.label]));

  const remove = async (key: string) => {
    try {
      const next = await api.post<Settings['txRules']>('/tx-rules', { key, categoryId: null });
      setSettings({ ...getState().settings, txRules: next });
      clearSpending();
    } catch (err) { showError(errorMessage(err)); }
  };

  return (
    <Styled.Container>
      <CardHeader title="Regras de categoria" sub="Criadas quando você muda a categoria de uma transação" />
      {rules.length
        ? rules.map(([key, id]) => (
          <ListRow key={key}>
            <RowMain><b>“{key}”</b><small>sempre como {catLabel.get(id) ?? (id === 'outros' ? 'Outros' : id)}</small></RowMain>
            <Button $size="sm" onClick={() => void remove(key)}>Remover</Button>
          </ListRow>
        ))
        : <Empty>Nenhuma regra ainda. Em Gastos, mude a categoria de uma transação para criar uma.</Empty>}
    </Styled.Container>
  );
}
