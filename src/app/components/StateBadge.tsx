import {
  Ban,
  CircleCheck,
  CircleDashed,
  CircleDot,
  CircleX,
  LoaderCircle,
  Lock,
  SkipForward,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react'
import type { StageState } from '../../domain/types.ts'
import { cx } from '../cx.ts'
import styles from './components.module.css'

type Tone = 'success' | 'info' | 'warning' | 'danger' | 'neutral'

const STATE_META: Record<
  StageState,
  { label: string; icon: LucideIcon; tone: Tone }
> = {
  future: { label: 'Not started', icon: CircleDashed, tone: 'neutral' },
  ready: { label: 'Ready', icon: CircleDot, tone: 'info' },
  running: { label: 'Running', icon: LoaderCircle, tone: 'info' },
  executed: { label: 'Done', icon: CircleCheck, tone: 'success' },
  skipped: { label: 'Skipped', icon: SkipForward, tone: 'neutral' },
  blocked: { label: 'Blocked', icon: Lock, tone: 'warning' },
  failed: { label: 'Failed', icon: CircleX, tone: 'danger' },
  stale: { label: 'Stale', icon: TriangleAlert, tone: 'warning' },
  unavailable: { label: 'Unavailable', icon: Ban, tone: 'neutral' },
}

export function stageStateLabel(state: StageState): string {
  return STATE_META[state].label
}

export function StateBadge({ state }: { state: StageState }) {
  const meta = STATE_META[state]
  const Icon = meta.icon
  return (
    <span className={cx(styles.badge, styles[meta.tone])}>
      <Icon size={12} aria-hidden="true" />
      {meta.label}
    </span>
  )
}
