import { useState, type ReactNode } from 'react'
import { ChartSpike } from './ChartSpike.tsx'
import { DockingSpike } from './DockingSpike.tsx'
import { FlexLayoutSpike } from './FlexLayoutSpike.tsx'
import { FlowSpike } from './FlowSpike.tsx'
import { GridSpike } from './GridSpike.tsx'
import { MapSpike } from './MapSpike.tsx'
import styles from './spikes.module.css'

const SPIKE_TITLES: Record<string, string> = {
  map: 'MapLibre without a basemap',
  chart: 'ECharts hourly series',
  grid: 'AG Grid with pending edits',
  flow: 'React Flow roadmap',
  docking: 'dockview workbench',
  flexlayout: 'FlexLayout workbench',
}

export default function SpikeApp({ name }: { name: string }) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const title = SPIKE_TITLES[name]

  if (!title) {
    return (
      <main className={styles.header}>
        <h1>Unknown spike</h1>
        <p>
          Use <code>?spike=</code> with one of:{' '}
          {Object.keys(SPIKE_TITLES).join(', ')}.
        </p>
      </main>
    )
  }

  let content: ReactNode
  switch (name) {
    case 'map':
      content = <MapSpike selectedId={selectedId} onSelect={setSelectedId} />
      break
    case 'chart':
      content = <ChartSpike />
      break
    case 'grid':
      content = <GridSpike selectedId={selectedId} onSelect={setSelectedId} />
      break
    case 'flow':
      content = <FlowSpike />
      break
    case 'flexlayout':
      content = (
        <FlexLayoutSpike selectedId={selectedId} select={setSelectedId} />
      )
      break
    default:
      content = <DockingSpike selectedId={selectedId} select={setSelectedId} />
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>Package spike: {title}</h1>
        <p>
          Synthetic data for evaluating packages; not product behavior. Selected
          building:{' '}
          <span data-testid="selected-id">{selectedId ?? 'none'}</span>
        </p>
      </header>
      <main className={styles.grow}>{content}</main>
    </div>
  )
}
