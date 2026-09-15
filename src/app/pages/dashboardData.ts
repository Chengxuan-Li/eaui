import { computeScenarioResult } from '../../domain/simulation.ts'
import type { ResultSet, Scenario, WorkbenchState } from '../../domain/types.ts'

/** Charts compare at most three scenarios: the palette is validated for three slots. */
export const MAX_CHARTED_SCENARIOS = 3

export const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

export type ChartedScenario = {
  scenario: Scenario
  /** Categorical color slot, fixed by the scenario's position in the project. */
  slot: number
  /** Result of the last scenario modeling run, if any. */
  modeled: ResultSet | null
  /** What the dashboard shows: a preview when adoption is overridden, else the modeled result. */
  shown: ResultSet | null
  /** Unsaved what-if adoption, when it differs from the saved value. */
  previewAdoption: number | null
  /** Reduction of annual demand against the baseline, in percent. */
  reductionPercent: number | null
}

export type DashboardData = {
  baseline: ResultSet | null
  scenarios: ChartedScenario[]
  /** Scenarios beyond the charted three, listed by name. */
  uncharted: string[]
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

export function buildDashboardData(
  state: WorkbenchState,
  previews: Record<string, number>,
): DashboardData {
  const baseline = state.results.baseline
  const all = Object.values(state.scenarios)

  const scenarios = all
    .slice(0, MAX_CHARTED_SCENARIOS)
    .map((scenario, slot): ChartedScenario => {
      const modeled = state.results.scenarios[scenario.id] ?? null
      const override = previews[scenario.id]
      const previewAdoption =
        override !== undefined && override !== scenario.adoptionPercent
          ? override
          : null
      const shown =
        previewAdoption !== null && baseline
          ? computeScenarioResult(state, scenario, {
              runId: 'preview',
              adoptionPercent: previewAdoption,
            })
          : modeled
      const reductionPercent =
        baseline && shown && baseline.totalKwh > 0
          ? round((1 - shown.totalKwh / baseline.totalKwh) * 100, 1)
          : null
      return {
        scenario,
        slot,
        modeled,
        shown,
        previewAdoption,
        reductionPercent,
      }
    })

  return {
    baseline,
    scenarios,
    uncharted: all
      .slice(MAX_CHARTED_SCENARIOS)
      .map((scenario) => scenario.name),
  }
}
