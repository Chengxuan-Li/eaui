import { useId } from 'react'
import type { TaskStatus } from '../../domain/types.ts'
import { useServices, useWorkbenchSnapshot } from '../WorkbenchContext.tsx'
import { ActionButton } from '../components/ActionButton.tsx'
import styles from '../components/components.module.css'

const STATUS_LABELS: Record<TaskStatus, string> = {
  queued: 'Queued',
  running: 'Running',
  succeeded: 'Succeeded',
  failed: 'Failed',
  cancelled: 'Cancelled',
}

export function TasksPage() {
  const headingId = useId()
  const { workbench } = useServices()
  const tasks = useWorkbenchSnapshot((snapshot) => snapshot.state.tasks)
  const taskIds = useWorkbenchSnapshot((snapshot) => snapshot.state.taskIds)
  const ordered = [...taskIds].reverse().flatMap((id) => {
    const task = tasks[id]
    return task ? [task] : []
  })

  return (
    <section className={styles.page} aria-labelledby={headingId}>
      <h2 id={headingId}>Tasks</h2>
      {ordered.length === 0 ? (
        <p className={styles.empty}>
          No background tasks yet. Run a workflow stage to start one.
        </p>
      ) : (
        <table className={styles.table} aria-label="Tasks">
          <thead>
            <tr>
              <th scope="col">Task</th>
              <th scope="col">Status</th>
              <th scope="col">Progress</th>
              <th scope="col">Started by</th>
              <th scope="col">Message</th>
              <th scope="col">
                <span className="visually-hidden">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {ordered.map((task) => {
              const active =
                task.status === 'queued' || task.status === 'running'
              return (
                <tr key={task.id}>
                  <td>{task.label}</td>
                  <td>{STATUS_LABELS[task.status]}</td>
                  <td>{Math.round(task.progress * 100)}%</td>
                  <td>{task.source}</td>
                  <td>{task.message ?? ''}</td>
                  <td>
                    {active ? (
                      <ActionButton
                        label={`Cancel ${task.label}`}
                        disabledReason={null}
                        onPress={() =>
                          workbench.execute({
                            type: 'task.cancel',
                            input: { taskId: task.id },
                          })
                        }
                      >
                        Cancel
                      </ActionButton>
                    ) : null}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </section>
  )
}
