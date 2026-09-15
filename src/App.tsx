import { WorkbenchProvider } from './app/WorkbenchContext.tsx'
import { WorkbenchShell } from './app/shell/WorkbenchShell.tsx'

export function App() {
  return (
    <WorkbenchProvider>
      <WorkbenchShell />
    </WorkbenchProvider>
  )
}
