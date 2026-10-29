import { useState } from 'react';
import type { Transaction, TransactionsData } from '@shared/types';
import { errorMessage } from '@/lib/api';
import { groupColor } from '@/lib/categories';
import { brl, fmtDate, fmtDay } from '@/lib/format';
import { groupIcon, ICON, spendIcon } from '@/lib/icons';
import { showError } from '@/store';
import { CellMain, Chip, Names, Swatch, Tile, type Tone } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { changeCategory } from '../../actions';
import { EXCLUDED, METHODS, nice, type Computed } from '../../logic';
import * as Styled from './styles';

interface TxRowProps {
  t: Transaction;
  /** Where the groups and categories for the select come from (the month or the fetched range). */
  data: TransactionsData;
  c: Computed;
  month: string;
  /** Show full dates (the period spans several months). */
  wide: boolean;
}

export function TxRow({ t, data, c, month, wide }: TxRowProps) {
  const [pending, setPending] = useState<string | null>(null);
  const acc = c.accById.get(t.accountId);
  const m = METHODS[t.method] ?? METHODS.outros;
  const isIn = t.direction === 'in';
  const offAccount = !c.accountCounts(t.accountId);
  const notes = [
    t.kind,
    t.counterparty && t.counterparty !== t.description ? (isIn ? `de ${nice(t.counterparty)}` : `para ${nice(t.counterparty)}`) : null,
    t.excluded ? `não conta · ${EXCLUDED[t.excluded]}` : null,
    t.group && isIn && !t.excluded ? `${t.group.income ? 'receita' : t.group.offTotals ? 'retorno' : 'reembolso'} · ${t.group.name}` : null,
    t.installment ? `parcela ${t.installment}` : null,
    !t.kind && !t.counterparty && !t.excluded && !t.installment ? acc?.name : null,
  ].filter(Boolean).join(' · ');
  const offGroup = Boolean(t.group?.offTotals);
  const chip: [Tone, string] = t.status === 'PENDING' ? ['warn', 'Pendente'] : t.excluded ? ['neutral', 'Ignorada'] : offAccount || offGroup ? ['neutral', 'Fora do total'] : ['pos', 'Confirmada'];
  const muted = t.excluded || offAccount;
  const icon = t.group ? groupIcon(t.group.icon) : isIn ? ICON.receita : spendIcon(t.category.key);
  const gColor = t.group ? groupColor(c.groups, t.group.id) : undefined;
  const selected = t.group ? `group:${t.group.id}` : t.category.id;

  const change = async (value: string) => {
    setPending(value);
    try {
      await changeCategory(t, value, month);
    } catch (err) {
      showError(errorMessage(err));
    } finally {
      setPending(null);
    }
  };

  return (
    <Styled.Container $wide={wide}>
      <Styled.DateCell>{wide ? fmtDate(t.date) : fmtDay(t.date)}</Styled.DateCell>
      <CellMain>
        <Tile $size={38} $color={gColor}><Icon d={icon} /></Tile>
        <Names><b title={t.rawDescription}>{nice(t.description)}</b><small title={notes}>{notes}</small></Names>
      </CellMain>
      <div role="cell">
        <Styled.PlainSelect
          value={pending ?? selected} disabled={pending != null} $grouped={Boolean(t.group)}
          aria-label={`Grupo ou categoria de ${t.description}`} onChange={(e) => void change(e.target.value)}
        >
          <CategoryOptions data={data} t={t} />
        </Styled.PlainSelect>
      </div>
      <Styled.Method><Swatch as="span" $kind="round" $color={m.color} /><span>{m.short} · {acc?.name ?? acc?.connector ?? ''}</span></Styled.Method>
      <div role="cell"><Chip $tone={chip[0]}>{chip[1]}</Chip></div>
      <Styled.Amount $color={isIn && !muted ? 'pos' : muted ? 'muted' : undefined}>{isIn ? '+' : '−'}{brl(t.amount)}</Styled.Amount>
    </Styled.Container>
  );
}

// Category column: your groups first, then "+ Novo grupo", then Pluggy's categories.
function CategoryOptions({ data, t }: { data: TransactionsData; t: Transaction }) {
  const groups = data.groups ?? [];
  const cats = [...data.categories];
  if (!cats.some((o) => o.id === t.category.id)) cats.push(t.category);
  if (!cats.some((o) => o.id === 'outros')) cats.push({ id: 'outros', label: 'Outros', key: 'Other' });
  return <>
    {groups.length > 0 && <optgroup label="Meus grupos">{groups.map((g) => <option key={g.id} value={`group:${g.id}`}>{g.name}</option>)}</optgroup>}
    <option value="new-group">＋ Novo grupo…</option>
    {t.groupSource === 'manual' && <option value="auto">↺ Voltar ao automático</option>}
    <optgroup label="Categorias">{cats.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}</optgroup>
  </>;
}
