import type { ReactNode } from 'react';
import { CardHead, CardSub, CardTitle, CardTitles } from '@/components/ui';

interface CardHeaderProps {
  title: ReactNode;
  sub?: ReactNode;
  /** Vertically center the actions with the titles. */
  center?: boolean;
  /** Actions on the right (buttons, segmented controls, legends…). */
  children?: ReactNode;
}

/** The usual card heading: a title over a muted line, with optional actions on the right. */
export function CardHeader({ title, sub, center, children }: CardHeaderProps) {
  return (
    <CardHead $center={center}>
      <CardTitles>
        <CardTitle>{title}</CardTitle>
        {sub != null && <CardSub>{sub}</CardSub>}
      </CardTitles>
      {children}
    </CardHead>
  );
}
