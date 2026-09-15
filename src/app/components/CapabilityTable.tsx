import { capabilities, type CapabilityId } from '../../domain/capabilities.ts'
import { StatusTag } from './CapabilityBadge.tsx'
import styles from './components.module.css'

export function CapabilityTable() {
  const ids = Object.keys(capabilities) as CapabilityId[]
  return (
    <table className={styles.table}>
      <caption>What each feature is in this prototype</caption>
      <thead>
        <tr>
          <th scope="col">Feature</th>
          <th scope="col">Status</th>
          <th scope="col">Explanation</th>
        </tr>
      </thead>
      <tbody>
        {ids.map((id) => {
          const capability = capabilities[id]
          return (
            <tr key={id}>
              <td>{capability.label}</td>
              <td>
                <StatusTag status={capability.status} />
              </td>
              <td>{capability.explanation}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
