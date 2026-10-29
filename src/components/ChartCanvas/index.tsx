import { useEffect, useRef, type HTMLAttributes } from 'react';
import { Chart, type ChartConfiguration } from 'chart.js';
import { applyChartDefaults } from '@/lib/charts';
import * as Styled from './styles';

interface ChartCanvasProps extends HTMLAttributes<HTMLCanvasElement> {
  /**
   * Memoize it (useMemo): the chart is rebuilt whenever this changes. A function gets the canvas,
   * for options that depend on the rendered size.
   */
  config: ChartConfiguration | ((canvas: HTMLCanvasElement) => ChartConfiguration);
  /** Height of a responsive chart, px (default 240). */
  height?: number;
  /** Fixed square size, px, for charts with `responsive: false`. */
  size?: number;
  'aria-label': string;
}

export function ChartCanvas({ config, height, size, ...canvas }: ChartCanvasProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    applyChartDefaults();
    const chart = new Chart(el, typeof config === 'function' ? config(el) : config);
    return () => chart.destroy();
  }, [config]);
  return (
    <Styled.Container $height={height} $size={size}>
      <canvas ref={ref} width={size} height={size} role="img" {...canvas} />
    </Styled.Container>
  );
}
