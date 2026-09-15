import { BarChart, LineChart } from 'echarts/charts'
import {
  GridComponent,
  LegendComponent,
  TooltipComponent,
} from 'echarts/components'
import * as echarts from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { useEffect, useRef } from 'react'

echarts.use([
  LineChart,
  BarChart,
  GridComponent,
  LegendComponent,
  TooltipComponent,
  CanvasRenderer,
])

export type EChartOption = echarts.EChartsCoreOption

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
