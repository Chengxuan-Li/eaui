import { describe, expect, test } from 'vitest'
import { GROUP } from '../../domain/assets.ts'
import type { Asset } from '../../domain/types.ts'
import { createWorkbench } from '../../domain/workbench.ts'
import { STAGE_IDS } from '../../domain/workflow.ts'
import {
  buildAssetTree,
  describeProvenance,
  relatedPages,
} from './assetTree.ts'

function group(id: string, childIds: string[]): Asset {
  return {
    id,
    kind: 'group',
    name: id,
    parentId: null,
    childIds,
    provenance: { kind: 'skeleton' },
    capability: null,
    summary: null,
    entityIds: [],
  }
}

describe('buildAssetTree', () => {
  test('shows stage outputs under their groups with stage provenance', () => {
    const workbench = createWorkbench()
    workbench.execute({
      type: 'workflow.runStage',
      input: { stageId: STAGE_IDS.location },
    })
    const taskId = workbench.getState().taskIds[0] ?? ''
    workbench.execute({ type: 'task.start', input: { taskId } }, 'system')
    workbench.execute({ type: 'task.complete', input: { taskId } }, 'system')

    const state = workbench.getState()
    const tree = buildAssetTree(state.assets, state.rootAssetIds)
    expect(tree.map((node) => node.asset.name)).toEqual([
      'Energy model',
      'Grid model',
      'Data',
      'View',
    ])
    const gisDatasets = tree[2]?.children[0]?.children.find(
      (node) => node.id === GROUP.gisDatasets,
    )
    expect(gisDatasets?.children.map((node) => node.asset.name)).toEqual([
      'Project location',
      'Building footprints',
    ])

    const footprints = state.assets['asset:footprints']
    expect(footprints).toBeDefined()
    if (footprints) {
      expect(describeProvenance(footprints, state.workflow.stages)).toMatch(
        /^Produced by "Location setup \/ footprint capturing" \(run run-\d+, operation op-\d+\)\.$/,
      )
    }
  })

  test('ignores missing children and cycles', () => {
    const assets = {
      a: group('a', ['b', 'missing']),
      b: group('b', ['a']),
    }
    const tree = buildAssetTree(assets, ['a'])
    expect(tree).toHaveLength(1)
    expect(tree[0]?.children.map((node) => node.id)).toEqual(['b'])
    expect(tree[0]?.children[0]?.children).toEqual([])
  })
})

test('maps asset kinds to the pages that show them', () => {
  expect(relatedPages('buildings')).toEqual(['map', 'table'])
  expect(relatedPages('measure')).toEqual(['creator'])
  expect(relatedPages('report')).toEqual([])
})
