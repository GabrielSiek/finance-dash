// Skeleton placeholders shown while data loads. Each mirrors the layout of the view it stands in for.
import type { ReactNode } from 'react';
import { Card, CardHead, Col, Field, FormGrid, ListRow, Row, SrOnly, TableWrap } from '@/components/ui';
import { Page } from '@/components/Page';
import type { Route } from '@/lib/hooks';
import * as Styled from './styles';

const { Sk } = Styled;
const repeat = (n: number, fn: (i: number) => ReactNode) => Array.from({ length: n }, (_, i) => fn(i));
// Varied widths so rows don't look stamped out.
const W = ['62%', '48%', '71%', '55%', '66%', '42%', '58%', '50%'];
const PX = ['150px', '110px', '180px', '130px', '160px', '120px', '170px', '140px'];

function Busy({ label = 'Carregando…', children }: { label?: string; children: ReactNode }) {
  return <Styled.Container><SrOnly role="status">{label}</SrOnly>{children}</Styled.Container>;
}
const Head = ({ title = '160px', sub = '240px' }) => (
  <CardHead><Styled.Stack><Sk $w={title} $h={18} /><Sk $w={sub} $h={12} /></Styled.Stack></CardHead>
);
const TileSk = ({ size = 40, radius = 12 }) => <Sk $w={`${size}px`} $h={size} $r={radius} style={{ flexShrink: 0 }} />;
const Chip = ({ w = '72px' }) => <Sk $w={w} $h={22} $r={999} />;
const ChartSk = ({ h = 240 }) => <Sk $h={h} $r={16} />;
const ListRows = ({ n }: { n: number }) => (
  <div>{repeat(n, (i) => (
    <ListRow key={i}>
      <TileSk size={36} radius={11} />
      <Styled.Stack $gap={2} $flex="1"><Sk $w={PX[i % 8]} /><Sk $w={PX[(i + 3) % 8]} $h={11} $max="60%" /></Styled.Stack>
      <Styled.Stack style={{ alignItems: 'flex-end' }}><Sk $w="84px" /><Sk $w="56px" $h={11} /></Styled.Stack>
    </ListRow>
  ))}</div>
);
const FieldSk = ({ i }: { i: number }) => (
  <Field><Sk $w={PX[i % 8]} $h={13} $max="70%" /><Sk $h={44} $r={12} /></Field>
);
const Fields = ({ n }: { n: number }) => <FormGrid>{repeat(n, (i) => <FieldSk key={i} i={i} />)}</FormGrid>;

// ---------- Investimentos ----------

const ClassCard = ({ i }: { i: number }) => (
  <Styled.ClassCard>
    <Styled.Line $gap={10}><TileSk size={36} radius={11} /><Styled.Stack><Sk $w="80px" /><Sk $w="56px" $h={11} /></Styled.Stack></Styled.Line>
    <Sk $w={W[i % 8]} $h={22} />
    <Sk $h={44} $r={10} />
  </Styled.ClassCard>
);

const Investments = () => (
  <>
    <Row>
      <Card $flex="2 1 560px"><Head title="140px" sub="200px" /><Sk $w="240px" $h={40} /><Sk $w="200px" $h={13} /><ChartSk /></Card>
      <Card $flex="1 1 340px"><Head title="120px" sub="160px" /><Styled.DonutBox><Styled.Donut /></Styled.DonutBox><ListRows n={3} /></Card>
    </Row>
    <Styled.ClassCards>{repeat(4, (i) => <ClassCard key={i} i={i} />)}</Styled.ClassCards>
    <Row>
      <Card $flex="3 1 520px"><Head /><ChartSk h={210} /></Card>
      <Card $flex="2 1 340px"><Head title="120px" sub="180px" /><ListRows n={4} /></Card>
    </Row>
    <Card><Head title="140px" sub="220px" /><ListRows n={6} /></Card>
  </>
);

// ---------- Gastos ----------

const Kpi = ({ i }: { i: number }) => (
  <Styled.Kpi>
    <Styled.KpiTop><Sk $w={PX[(i + 1) % 8]} $max="60%" /><TileSk size={34} radius={11} /></Styled.KpiTop>
    <Sk $w={W[i % 8]} $h={28} $max="180px" />
    <Sk $w="120px" $h={12} />
  </Styled.Kpi>
);

const CatRow = ({ i }: { i: number }) => (
  <ListRow style={{ padding: '12px 0', gap: 20 }}>
    <Styled.Line $flex="1 1 210px"><TileSk /><Styled.Stack><Sk $w={PX[i % 8]} /><Sk $w="80px" $h={11} /></Styled.Stack></Styled.Line>
    <Styled.Stack $gap={6} $flex="1 1 180px"><Sk $h={8} $r={999} /><Sk $w="90px" $h={11} /></Styled.Stack>
    <Styled.Stack style={{ alignItems: 'flex-end' }}><Sk $w="92px" $h={15} /><Chip w="64px" /></Styled.Stack>
  </ListRow>
);

const TxRows = ({ n = 8 }) => (
  <TableWrap>{repeat(n, (i) => (
    <Styled.TxRow key={i}>
      <Sk $w="44px" />
      <Styled.Line><TileSk size={38} /><Styled.Stack><Sk $w={PX[i % 8]} /><Sk $w={PX[(i + 5) % 8]} $h={11} /></Styled.Stack></Styled.Line>
      <Sk $w={W[(i + 2) % 8]} />
      <Sk $w={W[(i + 4) % 8]} />
      <Chip />
      <Sk $w="84px" style={{ justifySelf: 'end' }} />
    </Styled.TxRow>
  ))}</TableWrap>
);

/** Rows for the transactions table while a period is fetched. */
export const TxTableSkeleton = () => <Busy label="Buscando transações…"><TxRows /></Busy>;

const Spending = () => (
  <>
    <Styled.KpiGrid>
      {repeat(2, (i) => <Kpi key={i} i={i} />)}
      <Styled.Kpi $wide>
        <Styled.KpiTop><Sk $w="130px" /><TileSk size={34} radius={11} /></Styled.KpiTop>
        <Styled.KpiSplit>{repeat(2, (i) => (
          <Styled.Stack key={i} $gap={10}><Sk $w="90px" $h={13} /><Sk $w={W[i + 2]} $h={24} $max="180px" /><Sk $h={10} $r={999} /><Sk $w="180px" $h={12} /></Styled.Stack>
        ))}</Styled.KpiSplit>
      </Styled.Kpi>
    </Styled.KpiGrid>
    <Row>
      <Card $flex="3 1 560px" $gap={10}><Head /><div>{repeat(6, (i) => <CatRow key={i} i={i} />)}</div></Card>
      <Col $flex="2 1 360px">
        <Card><Head title="120px" sub="200px" /><ListRows n={3} /></Card>
        <Card><Head title="140px" sub="180px" /><Sk $h={14} $r={999} /><ListRows n={3} /></Card>
      </Col>
    </Row>
    <Card><Head /><ChartSk /></Card>
    <Card><Head title="120px" sub="300px" /><Sk $h={74} $r={18} /><TxRows /></Card>
  </>
);

/** Body of the Gastos view while a month loads. */
export const SpendingSkeleton = () => <Busy label="Carregando transações…"><Spending /></Busy>;

// ---------- Contas / Configurações ----------

const Connection = ({ i }: { i: number }) => (
  <Styled.Connection>
    <TileSk size={36} radius={10} />
    <Styled.Stack $flex="1" style={{ minWidth: 200 }}><Sk $w={PX[i % 8]} /><Sk $w="260px" $h={11} /></Styled.Stack>
    <Chip w="56px" />
    <Styled.Line $gap={8}><Sk $w="96px" $h={36} $r={12} /><Sk $w="80px" $h={36} $r={12} /></Styled.Line>
  </Styled.Connection>
);

const Accounts = () => (
  <>
    <Card><Head title="120px" sub="90px" /><Styled.Connections>{repeat(2, (i) => <Connection key={i} i={i} />)}</Styled.Connections></Card>
    <Card><Head title="150px" sub="240px" /><ListRows n={3} /></Card>
  </>
);

/** Inputs of a settings form while its options load. */
export const FieldsSkeleton = () => <Busy><Fields n={6} /></Busy>;

const Settings = () => (
  <>
    <Card><Head title="170px" sub="360px" /><Fields n={3} /></Card>
    <Card><Head title="190px" sub="280px" /><Fields n={4} /><Styled.AllocGrid>{repeat(7, (i) => <FieldSk key={i} i={i} />)}</Styled.AllocGrid></Card>
    <Card><Head title="160px" sub="320px" /><Fields n={6} /></Card>
    <Card><Head title="170px" sub="260px" /><ListRows n={2} /></Card>
  </>
);

// ---------- Whole page (first load) ----------

const PAGES: Record<Route, [string, () => ReactNode]> = {
  investimentos: ['Investimentos', Investments],
  metas: ['Investimentos', Investments],
  gastos: ['Gastos', Spending],
  contas: ['Contas conectadas', Accounts],
  configuracoes: ['Configurações', Settings],
};

/** Placeholder page for a route before the portfolio arrives. */
export function PageSkeleton({ route }: { route: Route }) {
  const [title, Body] = PAGES[route];
  return <Page title={title} sub="Carregando…"><Busy><Body /></Busy></Page>;
}
