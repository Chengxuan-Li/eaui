import { Clock } from 'lucide-react'
import { useId } from 'react'
import styles from './components.module.css'

type NotBuiltYetProps = {
  title: string
  buildStage: number
  description: string
}

/** Honest placeholder for a surface that a later first-slice build stage delivers. */
export function NotBuiltYet({
  title,
  buildStage,
  description,
}: NotBuiltYetProps) {
  const headingId = useId()
  return (
    <section className={styles.page} aria-labelledby={headingId}>
      <h2 id={headingId}>{title}</h2>
      <p className={styles.notice}>
        <Clock size={16} aria-hidden="true" />
        Not built yet: this surface arrives in first-slice build stage{' '}
        {buildStage}.
      </p>
      <p className={styles.muted}>{description}</p>
    </section>
  )
}
