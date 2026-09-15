import { CircleX, Cpu, ListChecks, TriangleAlert } from 'lucide-react'
import { ProgressBar } from 'react-aria-components'
import type { Task } from '../../domain/types.ts'
import { useStageStates, useWorkbenchSnapshot } from '../WorkbenchContext.tsx'
import { StatusTag } from '../components/CapabilityBadge.tsx'
import { StateBadge } from '../components/StateBadge.tsx'
import { cx } from '../cx.ts'
import type { PageId } from '../layout/layoutController.ts'
import styles from './shell.module.css'

// Progress ticks are system bookkeeping; announcing each would drown out
// the operations people care about.
const QUIET_OPERATION_TYPES = new Set(['task.start', 'task.reportProgress'])

export function StatusBar({
  onOpenPage,
}: {
  onOpenPage: (page: PageId) => void
}) {
  const state = useWorkbenchSnapshot((snapshot) => snapshot.state)
  const log = useWorkbenchSnapshot((snapshot) => snapshot.log)
  const stageStates = useStageStates()

  const currentId = state.workflow.currentStageId
  const currentStage = currentId ? state.workflow.stages[currentId] : undefined
  const activeTasks = state.taskIds.flatMap((id): Task[] => {
    const task = state.tasks[id]
    return task && (task.status === 'queued' || task.status === 'running')
      ? [task]
      : []
  })
  const errors = state.issues.filter(
    (issue) => issue.severity === 'error',
  ).length
  const warnings = state.issues.filter(
    (issue) => issue.severity === 'warning',
  ).length
  const lastOperation = [...log]
    .reverse()
    .find((entry) => !QUIET_OPERATION_TYPES.has(entry.type))
  const rejected = lastOperation?.status === 'rejected'
  const notice = lastOperation
    ? rejected
      ? (lastOperation.issues[0]?.message ??
        `${lastOperation.title} was not applied.`)
      : (lastOperation.summary ?? lastOperation.title)
    : 'Ready.'

  return (
    <footer className={styles.statusBar} aria-label="Status bar">
      <span className={styles.statusItem}>
        {state.project.name}
        {state.project.location ? '' : ' · no location yet'}
      </span>
      {currentStage ? (
        <span className={styles.statusItem}>
          Stage: {currentStage.name}{' '}
          <StateBadge state={stageStates[currentStage.id] ?? 'future'} />
        </span>
      ) : null}
      <button
        type="button"
        className={styles.statusButton}
        aria-label={`${errors} errors and ${warnings} warnings. Open Issues.`}
        onClick={() => onOpenPage('issues')}
      >
        <CircleX size={14} aria-hidden="true" /> {errors}
        <TriangleAlert size={14} aria-hidden="true" /> {warnings}
      </button>
      <button
        type="button"
        className={styles.statusButton}
        aria-label={`${activeTasks.length} active tasks. Open Tasks.`}
        onClick={() => onOpenPage('tasks')}
      >
        <ListChecks size={14} aria-hidden="true" /> {activeTasks.length}
      </button>
      {activeTasks.slice(0, 2).map((task) => (
        <ProgressBar
          key={task.id}
          className={styles.progress}
          aria-label={`${task.label} progress`}
          value={task.progress * 100}
        >
          {({ percentage }) => (
            <>
              <span className={styles.progressLabel}>{task.label}</span>
              <span className={styles.progressTrack}>
                <span
                  className={styles.progressFill}
                  style={{ width: `${percentage ?? 0}%` }}
                />
              </span>
            </>
          )}
        </ProgressBar>
      ))}
      <span className={styles.statusItem} title="Illustrative, not measured">
        <Cpu size={14} aria-hidden="true" /> 4 workers{' '}
        <StatusTag status="simulated" />
      </span>
      <span
        className={cx(styles.notice, rejected && styles.noticeRejected)}
        role="status"
        data-testid="status-notice"
      >
        {rejected ? <TriangleAlert size={14} aria-hidden="true" /> : null}
        {notice}
      </span>
    </footer>
  )
}
