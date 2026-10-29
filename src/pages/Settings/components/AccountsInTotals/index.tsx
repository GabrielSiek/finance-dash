import { useState } from 'react';
import type { Settings } from '@shared/types';
import { api, errorMessage } from '@/lib/api';
import { subtypeLabel } from '@/lib/categories';
import { ICON } from '@/lib/icons';
import { clearSpending, setSettings, showError, toast, useStore } from '@/store';
import { Chip, Tile, ToggleRow } from '@/components/ui';
import { CardHeader } from '@/components/CardHeader';
import { Icon } from '@/components/Icon';
import * as Styled from './styles';

export function AccountsInTotals() {
  const conns = useStore((s) => s.portfolio?.connections) ?? [];
  const saved = useStore((s) => s.settings.excludedAccounts);
  // The ids being saved, so the box flips right away.
  const [pending, setPending] = useState<string[] | null>(null);
  const accounts = conns.flatMap((c) => c.accounts);
  if (!accounts.length) return null;
  const excluded = new Set(pending ?? saved);

  const toggle = async (id: string, checked: boolean) => {
    const ids = accounts.filter((a) => (a.id === id ? !checked : excluded.has(a.id))).map((a) => a.id);
    setPending(ids);
    try {
      setSettings(await api.put<Settings>('/settings', { excludedAccounts: ids }));
      clearSpending();
      toast(checked ? 'Conta volta a contar nos totais' : 'Conta fora dos totais (continua aparecendo)');
    } catch (err) {
      showError(errorMessage(err));
    } finally {
      setPending(null);
    }
  };

  return (
    <Styled.Container>
      <Styled.Head>
        <CardHeader title="Contas nos totais" sub="Desmarque para continuar vendo os gastos de uma conta ou cartão sem somá-los aos totais" />
      </Styled.Head>
      {accounts.map((a) => (
        <ToggleRow key={a.id}>
          <input type="checkbox" checked={!excluded.has(a.id)} onChange={(e) => void toggle(a.id, e.target.checked)} />
          <Tile $size="sm"><Icon d={a.type === 'CREDIT' ? ICON.cartao : ICON.caixa} /></Tile>
          <Styled.Name>
            <b>{a.name}{a.number ? ` · ${String(a.number).slice(-4)}` : ''}</b>
            <small>{subtypeLabel(a.subtype || a.type)} · {a.connector}</small>
          </Styled.Name>
          <Chip $tone={excluded.has(a.id) ? 'neutral' : 'pos'}>{excluded.has(a.id) ? 'Fora dos totais' : 'Conta nos totais'}</Chip>
        </ToggleRow>
      ))}
    </Styled.Container>
  );
}
