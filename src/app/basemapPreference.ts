// Whether the Map page shows the OpenFreeMap basemap (decision 0012). On by
// default; kept in this browser like the appearance preference.
const BASEMAP_KEY = 'eaui.basemap'

export function readBasemapPreference(storage: Storage | null): boolean {
  try {
    return storage?.getItem(BASEMAP_KEY) !== 'off'
  } catch {
    return true
  }
}

export function storeBasemapPreference(
  storage: Storage | null,
  enabled: boolean,
): void {
  try {
    storage?.setItem(BASEMAP_KEY, enabled ? 'on' : 'off')
  } catch {
    // Storage is blocked; the preference applies for this session only.
  }
}
