import { describe, expect, it } from 'vitest'
import {
  readBasemapPreference,
  storeBasemapPreference,
} from './basemapPreference.ts'

function memoryStorage(): Storage {
  const values = new Map<string, string>()
  return {
    get length() {
      return values.size
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => void values.delete(key),
    setItem: (key, value) => void values.set(key, value),
  }
}

describe('basemap preference', () => {
  it('is on by default, including without storage', () => {
    expect(readBasemapPreference(memoryStorage())).toBe(true)
    expect(readBasemapPreference(null)).toBe(true)
  })

  it('round-trips off and on', () => {
    const storage = memoryStorage()
    storeBasemapPreference(storage, false)
    expect(readBasemapPreference(storage)).toBe(false)
    storeBasemapPreference(storage, true)
    expect(readBasemapPreference(storage)).toBe(true)
  })

  it('stays on when storage throws', () => {
    const blocked = {
      ...memoryStorage(),
      getItem: () => {
        throw new Error('blocked')
      },
    }
    expect(readBasemapPreference(blocked)).toBe(true)
  })
})
