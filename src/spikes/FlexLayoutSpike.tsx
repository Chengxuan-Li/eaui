import {
  Actions,
  DockLocation,
  Layout,
  Model,
  type IJsonModel,
  type TabNode,
} from 'flexlayout-react'
import 'flexlayout-react/style/light.css'
import { useCallback, useEffect, useState } from 'react'
import { ChartSpike } from './ChartSpike.tsx'
import { FlowSpike } from './FlowSpike.tsx'
import { GridSpike } from './GridSpike.tsx'
import { MapSpike } from './MapSpike.tsx'
import { exposeInstance } from './probe.ts'
import styles from './spikes.module.css'

// Workbench-shaped layout used to evaluate FlexLayout (decision 0008): side
// borders plus two center tabsets holding the map, table, chart, and roadmap.
const initialLayout: IJsonModel = {
  global: {
    tabEnableRenderOnDemand: false,
    borderEnableAutoHide: false,
  },
  borders: [
    {
      type: 'border',
      location: 'left',
      size: 260,
      selected: 0,
      children: [
        { type: 'tab', id: 'assets', name: 'Assets', component: 'assets' },
        {
          type: 'tab',
          id: 'workflow',
          name: 'Workflow',
          component: 'workflow',
        },
      ],
    },
    {
      type: 'border',
      location: 'right',
      size: 300,
      selected: 0,
      children: [
        {
          type: 'tab',
          id: 'reasoning',
          name: 'Reasoning',
          component: 'reasoning',
        },
      ],
    },
  ],
  layout: {
    type: 'row',
    children: [
      {
        type: 'tabset',
        id: 'center-main',
        weight: 50,
        children: [
          { type: 'tab', id: 'map', name: 'Map', component: 'map' },
          { type: 'tab', id: 'table', name: 'Table', component: 'table' },
        ],
      },
      {
        type: 'tabset',
        id: 'center-side',
        weight: 50,
        children: [
          {
            type: 'tab',
            id: 'chart',
            name: 'Dashboard chart',
            component: 'chart',
          },
          {
            type: 'tab',
            id: 'roadmap',
            name: 'Roadmap',
            component: 'roadmap',
          },
        ],
      },
    ],
  },
}

function PlaceholderPanel({ text }: { text: string }) {
  return (
    <div className={styles.header}>
      <p>{text}</p>
    </div>
  )
}

type FlexLayoutSpikeProps = {
  selectedId: string | null
  select: (id: string | null) => void
}

export function FlexLayoutSpike({ selectedId, select }: FlexLayoutSpikeProps) {
  const [model, setModel] = useState(() => Model.fromJson(initialLayout))

  // Layout commands for Playwright; the product would route these through
  // the typed operation layer instead.
  useEffect(() => {
    exposeInstance('flexlayout', {
      selectTab: (tabId: string) => {
        model.doAction(Actions.selectTab(tabId))
      },
      moveTab: (tabId: string, tabsetId: string) => {
        model.doAction(
          Actions.moveNode(tabId, tabsetId, DockLocation.CENTER, -1),
        )
      },
      toggleMaximize: (tabsetId: string) => {
        model.doAction(Actions.maximizeToggle(tabsetId))
      },
      isMaximized: () => model.getMaximizedTabset() !== undefined,
      toJson: () => model.toJson(),
      restore: (json: IJsonModel) => setModel(Model.fromJson(json)),
    })
  }, [model])

  const factory = useCallback(
    (node: TabNode) => {
      switch (node.getComponent()) {
        case 'map':
          return <MapSpike selectedId={selectedId} onSelect={select} />
        case 'table':
          return <GridSpike selectedId={selectedId} onSelect={select} />
        case 'chart':
          return <ChartSpike />
        case 'roadmap':
          return <FlowSpike />
        default:
          return (
            <PlaceholderPanel
              text={`${node.getName()} placeholder (not in this spike).`}
            />
          )
      }
    },
    [selectedId, select],
  )

  return (
    <div className={styles.fill} style={{ position: 'relative' }}>
      <Layout
        model={model}
        factory={factory}
        keyMap={{ focusNextTabset: 'F6', focusPreviousTabset: 'Shift+F6' }}
      />
    </div>
  )
}
