import { brl } from '@/lib/format';
import { groupIcon, ICON } from '@/lib/icons';
import { Button, Chip, Empty, Muted, RowEnd, RowMain, Tile } from '@/components/ui';
import { CardHeader } from '@/components/CardHeader';
import { Icon } from '@/components/Icon';
import { groupTotals, type Computed } from '../../logic';
import * as Styled from './styles';

export function Groups({ c, selected, onFilter }: { c: Computed; selected: string; onFilter: (key: string) => void }) {
  const totals = groupTotals(c);
  return (
    <Styled.Container>
      <CardHeader title="Meus grupos" sub="Pagamentos menos o que você recebeu de volta">
        <Button as="a" $size="sm" href="#/configuracoes"><Icon d={ICON.edit} size={16} />Gerenciar</Button>
      </CardHeader>
      {totals.length ? <div>{totals.map((g) => (
        <Styled.Row key={g.id} aria-pressed={selected === `group:${g.id}`} title={`Ver as transações de ${g.name}`} onClick={() => onFilter(`group:${g.id}`)}>
          <Tile $size="sm" $color={g.color}><Icon d={groupIcon(g.icon)} /></Tile>
          <RowMain>
            <b>{g.name}{g.excludeFromTotals && <> <Chip $tone="neutral" $size="xs">fora dos totais</Chip></>}</b>
            <small>{[
              g.n || g.nIn ? `${brl(g.out)} ${g.excludeFromTotals ? 'saíram' : 'pagos'}${g.received ? ` · ${brl(g.received)} ${g.excludeFromTotals ? 'voltaram' : 'recebidos'}` : ''}` : '',
              g.nOff ? `${brl(g.offOut)} fora dos totais` : '',
            ].filter(Boolean).join(' · ') || 'Nada neste mês'}</small>
          </RowMain>
          {!g.n && !g.nIn && g.nOff
            ? <RowEnd><Muted>{brl(g.offOut)}</Muted><small>fora dos totais</small></RowEnd>
            : <RowEnd><span>{g.net < 0 ? '+' : ''}{brl(Math.abs(g.net))}</span><small>{g.net < 0 ? (g.income ? 'recebido' : 'recebeu a mais') : 'líquido'}</small></RowEnd>}
        </Styled.Row>
      ))}</div>
        : <Empty>
          Agrupe gastos parecidos (ex.: <b>Cinema</b> = GNC, Ingresso.com, Cinemark) ou de uma atividade com amigos (o Pix que eles te mandam desconta do total).<br />
          <Button as="a" $size="sm" href="#/configuracoes"><Icon d={ICON.plus} size={16} />Criar grupo</Button>
        </Empty>}
    </Styled.Container>
  );
}
