import { useId } from 'react'
import { Label, Radio, RadioGroup } from 'react-aria-components'
import { useServices } from '../WorkbenchContext.tsx'
import { ActionButton } from '../components/ActionButton.tsx'
import { CapabilityBadge } from '../components/CapabilityBadge.tsx'
import { CapabilityTable } from '../components/CapabilityTable.tsx'
import styles from '../components/components.module.css'
import formStyles from './pages.module.css'

export function SettingsPage() {
  const headingId = useId()
  const { theme, setTheme, layout } = useServices()

  return (
    <section className={styles.page} aria-labelledby={headingId}>
      <h2 id={headingId}>Settings</h2>

      <RadioGroup
        className={formStyles.radioGroup}
        value={theme}
        orientation="horizontal"
        onChange={(value) => {
          if (value === 'system' || value === 'light' || value === 'dark') {
            setTheme(value)
          }
        }}
      >
        <Label className={formStyles.label}>Theme</Label>
        <div className={formStyles.radios}>
          <Radio className={formStyles.radio} value="system">
            System
          </Radio>
          <Radio className={formStyles.radio} value="light">
            Light
          </Radio>
          <Radio className={formStyles.radio} value="dark">
            Dark
          </Radio>
        </div>
      </RadioGroup>

      <h3>Layout</h3>
      <p className={styles.muted}>
        The layout is kept in this browser. Resetting restores the default
        panels and pages.
      </p>
      <ActionButton
        label="Reset layout"
        disabledReason={null}
        onPress={() => layout.reset()}
      >
        Reset layout
      </ActionButton>

      <h3>Model provider</h3>
      <p>
        <CapabilityBadge id="settings.modelProvider" /> The first slice uses
        scripted agent sessions and needs no credentials.
      </p>

      <h3>Capabilities</h3>
      <CapabilityTable />
    </section>
  )
}
