import { Graph, layout } from '@dagrejs/dagre'
import { Background, ReactFlow, type Edge, type Node } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useEffect, useMemo } from 'react'
import { stages } from './fixtures.ts'
import { recordMount } from './probe.ts'
import styles from './spikes.module.css'

const NODE_WIDTH = 190
const NODE_HEIGHT = 60

function layoutStages(): { nodes: Node[]; edges: Edge[] } {
  const graph = new Graph()
  graph.setGraph({ rankdir: 'LR', nodesep: 24, ranksep: 36 })
  graph.setDefaultEdgeLabel(() => ({}))

  const edges: Edge[] = []
  let previousId: string | undefined
  for (const stage of stages) {
    graph.setNode(stage.id, { width: NODE_WIDTH, height: NODE_HEIGHT })
    if (previousId) {
      graph.setEdge(previousId, stage.id)
      edges.push({
        id: `${previousId}->${stage.id}`,
        source: previousId,
        target: stage.id,
      })
    }
    previousId = stage.id
  }

  layout(graph)

  const nodes: Node[] = stages.map((stage) => {
    // dagre types node labels loosely; layout() has assigned centre coordinates.
    const point = graph.node(stage.id) as { x: number; y: number }
    return {
      id: stage.id,
      position: {
        x: point.x - NODE_WIDTH / 2,
        y: point.y - NODE_HEIGHT / 2,
      },
      data: { label: `${stage.order}. ${stage.name} (${stage.state})` },
      ariaLabel: `Stage ${stage.order}: ${stage.name}, ${stage.state}`,
      style: { width: NODE_WIDTH },
    }
  })

  return { nodes, edges }
}

export function FlowSpike() {
  const { nodes, edges } = useMemo(() => layoutStages(), [])

  useEffect(() => {
    recordMount('flow')
  }, [])

  return (
    <div className={styles.fill} data-testid="flow-spike">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodesDraggable={false}
        nodesConnectable={false}
        fitView
        minZoom={0.1}
      >
        <Background />
      </ReactFlow>
    </div>
  )
}
