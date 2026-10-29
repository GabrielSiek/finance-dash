import type { SVGProps } from 'react';

interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'd'> {
  /** A stroke path from ICON (24×24). */
  d: string;
  size?: number;
}

export function Icon({ d, size = 18, ...rest }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...rest}>
      <path d={d} />
    </svg>
  );
}
