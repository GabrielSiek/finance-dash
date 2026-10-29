import { useMemo, useRef, type FormEvent } from 'react';
import type { Settings, SpendCategory } from '@shared/types';
import { api, errorMessage } from '@/lib/api';
import { groupColor } from '@/lib/categories';
import { useSessionState } from '@/lib/hooks';
import { ICON } from '@/lib/icons';
import { clearSpending, setSettings, showError, toast, useStore } from '@/store';
import { Button, Empty, FormActions } from '@/components/ui';
import { CardHeader } from '@/components/CardHeader';
import { Icon } from '@/components/Icon';
import { fromDraft, newDraftGroup, toDraft, type DraftGroup, type GroupDraft } from '../../helpers';
import { GroupEditor } from '../GroupEditor';
import * as Styled from './styles';

export function GroupsForm({ categories }: { categories: SpendCategory[] }) {
  const savedGroups = useStore((s) => s.settings.groups);
  const savedJson = JSON.stringify(savedGroups);
  // Keyed by the JSON so equal lists keep their draft keys (and open state).
  const fresh = useMemo<GroupDraft>(() => ({ base: savedJson, groups: savedGroups.map(toDraft) }), [savedJson]);
  const [draft, setDraft] = useSessionState<GroupDraft | null>('settings.groupDraft', null);
  const groups = (draft?.base === savedJson ? draft : fresh).groups;
  const justAdded = useRef<string | null>(null);

  const update = (fn: (list: DraftGroup[]) => DraftGroup[]) =>
    setDraft((d) => ({ base: savedJson, groups: fn((d?.base === savedJson ? d : fresh).groups) }));
  const patch = (uid: string, p: Partial<DraftGroup>) => update((list) => list.map((g) => (g.uid === uid ? { ...g, ...p } : g)));

  const add = () => {
    const gr = newDraftGroup();
    justAdded.current = gr.uid;
    update((list) => [...list, gr]);
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    try {
      setSettings(await api.put<Settings>('/settings', { groups: groups.map(fromDraft) }));
      setDraft(null);
      clearSpending();
      showError('');
      toast('Grupos salvos');
    } catch (err) { showError(errorMessage(err)); }
  };

  const ids = groups.map((g) => ({ id: g.id ?? '' }));
  return (
    <Styled.Container
      as="form"
      onSubmit={save}
      // Expand a collapsed group whose required name is empty so the browser can point at it.
      onInvalidCapture={(e) => { const box = (e.target as HTMLElement).closest('details[data-uid]'); if (box instanceof HTMLDetailsElement) box.open = true; }}
    >
      <CardHeader
        title="Grupos de gastos"
        sub={<>Juntam transações pela descrição ou pelo nome de quem recebe/envia o Pix. Pix <b>recebidos</b> que caem num grupo (ex.: colegas pagando a quadra) descontam do gasto do grupo.</>}
      >
        <Button $size="sm" type="button" onClick={add}><Icon d={ICON.plus} size={16} />Novo grupo</Button>
      </CardHeader>
      {groups.length
        ? groups.map((gr) => (
          <GroupEditor
            key={gr.uid}
            group={gr}
            color={groupColor(ids, gr.id ?? '')}
            categories={categories}
            autoFocus={gr.uid === justAdded.current}
            onChange={(p) => patch(gr.uid, p)}
            onRemove={() => update((list) => list.filter((g) => g.uid !== gr.uid))}
          />
        ))
        : <Empty>Nenhum grupo ainda. Crie um para juntar gastos como Cinema, Basquete ou Futebol.</Empty>}
      <FormActions><Button $variant="primary" type="submit">Salvar grupos</Button></FormActions>
    </Styled.Container>
  );
}
