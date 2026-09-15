import {
  CircleCheck,
  CircleDashed,
  CircleDot,
  CircleX,
  Clock,
  LoaderCircle,
  Lock,
  SkipForward,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react'
import type { StageState } from '../../domain/types.ts'
import { cx } from '../cx.ts'
import styles from './components.module.css'

// Semantic stage states (guidelines section 8). Routine states are quiet text
// with an icon; color is reserved for states that need attention. Every state
// keeps its icon and label, so color is never the only signal.
type Emphasis = 'quiet' | 'running' | 'warning' | 'danger'

const STATE_META: Record<
  StageState,
  { label: string; icon: LucideIcon; emphasis: Emphasis }
> = {
  future: { label: 'Not started', icon: CircleDashed, emphasis: 'quiet' },
  ready: { label: 'Ready', icon: CircleDot, emphasis: 'quiet' },
  running: { label: 'Running', icon: LoaderCircle, emphasis: 'running' },
  executed: { label: 'Complete', icon: CircleCheck, emphasis: 'quiet' },
  skipped: { label: 'Skipped', icon: SkipForward, emphasis: 'quiet' },
  // Blocked follows from an upstream failure, which already draws attention.
  blocked: { label: 'Blocked', icon: Lock, emphasis: 'quiet' },
  failed: { label: 'Failed', icon: CircleX, emphasis: 'danger' },
  stale: { label: 'Outdated', icon: TriangleAlert, emphasis: 'warning' },
  unavailable: { label: 'Planned', icon: Clock, emphasis: 'quiet' },
}

const EMPHASIS_CLASS: Record<Emphasis, string | undefined> = {
  quiet: styles.stateQuiet,
  running: styles.stateRunning,
  warning: cx(styles.stateAttention, styles.warning),
  danger: cx(styles.stateAttention, styles.danger),
}

export function stageStateLabel(state: StageState): string {
  return STATE_META[state].label
}

export function StateBadge({ state }: { state: StageState }) {
  const meta = STATE_META[state]
  const Icon = meta.icon
  return (
    <span className={cx(styles.state, EMPHASIS_CLASS[meta.emphasis])}>
      <Icon size={12} aria-hidden="true" />
      {meta.label}
    </span>
  )
}
