// Chart.js setup and shared chart styling. Colors come from the CSS custom properties, so rebuild a
// chart's config when the theme changes (include `dark` from the store in its useMemo deps).
import { Chart, registerables, type Plugin, type ScriptableContext, type TooltipOptions } from 'chart.js';

Chart.register(...registerables);

export const cssVar = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

export interface ChartTheme { text: string; muted: string; border: string; surface: string; accent: string; warn: string }

export function chartTheme(): ChartTheme {
  return {
    text: cssVar('--text'), muted: cssVar('--muted'), border: cssVar('--border'), surface: cssVar('--surface'),
    accent: cssVar('--accent'), warn: cssVar('--warn'),
  };
}

export function applyChartDefaults() {
  Chart.defaults.font.family = "'Geist', system-ui, sans-serif";
  Chart.defaults.color = cssVar('--muted');
}

export function tooltip(t: ChartTheme): Partial<TooltipOptions> {
  return {
    backgroundColor: t.text, titleColor: t.surface, bodyColor: t.surface, footerColor: t.surface,
    borderWidth: 0, padding: 10, cornerRadius: 8, boxPadding: 4, usePointStyle: true,
    titleFont: { weight: 600 }, footerFont: { weight: 600 },
  };
}

/** Dashed vertical line at the hovered point. */
export const crosshair: Plugin = {
  id: 'crosshair',
  afterDatasetsDraw(chart) {
    const active = chart.tooltip?.getActiveElements?.() ?? [];
    if (!active.length) return;
    const { ctx, chartArea: { top, bottom } } = chart;
    ctx.save();
    ctx.strokeStyle = cssVar('--muted');
    ctx.globalAlpha = 0.5;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(active[0].element.x, top);
    ctx.lineTo(active[0].element.x, bottom);
    ctx.stroke();
    ctx.restore();
  },
};

/** Fill gradient for an area under a line. */
export const areaFill = (color: string) => (ctx: ScriptableContext<'line'>) => {
  const area = ctx.chart.chartArea;
  if (!area) return 'transparent';
  const g = ctx.chart.ctx.createLinearGradient(0, area.top, 0, area.bottom);
  g.addColorStop(0, hexAlpha(color, 0.16));
  g.addColorStop(1, hexAlpha(color, 0));
  return g;
};

export function hexAlpha(hex: string, a: number) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

/** SVG path for a sparkline in a w×h box. */
export function sparkPath(vals: number[], w = 200, h = 44, pad = 4) {
  const lo = Math.min(...vals), hi = Math.max(...vals), span = hi - lo || 1;
  return vals.map((v, i) => `${i ? 'L' : 'M'}${((i / Math.max(vals.length - 1, 1)) * w).toFixed(1)},${(pad + (1 - (v - lo) / span) * (h - 2 * pad)).toFixed(1)}`).join(' ');
}
