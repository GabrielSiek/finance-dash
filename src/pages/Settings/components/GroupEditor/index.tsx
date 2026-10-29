import { useState, type ChangeEvent } from 'react';
import type { SpendCategory } from '@shared/types';
import type { ColorVar } from '@/lib/categories';
import { GROUP_ICON_OPTIONS, ICON, groupIcon } from '@/lib/icons';
import { Chip, Field, Input, Muted, Pill, SrOnly, Tile, ToggleRow } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { groupMeta, parsePatterns, type DraftGroup } from '../../helpers';
import * as Styled from './styles';

interface GroupEditorProps {
  group: DraftGroup;
  color: ColorVar;
  /** Pluggy's top-level categories, to take whole. */
  categories: SpendCategory[];
  /** Focus the name (a group just added). */
  autoFocus: boolean;
  onChange: (patch: Partial<DraftGroup>) => void;
  onRemove: () => void;
}

export function GroupEditor({ group: gr, color, categories, autoFocus, onChange, onRemove }: GroupEditorProps) {
  // Starts open when the group already takes whole categories; after that it's up to you.
  const [catsOpen] = useState(gr.categories.length > 0);
  const id = gr.uid;
  const toggleCat = (cid: string, on: boolean) => onChange({ categories: on ? [...gr.categories, cid] : gr.categories.filter((c) => c !== cid) });

  return (
    <Styled.Container
      data-uid={gr.uid}
      open={gr.open}
      onToggle={(e) => { if (e.target === e.currentTarget && e.currentTarget.open !== gr.open) onChange({ open: e.currentTarget.open }); }}
    >
      <Styled.Summary>
        <Tile $size="sm" $color={color}><Icon d={groupIcon(gr.icon)} /></Tile>
        <Styled.Titles>
          <b>{gr.name || 'Novo grupo'}</b>
          <small>{groupMeta({ patterns: parsePatterns(gr.patternsText), categories: gr.categories })}</small>
        </Styled.Titles>
        {gr.income && <Chip $tone="pos">Receita</Chip>}
        {gr.excludeFromTotals && <Chip $tone="neutral">Fora dos totais</Chip>}
        <Styled.Chevron d={ICON.chevronDown} />
      </Styled.Summary>
      <Styled.Body>
        <Field>
          <label htmlFor={`gn-${id}`}>Nome</label>
          <Input
            id={`gn-${id}`} value={gr.name} placeholder="Ex.: Basquete" maxLength={40} required autoFocus={autoFocus}
            onChange={(e) => onChange({ name: e.target.value })}
          />
        </Field>
        <Field>
          <label htmlFor={`gi-${id}`}>Ícone</label>
          <Styled.IconSelect id={`gi-${id}`} value={gr.icon} onChange={(e) => onChange({ icon: e.target.value })}>
            {GROUP_ICON_OPTIONS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </Styled.IconSelect>
        </Field>
        <Field>
          <label htmlFor={`gp-${id}`}>Palavras-chave e nomes <Styled.Hint>(um por linha)</Styled.Hint></label>
          <Styled.Patterns
            as="textarea" id={`gp-${id}`} value={gr.patternsText}
            placeholder={gr.categories.length ? 'Nenhuma — este grupo usa categorias inteiras' : 'Uma palavra-chave ou nome por linha'}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => onChange({ patternsText: e.target.value })}
          />
          <small>Encontra a palavra inteira, sem diferenciar maiúsculas ou acentos.</small>
        </Field>
        <Styled.Remove $size="sm" type="button" onClick={onRemove} aria-label={`Remover grupo ${gr.name}`}>Remover</Styled.Remove>
        <ToggleRow $flush>
          <input type="checkbox" checked={!gr.excludeFromTotals} onChange={(e) => onChange({ excludeFromTotals: !e.target.checked })} />
          <span><Styled.Strong>Somar nos totais de Gastos e Saldo</Styled.Strong> <Muted>— desmarque para só acompanhar o grupo (ex.: Investimentos)</Muted></span>
        </ToggleRow>
        <ToggleRow $flush>
          <input type="checkbox" checked={gr.income} onChange={(e) => onChange({ income: e.target.checked })} />
          <span><Styled.Strong>Grupo de receita</Styled.Strong> <Muted>— o que entra conta como Receitas, não como reembolso (ex.: Salário)</Muted></span>
        </ToggleRow>
        {categories.length > 0 && (
          <Styled.Cats open={catsOpen}>
            <Styled.CatsSummary>
              Incluir categorias inteiras{gr.categories.length ? ` (${gr.categories.length})` : ''}{' '}
              <Styled.Hint>— opcional; palavras-chave de outros grupos têm prioridade</Styled.Hint>
            </Styled.CatsSummary>
            <Styled.CatPills>
              {categories.map((c) => {
                const on = gr.categories.includes(c.id);
                return (
                  <Pill as="label" key={c.id} aria-pressed={on}>
                    <SrOnly as="input" type="checkbox" value={c.id} checked={on} onChange={() => toggleCat(c.id, !on)} />
                    {c.label}
                  </Pill>
                );
              })}
            </Styled.CatPills>
          </Styled.Cats>
        )}
      </Styled.Body>
    </Styled.Container>
  );
}
