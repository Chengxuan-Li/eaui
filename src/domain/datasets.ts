import {
  parseDistrict,
  setCurrentDistrict,
  type District,
  type DistrictExtract,
} from './districts.ts'
import type { BuildingUse, MeasureKind, WorkbenchState } from './types.ts'
import { createWorkbench } from './workbench.ts'
import { STAGE_IDS } from './workflow.ts'

// Several fictional districts, so the demo can show the agent working against
// different places, different points in the workflow, and different result
// data (decision 0020). Every dataset is a recipe rather than a stored state
// blob: opening one replays real commands, so it can only ever be a state the
// app could actually reach, and the fixtures stay small.

export type DatasetId = 'backBay' | 'eixample' | 'jordaan' | 'murrayHill'

export type DatasetStep =
  | { kind: 'run'; stage: string }
  | { kind: 'skip'; stage: string }
  | {
      kind: 'measure'
      name: string
      measure: MeasureKind
      savingsPercent: number
      appliesTo: BuildingUse | 'all'
    }
  | {
      kind: 'scenario'
      name: string
      measures: string[]
      adoptionPercent: number
    }

/** A starting prompt that shows what this dataset is here to demonstrate. */
export type DatasetQuestion = { id: string; label: string; prompt: string }

export type Dataset = {
  id: DatasetId
  /** Short name for menus. */
  name: string
  /** The project location, shown in the title and Inspection provenance. */
  locationName: string
  /** What is interesting about this place. */
  description: string
  /** Where the workflow stands the moment it opens. */
  stateLabel: string
  loadExtract: () => Promise<DistrictExtract>
  steps: DatasetStep[]
  questions: DatasetQuestion[]
}

// The workflow is a strict chain, so "through" means every stage up to and
// including that one, in order, minus anything skipped.
const ORDER: string[] = [
  STAGE_IDS.location,
  STAGE_IDS.enrichment,
  STAGE_IDS.schema,
  STAGE_IDS.preprocessing,
  STAGE_IDS.shading,
  STAGE_IDS.archetypes,
  STAGE_IDS.baseline,
  STAGE_IDS.scenarioDefinitions,
  STAGE_IDS.scenarioModeling,
  STAGE_IDS.gridDefinitions,
  STAGE_IDS.gridModeling,
  STAGE_IDS.dashboard,
]

function through(
  last: string,
  options: { skip?: string[]; after?: Record<string, DatasetStep[]> } = {},
): DatasetStep[] {
  const skip = new Set(options.skip ?? [])
  const steps: DatasetStep[] = []
  for (const stage of ORDER.slice(0, ORDER.indexOf(last) + 1)) {
    steps.push(
      skip.has(stage) ? { kind: 'skip', stage } : { kind: 'run', stage },
    )
    steps.push(...(options.after?.[stage] ?? []))
  }
  return steps
}

const RETROFIT: DatasetStep[] = [
  {
    kind: 'measure',
    name: 'Facade insulation',
    measure: 'envelope',
    savingsPercent: 18,
    appliesTo: 'all',
  },
  {
    kind: 'scenario',
    name: 'Half retrofitted',
    measures: ['Facade insulation'],
    adoptionPercent: 50,
  },
]

const ROOFTOP_PV: DatasetStep[] = [
  {
    kind: 'measure',
    name: 'Rooftop PV',
    // PV measures take their saving from the estimated yield, so savings is 0.
    measure: 'pv',
    savingsPercent: 0,
    appliesTo: 'all',
  },
  {
    kind: 'scenario',
    name: 'Rooftop PV everywhere',
    measures: ['Rooftop PV'],
    adoptionPercent: 70,
  },
]

export const DATASETS: Dataset[] = [
  {
    id: 'backBay',
    name: 'Boston Back Bay',
    locationName:
      'Boston Back Bay (OpenStreetMap footprints, synthetic attributes)',
    description:
      'A rowhouse grid between Arlington Street and Dartmouth Street. Nothing has been run, so the workflow starts from footprint capture.',
    stateLabel: 'Nothing run yet',
    loadExtract: () =>
      import('./fixtures/back-bay-buildings.geo.json').then(
        (module) => module.default,
      ),
    steps: [],
    questions: [
      {
        id: 'whatIsHere',
        label: 'What can you show me?',
        prompt:
          'Nothing has been run in this project yet. Tell me what you can and cannot show me, and set up a sensible view to start from.',
      },
      {
        id: 'sideBySide',
        label: 'Map beside Table',
        prompt: 'Put the Map beside the Table so I can see both at once.',
      },
      {
        id: 'appearance',
        label: 'Try a darker appearance',
        prompt:
          'Switch to the Dark engineering appearance and tell me what changed.',
      },
    ],
  },
  {
    id: 'eixample',
    name: 'Barcelona Eixample',
    locationName:
      'Barcelona Eixample (OpenStreetMap footprints, synthetic attributes)',
    description:
      "Cerda's chamfered octagonal blocks. Baseline demand is modelled, but shading was skipped, so there is no PV yield.",
    stateLabel: 'Baseline demand modelled, shading skipped',
    loadExtract: () =>
      import('./fixtures/eixample-buildings.geo.json').then(
        (module) => module.default,
      ),
    steps: through(STAGE_IDS.baseline, { skip: [STAGE_IDS.shading] }),
    questions: [
      {
        id: 'baseline',
        label: 'Show the baseline demand',
        prompt:
          'Colour the map by baseline demand and open the Dashboard beside it.',
      },
      {
        id: 'missingPv',
        label: 'Why is there no PV yield?',
        prompt:
          'I wanted to see PV yield on the map. Can you show it? If not, tell me exactly why and what would have to happen.',
      },
      {
        id: 'biggest',
        label: 'Point out the biggest consumers',
        prompt:
          'Select the five buildings with the highest baseline demand and zoom the map to them.',
      },
    ],
  },
  {
    id: 'jordaan',
    name: 'Amsterdam Jordaan',
    locationName:
      'Amsterdam Jordaan (OpenStreetMap footprints, synthetic attributes)',
    description:
      'A fine grain of narrow canal plots. A retrofit scenario has been modelled, so scenario reduction can be compared against the baseline.',
    stateLabel: 'Retrofit scenario modelled',
    loadExtract: () =>
      import('./fixtures/jordaan-buildings.geo.json').then(
        (module) => module.default,
      ),
    steps: through(STAGE_IDS.scenarioModeling, {
      after: { [STAGE_IDS.baseline]: RETROFIT },
    }),
    questions: [
      {
        id: 'reduction',
        label: 'Show the scenario reduction',
        prompt:
          'Colour the map by scenario reduction and explain the range you see.',
      },
      {
        id: 'compare',
        label: 'Compare against the baseline',
        prompt:
          'Open the Dashboard and set up a comparison between the baseline and the retrofit scenario.',
      },
      {
        id: 'focus',
        label: 'Focus on the map',
        prompt:
          'Collapse both side containers and maximize the Map so I can look at it properly.',
      },
    ],
  },
  {
    id: 'murrayHill',
    name: 'Manhattan Murray Hill',
    locationName:
      'Murray Hill, Manhattan (OpenStreetMap footprints, synthetic attributes)',
    description:
      'Mid-block walk-ups beside tall towers, so heights vary widely. PV yield is estimated, and grid modelling failed on its first attempt.',
    stateLabel: 'Grid modelling failed',
    loadExtract: () =>
      import('./fixtures/murray-hill-buildings.geo.json').then(
        (module) => module.default,
      ),
    // Scenario definitions needs a scenario to exist, or every stage after it
    // is blocked rather than reached. A rooftop PV scenario suits a dataset
    // whose point is PV yield, and leaves grid modelling as the one failure.
    steps: through(STAGE_IDS.gridModeling, {
      after: { [STAGE_IDS.baseline]: ROOFTOP_PV },
    }),
    questions: [
      {
        id: 'tallest',
        label: 'Find the tallest buildings',
        prompt:
          'Select the five tallest buildings, colour the map by floors, and zoom to them in 3D.',
      },
      {
        id: 'pv',
        label: 'Show PV yield',
        prompt: 'Colour the map by PV yield and tell me the range.',
      },
      {
        id: 'whatFailed',
        label: 'What went wrong?',
        prompt:
          'Something in this project failed. Find out what, and tell me what it means. Do not try to fix it.',
      },
    ],
  },
]

export function getDataset(id: DatasetId): Dataset {
  return DATASETS.find((dataset) => dataset.id === id) ?? DATASETS[0]!
}

export const DEFAULT_DATASET_ID: DatasetId = 'backBay'

/**
 * Replays a dataset's recipe through the real command registry, so the state it
 * produces is one the workflow could have reached by hand. Stage tasks are
 * started and completed here rather than left to the simulator, because
 * opening a dataset should not take twenty seconds of simulated computation.
 */
export function materializeDataset(
  dataset: Dataset,
  district: District,
): WorkbenchState {
  setCurrentDistrict(district)
  const workbench = createWorkbench()
  const measureIds = new Map<string, string>()

  const runStage = (stage: string) => {
    workbench.execute({ type: 'workflow.runStage', input: { stageId: stage } })
    const state = workbench.getState()
    const taskId = [...state.taskIds]
      .reverse()
      .find((id) => state.tasks[id]?.stageId === stage)
    if (!taskId) return
    workbench.execute({ type: 'task.start', input: { taskId } })
    workbench.execute({ type: 'task.complete', input: { taskId } })
  }

  for (const step of dataset.steps) {
    switch (step.kind) {
      case 'run':
        runStage(step.stage)
        break
      case 'skip':
        workbench.execute({
          type: 'workflow.setStageSkipped',
          input: { stageId: step.stage, skipped: true },
        })
        break
      case 'measure': {
        workbench.execute({
          type: 'measure.create',
          input: {
            name: step.name,
            kind: step.measure,
            savingsPercent: step.savingsPercent,
            appliesTo: step.appliesTo,
          },
        })
        const created = Object.values(workbench.getState().measures).find(
          (measure) => measure.name === step.name,
        )
        if (created) measureIds.set(step.name, created.id)
        break
      }
      case 'scenario':
        workbench.execute({
          type: 'scenario.create',
          input: {
            name: step.name,
            measureIds: step.measures.flatMap((name) => {
              const id = measureIds.get(name)
              return id ? [id] : []
            }),
            adoptionPercent: step.adoptionPercent,
          },
        })
        break
    }
  }

  const state = workbench.getState()
  // The recipe ran instantly, so nothing should look like it is still working,
  // and the title should name the district rather than the generic demo.
  return {
    ...state,
    project: { ...state.project, name: `${dataset.name} (demo)` },
    tasks: {},
    taskIds: [],
    workflow: { ...state.workflow, currentStageId: null },
  }
}

export async function loadDataset(
  dataset: Dataset,
): Promise<{ district: District; state: WorkbenchState }> {
  const extract = await dataset.loadExtract()
  const district = parseDistrict(dataset.id, dataset.locationName, extract)
  return { district, state: materializeDataset(dataset, district) }
}
