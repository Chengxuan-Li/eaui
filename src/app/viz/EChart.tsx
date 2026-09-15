import { BarChart, LineChart } from 'echarts/charts'
import {
  GridComponent,
  LegendComponent,
  MarkPointComponent,
  TooltipComponent,
} from 'echarts/components'
import * as echarts from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { useEffect, useMemo, useRef, useState } from 'react'

echarts.use([
  LineChart,
  BarChart,
  GridComponent,
  LegendComponent,
  MarkPointComponent,
  TooltipComponent,
  CanvasRenderer,
])

export type EChartOption = echarts.EChartsCoreOption

export type ChartFont = { family: string; loaded: boolean }

function readFontFamily(): string {
  const family = getComputedStyle(document.documentElement)
    .getPropertyValue('--font-sans')
    .trim()
  return family || 'sans-serif'
}

function fontSet(): FontFaceSet | undefined {
  return (document as { fonts?: FontFaceSet }).fonts
}

/**
 * The workbench font for canvas text. Canvas text does not reflow when a web
 * font arrives, so callers include the result in their option dependencies and
 * charts rebuild once fonts are ready.
 */
export function useChartFont(): ChartFont {
  const [family, setFamily] = useState(readFontFamily)
  const [loaded, setLoaded] = useState(() => fontSet() === undefined)

  useEffect(() => {
    const fonts = fontSet()
    if (!fonts) return
    let active = true
    void fonts.ready.then(() => {
      if (!active) return
      setFamily(readFontFamily())
      setLoaded(true)
    })
    return () => {
      active = false
    }
  }, [])

  return useMemo(() => ({ family, loaded }), [family, loaded])
}

type EChartProps = {
  option: EChartOption
  /** Summary for assistive technology; the data table carries the values. */
  label: string
  height: number
}

/** Thin ECharts wrapper: one instance per mount, resized with its container. */
export function EChart({ option, label, height }: EChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<echarts.ECharts | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const chart = echarts.init(container, undefined, { renderer: 'canvas' })
    chartRef.current = chart
    // Docked tabs stay mounted while hidden; resize when they become visible.
    const observer = new ResizeObserver(() => chart.resize())
    observer.observe(container)
    return () => {
      observer.disconnect()
      chart.dispose()
      chartRef.current = null
    }
  }, [])

  useEffect(() => {
    chartRef.current?.setOption(option, { notMerge: true })
  }, [option])

  return (
    <div
      ref={containerRef}
      role="img"
      aria-label={label}
      style={{ width: '100%', height }}
    />
  )
}
