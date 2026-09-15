import { CircleCheck, Clock, FlaskConical } from 'lucide-react'
import {
  capabilities,
  type CapabilityId,
  type CapabilityStatus,
} from '../../domain/capabilities.ts'
import { cx } from '../cx.ts'
import styles from './components.module.css'

// Quiet capability disclosure (guidelines section 8, amended 2026-09-15):
// working behavior carries no label, Planned is a normal state, Simulated is
// disclosed once per surface, and the full overview lives in Settings.

const STATUS_META = {
  working: { label: 'Working', icon: CircleCheck },
  simulated: { label: 'Simulated', icon: FlaskConical },
  planned: { label: 'Planned', icon: Clock },
} satisfies Record<CapabilityStatus, unknown>

/** An explicit capability status, used where every status must be named, such as the overview table. */
export function StatusTag({ status }: { status: CapabilityStatus }) {
  const meta = STATUS_META[status]
  const Icon = meta.icon
  return (
    <span className={cx(styles.state, styles.stateQuiet)}>
      <Icon size={12} aria-hidden="true" />
      {meta.label}
    </span>
  )
}

/**
 * Discloses a registered capability that is simulated or planned, with its
 * explanation as a tooltip. Working capabilities render nothing.
 */
export function CapabilityBadge({ id }: { id: CapabilityId }) {
  const capability = capabilities[id]
  if (capability.status === 'working') return null
  return (
    <span title={capability.explanation}>
      <StatusTag status={capability.status} />
    </span>
  )
}
