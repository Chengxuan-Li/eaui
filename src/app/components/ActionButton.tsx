import type { ReactNode } from 'react'
import { useServices } from '../WorkbenchContext.tsx'
import { cx } from '../cx.ts'
import styles from './components.module.css'

type ActionButtonProps = {
  /** Accessible name, including the object acted on. */
  label: string
  children: ReactNode
  /** Why the action cannot run; the button stays focusable and explains itself. */
  disabledReason: string | null
  onPress: () => void
  variant?: 'default' | 'primary'
}

/**
 * A button that stays focusable when unavailable. Pressing it records the
 * reason in the operation log (shown in the status bar) instead of silently
 * doing nothing.
 */
export function ActionButton({
  label,
  children,
  disabledReason,
  onPress,
  variant = 'default',
}: ActionButtonProps) {
  const { workbench } = useServices()
  return (
    <button
      type="button"
      className={cx(styles.button, variant === 'primary' && styles.primary)}
      aria-label={label}
      aria-disabled={disabledReason ? true : undefined}
      title={disabledReason ?? label}
      onClick={() => {
        if (disabledReason) {
          workbench.record({
            type: 'action.blocked',
            title: label,
            status: 'rejected',
            summary: '',
            issues: [{ path: '', message: disabledReason }],
          })
          return
        }
        onPress()
      }}
    >
      {children}
    </button>
  )
}
