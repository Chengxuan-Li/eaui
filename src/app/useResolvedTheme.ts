import { useEffect, useState } from 'react'
import { useServices } from './WorkbenchContext.tsx'
import type { ResolvedTheme } from './viz/palette.ts'

const DARK_QUERY = '(prefers-color-scheme: dark)'

/** The theme actually shown: the user's choice, or the system setting for "system". */
export function useResolvedTheme(): ResolvedTheme {
  const { theme } = useServices()
  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia(DARK_QUERY).matches,
  )

  useEffect(() => {
    const query = window.matchMedia(DARK_QUERY)
    const update = () => setSystemDark(query.matches)
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])

  if (theme === 'system') return systemDark ? 'dark' : 'light'
  return theme
}
