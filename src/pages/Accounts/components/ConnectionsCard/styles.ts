import styled from 'styled-components';
import { Card, Field, Input } from '@/components/ui';

export const Container = styled(Card)``;
export const List = styled.div`display: flex; flex-direction: column; gap: 10px;`;
export const AddItem = styled.form`display: flex; flex-wrap: wrap; gap: 8px; align-items: flex-end;`;
export const AddField = styled(Field)`flex: 1 1 300px;`;
export const ItemInput = styled(Input)`font-family: ui-monospace, Consolas, monospace; font-size: 13px;`;
