import type { Account } from '@shared/types';
import { subtypeLabel } from '@/lib/categories';
import { brl } from '@/lib/format';
import { ICON } from '@/lib/icons';
import { ListRow, RowEnd, RowMain, Tile } from '@/components/ui';
import { CardHeader } from '@/components/CardHeader';
import { Icon } from '@/components/Icon';
import * as Styled from './styles';

export function AccountsList({ accounts }: { accounts: Account[] }) {
  return (
    <Styled.Container>
      <CardHeader title="Contas e cartões" sub="Saldos informados pelas instituições" />
      <div>
        {accounts.map((a) => (
          <ListRow key={a.id}>
            <Tile $size="sm"><Icon d={a.type === 'CREDIT' ? ICON.cartao : ICON.caixa} /></Tile>
            <RowMain><b>{a.name}</b><small>{subtypeLabel(a.subtype || a.type)} · {a.connector}</small></RowMain>
            <RowEnd>
              <span>{brl(a.balance)}</span>
              {a.type === 'CREDIT' && a.credit?.limit ? <small>limite {brl(a.credit.limit)}</small> : null}
            </RowEnd>
          </ListRow>
        ))}
      </div>
    </Styled.Container>
  );
}
