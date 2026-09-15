import { LineChart } from 'echarts/charts'
import {
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  TooltipComponent,
} from 'echarts/components'
import * as echarts from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { useEffect, useRef } from 'react'
import { baselineLoadKw, HOURS_PER_YEAR, scenarioLoadKw } from './fixtures.ts'
import { exposeInstance, recordMount } from './probe.ts'
import styles from './spikes.module.css'

echarts.use([
  LineChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  DataZoomComponent,
  CanvasRenderer,
])

const hours = Array.from({ length: HOURS_PER_YEAR }, (_, hour) => hour)

export function ChartSpike() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    recordMount('chart')

    const chart = echarts.init(container, undefined, { renderer: 'canvas' })
    exposeInstance('chart', chart)
    chart.setOption({
      animation: false,
      legend: { top: 0 },
      grid: { left: 56, right: 16, top: 32, bottom: 56 },
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: hours, name: 'Hour of year' },
      yAxis: { type: 'value', name: 'kW (synthetic)' },
      dataZoom: [{ type: 'inside' }, { type: 'slider' }],
      series: [
        {
          name: 'Baseline',
          type: 'line',
          showSymbol: false,
          sampling: 'lttb',
          data: baselineLoadKw,
        },
        {
          name: 'Scenario',
          type: 'line',
          showSymbol: false,
          sampling: 'lttb',
          data: scenarioLoadKw,
        },
      ],
    })

    const observer = new ResizeObserver(() => chart.resize())
    observer.observe(container)
    return () => {
      observer.disconnect()
      chart.dispose()
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className={styles.fill}
      data-testid="chart-spike"
      role="img"
      aria-label="Synthetic hourly load for one year, baseline versus scenario"
    />
  )
}
