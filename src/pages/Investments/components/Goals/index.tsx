import type { Goals as GoalsSettings, Portfolio } from '@shared/types';
import { Col } from '@/components/ui';
import { monthContributions, type Derived } from '../../derive';
import { ContributionGoal } from '../ContributionGoal';
import { WealthGoal } from '../WealthGoal';
import { AllocationGoal } from '../AllocationGoal';
import * as Styled from './styles';

export function Goals({ p, d, goals }: { p: Portfolio; d: Derived; goals: GoalsSettings }) {
  const month = monthContributions(p);
  return (
    <Styled.Container id="metas">
      <Col $flex="1 1 340px">
        <ContributionGoal goal={goals.monthlyContribution} month={month} />
        <WealthGoal goals={goals} d={d} />
      </Col>
      <AllocationGoal goals={goals} d={d} aportado={month.aportado} />
    </Styled.Container>
  );
}
