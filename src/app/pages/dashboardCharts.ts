import type { EChartOption } from '../viz/EChart.tsx'
import {
  CATEGORICAL,
  CHART_INK,
  DEEMPHASIS,
  type ResolvedTheme,
} from '../viz/palette.ts'
import {
  MONTHS,
  type ChartedScenario,
  type DashboardData,
} from './dashboardData.ts'

// Chart specs follow the dataviz method: 2px lines, 8px markers with a 2px
// surface ring, bars capped at 24px with a 4px rounded data end, solid hairline
// grids, recessive axes, a legend for two or more series, and text in ink tokens.

export function toMwh(kwh: number): number {
  return Math.round(kwh / 1000)
}

export function formatMwh(kwh: number): string {
  return toMwh(kwh).toLocaleString('en-US')
}

export function scenarioLabel(item: ChartedScenario): string {
  return item.previewAdoption === null
    ? item.scenario.name
    : `${item.scenario.name} (preview ${item.previewAdoption}%)`
}

export function scenarioColor(
  item: ChartedScenario,
  theme: ResolvedTheme,
): string {
  return CATEGORICAL[theme][item.slot] ?? CATEGORICAL[theme][0] ?? '#2a78d6'
}

function tooltipStyle(theme: ResolvedTheme) {
  const ink = CHART_INK[theme]
  return {
    backgroundColor: ink.surface,
    borderColor: ink.axis,
    textStyle: { color: ink.primary, fontSize: 12 },
    extraCssText: 'box-shadow: none;',
  }
}

function compactNumber(value: unknown): string {
  if (typeof value !== 'number') return String(value)
  return Math.abs(value) >= 1000
    ? `${(value / 1000).toLocaleString('en-US')}k`
    : value.toLocaleString('en-US')
}

function axisNumber(value: unknown): string {
  return typeof value === 'number'
    ? value.toLocaleString('en-US')
    : String(value)
}

export function monthlyDemandOption(
  data: DashboardData,
  visible: ChartedScenario[],
  theme: ResolvedTheme,
): EChartOption {
  const baseline = data.baseline
  if (!baseline) return {}
  const ink = CHART_INK[theme]
  const lineSeries = (name: string, color: string, monthlyKwh: number[]) => ({
    name,
    type: 'line',
    data: monthlyKwh.map(toMwh),
    color,
    lineStyle: { width: 2, cap: 'round', join: 'round' },
    symbol: 'circle',
    symbolSize: 8,
    itemStyle: { color, borderColor: ink.surface, borderWidth: 2 },
    emphasis: { focus: 'series' },
  })

  return {
    animation: false,
    textStyle: { fontFamily: 'system-ui, "Segoe UI", sans-serif' },
    grid: { left: 56, right: 24, top: 40, bottom: 28 },
    legend: {
      top: 0,
      left: 0,
      icon: 'roundRect',
      itemWidth: 16,
      itemHeight: 3,
      textStyle: { color: ink.secondary },
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'line', lineStyle: { color: ink.axis, width: 1 } },
      valueFormatter: (value: unknown) => `${axisNumber(value)} MWh`,
      ...tooltipStyle(theme),
    },
    xAxis: {
      type: 'category',
      data: MONTHS,
      boundaryGap: false,
      axisLine: { lineStyle: { color: ink.axis } },
      axisTick: { show: false },
      axisLabel: { color: ink.muted },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: ink.muted, formatter: axisNumber },
      splitLine: { lineStyle: { color: ink.grid, width: 1, type: 'solid' } },
    },
    series: [
      lineSeries('Baseline', DEEMPHASIS[theme], baseline.monthlyKwh),
      ...visible.flatMap((item) =>
        item.shown
          ? [
              lineSeries(
                scenarioLabel(item),
                scenarioColor(item, theme),
                item.shown.monthlyKwh,
              ),
            ]
          : [],
      ),
    ],
  }
}

export function annualDemandOption(
  data: DashboardData,
  visible: ChartedScenario[],
  theme: ResolvedTheme,
): EChartOption {
  const baseline = data.baseline
  if (!baseline) return {}
  const ink = CHART_INK[theme]
  const bars = [
    {
      name: 'Baseline',
      kwh: baseline.totalKwh,
      color: DEEMPHASIS[theme],
      reduction: null,
    },
    ...visible.flatMap((item) =>
      item.shown
        ? [
            {
              name: scenarioLabel(item),
              kwh: item.shown.totalKwh,
              color: scenarioColor(item, theme),
              reduction: item.reductionPercent,
            },
          ]
        : [],
    ),
  ]

  return {
    animation: false,
    textStyle: { fontFamily: 'system-ui, "Segoe UI", sans-serif' },
    grid: { left: 8, right: 150, top: 8, bottom: 24, containLabel: true },
    tooltip: {
      trigger: 'item',
      valueFormatter: (value: unknown) => `${axisNumber(value)} MWh/yr`,
      ...tooltipStyle(theme),
    },
    xAxis: {
      type: 'value',
      splitNumber: 3,
      axisLabel: { color: ink.muted, formatter: compactNumber },
      splitLine: { lineStyle: { color: ink.grid, width: 1, type: 'solid' } },
    },
    yAxis: {
      type: 'category',
      inverse: true,
      data: bars.map((bar) => bar.name),
      axisLine: { lineStyle: { color: ink.axis } },
      axisTick: { show: false },
      axisLabel: { color: ink.secondary },
    },
    series: [
      {
        name: 'Annual demand',
        type: 'bar',
        barMaxWidth: 24,
        data: bars.map((bar) => ({
          value: toMwh(bar.kwh),
          itemStyle: { color: bar.color, borderRadius: [0, 4, 4, 0] },
          label: {
            show: true,
            position: 'right',
            color: ink.secondary,
            formatter: `${formatMwh(bar.kwh)} MWh${bar.reduction === null ? '' : ` (${bar.reduction > 0 ? '-' : ''}${Math.abs(bar.reduction)}%)`}`,
          },
        })),
      },
    ],
  }
}
