// Test probe for package spikes only; not part of the product state model.
// Playwright reads it to detect remounts and inspect library instances.

export type SpikeProbe = {
  /** Total mount events per component; never decremented, so remounts show as increases. */
  mounts: Record<string, number>
  instances: Record<string, unknown>
}

declare global {
  interface Window {
    __spike?: SpikeProbe
  }
}

function getProbe(): SpikeProbe {
  window.__spike ??= { mounts: {}, instances: {} }
  return window.__spike
}

export function recordMount(name: string): void {
  const probe = getProbe()
  probe.mounts[name] = (probe.mounts[name] ?? 0) + 1
}

export function exposeInstance(name: string, instance: unknown): void {
  getProbe().instances[name] = instance
}
