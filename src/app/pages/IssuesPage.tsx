import { CircleX, Info, TriangleAlert } from 'lucide-react'
import { useId } from 'react'
import type { IssueSeverity } from '../../domain/types.ts'
import { useWorkbenchSnapshot } from '../WorkbenchContext.tsx'
import styles from '../components/components.module.css'

const SEVERITY = {
  error: { label: 'Error', icon: CircleX },
  warning: { label: 'Warning', icon: TriangleAlert },
  info: { label: 'Info', icon: Info },
} satisfies Record<IssueSeverity, unknown>

const ORDER: IssueSeverity[] = ['error', 'warning', 'info']

export function IssuesPage() {
  const headingId = useId()
  const issues = useWorkbenchSnapshot((snapshot) => snapshot.state.issues)
  const stages = useWorkbenchSnapshot(
    (snapshot) => snapshot.state.workflow.stages,
  )
  const sorted = [...issues].sort(
    (a, b) => ORDER.indexOf(a.severity) - ORDER.indexOf(b.severity),
  )

  return (
    <section className={styles.page} aria-labelledby={headingId}>
      <h2 id={headingId}>Issues</h2>
      {sorted.length === 0 ? (
        <p className={styles.empty}>
          No issues. Stage runs report warnings and errors here.
        </p>
      ) : (
        <table className={styles.table} aria-label="Issues">
          <thead>
            <tr>
              <th scope="col">Severity</th>
              <th scope="col">Message</th>
              <th scope="col">Stage</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((issue) => {
              const meta = SEVERITY[issue.severity]
              const Icon = meta.icon
              return (
                <tr key={issue.id}>
                  <td>
                    <Icon size={14} aria-hidden="true" /> {meta.label}
                  </td>
                  <td>{issue.message}</td>
                  <td>
                    {issue.stageId
                      ? (stages[issue.stageId]?.name ?? issue.stageId)
                      : ''}
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
