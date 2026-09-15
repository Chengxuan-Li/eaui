import type { Scheduler } from '../domain/simulator.ts'

/** A scheduler for tests: callbacks run only when the test steps it. */
export function manualScheduler() {
  const queue: { callback: () => void; cancelled: boolean }[] = []
  const scheduler: Scheduler = {
    schedule(callback) {
      const job = { callback, cancelled: false }
      queue.push(job)
      return () => {
        job.cancelled = true
      }
    },
  }
  const runNext = () => {
    const job = queue.shift()
    if (job && !job.cancelled) job.callback()
  }
  const runAll = (limit = 100) => {
    for (let count = 0; queue.length > 0 && count < limit; count++) runNext()
  }
  const pending = () => queue.filter((job) => !job.cancelled).length
  return { scheduler, runNext, runAll, pending }
}
