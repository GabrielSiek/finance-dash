import { useState } from 'react';
import { api, errorMessage } from '@/lib/api';
import { ASSET_CLASSES, CATEGORIES, cat, soft } from '@/lib/categories';
import { brl, fmtDate, money, num, pct, signedBrl, signedPct } from '@/lib/format';
import { ICON } from '@/lib/icons';
import { reload, showError } from '@/store';
import { Bar, BarFill, Cell, CellMain, Chip, Muted, Names, Tile, Toned, toneOf } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { isGroup, type Holding, type TableRow } from '../../derive';
import * as Styled from './styles';

const CARET = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%235C6270' stroke-width='2.5' stroke-linecap='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")";

const SOURCE_HINT: Record<string, string> = {
  pluggy: 'Classe informada pela instituição — altere se estiver errada.',
  ticker: 'Classe deduzida pelo ticker — altere se estiver errada.',
  name: 'Classe deduzida pelo nome — altere se estiver errada.',
  manual: 'Classe definida por você.',
};

interface Props {
  row: TableRow;
  /** A lot shown under its expanded group. */
  child?: boolean;
  /** Largest balance in the table, for the weight bars. */
  maxW: number;
  open?: string[];
  onToggle?: (group: string) => void;
}

export function HoldingRow({ row: i, child = false, maxW, open = [], onToggle }: Props) {
  const [pending, setPending] = useState<string | null>(null);
  const c = cat(i.category);
  const group = isGroup(i) ? i : null;
  const lot: Holding | null = isGroup(i) ? null : i;
  const isOpen = group != null && open.includes(group.group);
  const title = child && i.dueDate ? `Vence em ${fmtDate(i.dueDate)}` : i.title;
  const sub = child && lot ? (lot.cost != null ? `Aplicado ${brl(lot.cost)}` : lot.rateLabel) : i.sub;
  const keys = group ? group.categoryKeys : [lot!.categoryKey];
  const dot = `radial-gradient(circle, var(${c.color}) 0 3.5px, transparent 4px)`;

  const changeClass = async (category: string) => {
    setPending(category);
    try {
      // A grouped row carries every lot's key; save them one by one so the overrides file isn't written concurrently.
      for (const key of keys) await api.post('/categories', { key, category });
      await reload();
    } catch (err) {
      showError(errorMessage(err));
    } finally {
      setPending(null);
    }
  };

  return (
    <>
      <Styled.Container $group={Boolean(group)} $child={child} onClick={group ? () => onToggle?.(group.group) : undefined}>
        <CellMain>
          {group && (
            <Styled.Expander aria-expanded={isOpen} aria-label={`${isOpen ? 'Recolher' : 'Expandir'} ${i.title}`}>
              <Icon d={ICON.right} size={16} />
            </Styled.Expander>
          )}
          {!child && <Tile $bg={soft(c.color)}>{i.short}</Tile>}
          <Names><b title={group ? group.hint : lot!.name}>{title}</b><small>{sub}</small></Names>
        </CellMain>
        <Cell as="div">
          {!child && (
            <Styled.ClassSelect
              value={pending ?? i.category}
              disabled={pending != null}
              aria-label={`Classe de ${i.title}`}
              title={SOURCE_HINT[i.categorySource] ?? ''}
              style={{ backgroundImage: `${dot}, ${CARET}` }}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => void changeClass(e.target.value)}
            >
              {ASSET_CLASSES.map((k) => <option key={k} value={k}>{CATEGORIES[k].label}</option>)}
            </Styled.ClassSelect>
          )}
        </Cell>
        <Cell $right>{lot && lot.quantity != null && lot.category !== 'RENDA_FIXA' ? num(lot.quantity, 4) : '—'}</Cell>
        <Styled.MutedCell $right>{lot?.avgPrice != null ? money(lot.avgPrice, lot.currencyCode) : '—'}</Styled.MutedCell>
        <Cell $right>{lot && lot.value != null && lot.category !== 'RENDA_FIXA' ? money(lot.value, lot.currencyCode) : '—'}</Cell>
        <Styled.MutedCell $right>{i.cost != null ? money(i.cost, i.currencyCode) : '—'}</Styled.MutedCell>
        <Styled.BalanceCell $right>{money(i.balance, i.currencyCode)}</Styled.BalanceCell>
        <Styled.ResultCell>
          {i.amountProfit != null
            ? (
              <>
                <Toned as="b" $tone={i.amountProfit >= 0 ? 'pos' : 'neg'}>{signedBrl(i.amountProfit)}</Toned>
                {i.returnPct != null && <Chip $tone={toneOf(i.returnPct)} $size="xs">{signedPct(i.returnPct)}</Chip>}
              </>
            )
            : <Muted>—</Muted>}
        </Styled.ResultCell>
        <Styled.WeightCell>
          <Bar $size="thin"><BarFill $value={i.balance / maxW} $color={c.color} /></Bar>
          <span>{pct(i.share)}</span>
        </Styled.WeightCell>
      </Styled.Container>
      {group && isOpen && group.lots.map((l) => <HoldingRow key={l.id} row={l} child maxW={maxW} />)}
    </>
  );
}
