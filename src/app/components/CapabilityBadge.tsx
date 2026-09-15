import { CircleCheck, Clock, FlaskConical } from 'lucide-react'
import {
  capabilities,
  type CapabilityId,
  type CapabilityStatus,
} from '../../domain/capabilities.ts'
import { cx } from '../cx.ts'
import styles from './components.module.css'

const STATUS_META = {
  working: { label: 'Working', icon: CircleCheck, tone: styles.success },
  simulated: { label: 'Simulated', icon: FlaskConical, tone: styles.info },
  planned: { label: 'Planned', icon: Clock, tone: styles.neutral },
} satisfies Record<CapabilityStatus, unknown>

export function StatusTag({ status }: { status: CapabilityStatus }) {
  const meta = STATUS_META[status]
  const Icon = meta.icon
  return (
    <span className={cx(styles.badge, meta.tone)}>
      <Icon size={12} aria-hidden="true" />
      {meta.label}
    </span>
  )
}

/** Status tag for a registered capability, with its explanation as a tooltip. */
export function CapabilityBadge({ id }: { id: CapabilityId }) {
  const capability = capabilities[id]
  return (
    <span title={capability.explanation}>
      <StatusTag status={capability.status} />
    </span>
  )
}
