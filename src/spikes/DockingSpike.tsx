import {
  DockviewReact,
  themeLight,
  type DockviewReadyEvent,
  type IDockviewPanelProps,
} from 'dockview-react'
import 'dockview-react/dist/styles/dockview.css'
import {
  createContext,
  useContext,
  useMemo,
  type FunctionComponent,
} from 'react'
import { ChartSpike } from './ChartSpike.tsx'
import { FlowSpike } from './FlowSpike.tsx'
import { GridSpike } from './GridSpike.tsx'
import { MapSpike } from './MapSpike.tsx'
import { exposeInstance } from './probe.ts'
import styles from './spikes.module.css'

type Selection = {
  selectedId: string | null
  select: (id: string | null) => void
}

const SelectionContext = createContext<Selection | null>(null)

function useSelection(): Selection {
  const selection = useContext(SelectionContext)
  if (!selection) {
    throw new Error('Spike panels must render inside DockingSpike')
  }
  return selection
}

function PlaceholderPanel({ text }: { text: string }) {
  return (
    <div className={styles.header}>
      <p>{text}</p>
    </div>
  )
}

function AssetsPanel() {
  return <PlaceholderPanel text="Asset tree placeholder (not in this spike)." />
}

function WorkflowPanel() {
  return (
    <PlaceholderPanel text="Compact workflow placeholder (not in this spike)." />
  )
}

function ReasoningPanel() {
  return (
    <PlaceholderPanel text="Reasoning panel placeholder (not in this spike)." />
  )
}

function MapPanel() {
  const { selectedId, select } = useSelection()
  return <MapSpike selectedId={selectedId} onSelect={select} />
}

function TablePanel() {
  const { selectedId, select } = useSelection()
  return <GridSpike selectedId={selectedId} onSelect={select} />
}

const components: Record<string, FunctionComponent<IDockviewPanelProps>> = {
  assets: AssetsPanel,
  workflow: WorkflowPanel,
  reasoning: ReasoningPanel,
  map: MapPanel,
  table: TablePanel,
  chart: ChartSpike,
  roadmap: FlowSpike,
}

function handleReady({ api }: DockviewReadyEvent) {
  exposeInstance('dockview', api)

  api.addEdgeGroup('left', { id: 'left-edge', initialSize: 260 })
  api.addEdgeGroup('right', { id: 'right-edge', initialSize: 300 })

  api.addPanel({ id: 'map', component: 'map', title: 'Map' })
  api.addPanel({
    id: 'table',
    component: 'table',
    title: 'Table',
    position: { referencePanel: 'map', direction: 'within' },
  })
  api.addPanel({
    id: 'chart',
    component: 'chart',
    title: 'Dashboard chart',
    position: { referencePanel: 'map', direction: 'right' },
  })
  api.addPanel({
    id: 'roadmap',
    component: 'roadmap',
    title: 'Roadmap',
    position: { referencePanel: 'chart', direction: 'within' },
  })
  api.addPanel({
    id: 'assets',
    component: 'assets',
    title: 'Assets',
    position: { referenceGroup: 'left-edge' },
  })
  api.addPanel({
    id: 'workflow',
    component: 'workflow',
    title: 'Workflow',
    position: { referenceGroup: 'left-edge' },
  })
  api.addPanel({
    id: 'reasoning',
    component: 'reasoning',
    title: 'Reasoning',
    position: { referenceGroup: 'right-edge' },
  })

  api.getPanel('map')?.api.setActive()
  api.getPanel('chart')?.api.setActive()
}

type DockingSpikeProps = Selection

export function DockingSpike({ selectedId, select }: DockingSpikeProps) {
  const selection = useMemo(
    () => ({ selectedId, select }),
    [selectedId, select],
  )

  return (
    <SelectionContext.Provider value={selection}>
      <DockviewReact
        className={styles.fill}
        components={components}
        onReady={handleReady}
        defaultRenderer="always"
        theme={themeLight}
      />
    </SelectionContext.Provider>
  )
}
