import { useId } from 'react'
import { Checkbox, Label, Radio, RadioGroup } from 'react-aria-components'
import { useServices } from '../WorkbenchContext.tsx'
import { APPEARANCE_LIST, type Appearance } from '../appearance/appearances.ts'
import { ActionButton } from '../components/ActionButton.tsx'
import { CapabilityBadge } from '../components/CapabilityBadge.tsx'
import { CapabilityTable } from '../components/CapabilityTable.tsx'
import styles from '../components/components.module.css'
import formStyles from '../components/forms.module.css'
import { isAppearancePreference } from '../theme.ts'
import pageStyles from './pages.module.css'

function Swatches({ appearance }: { appearance: Appearance }) {
  const colors = [
    appearance.chrome.bg,
    appearance.chrome.text,
    appearance.chrome.accent,
    ...appearance.data.categorical,
  ]
  return (
    <span className={pageStyles.swatches} aria-hidden="true">
      {colors.map((color, index) => (
        <span
          key={`${index}-${color}`}
          className={pageStyles.swatch}
          style={{ background: color }}
        />
      ))}
    </span>
  )
}

export function SettingsPage() {
  const headingId = useId()
  const {
    appearancePreference,
    appearance,
    setAppearance,
    layout,
    basemapEnabled,
    setBasemapEnabled,
  } = useServices()

  return (
    <section className={styles.page} aria-labelledby={headingId}>
      <h2 id={headingId}>Settings</h2>

      <RadioGroup
        className={pageStyles.radioGroup}
        value={appearancePreference}
        onChange={(value) => {
          if (isAppearancePreference(value)) setAppearance(value)
        }}
      >
        <Label className={pageStyles.label}>Appearance</Label>
        <div className={pageStyles.appearanceOptions}>
          <Radio className={pageStyles.appearanceOption} value="system">
            <span className={pageStyles.optionText}>
              <span className={pageStyles.optionLabel}>System</span>
              <span className={pageStyles.optionDescription}>
                Light or Dark, following this computer&rsquo;s setting.
                {appearancePreference === 'system'
                  ? ` Showing ${appearance.label}.`
                  : ''}
              </span>
            </span>
          </Radio>
          {APPEARANCE_LIST.map((option) => (
            <Radio
              key={option.id}
              className={pageStyles.appearanceOption}
              value={option.id}
            >
              <span className={pageStyles.optionText}>
                <span className={pageStyles.optionLabel}>{option.label}</span>
                <span className={pageStyles.optionDescription}>
                  {option.description}
                </span>
              </span>
              <Swatches appearance={option} />
            </Radio>
          ))}
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

      <h3>Map</h3>
      <Checkbox
        className={formStyles.checkbox}
        isSelected={basemapEnabled}
        onChange={setBasemapEnabled}
      >
        Show the OpenFreeMap basemap
      </Checkbox>
      <p className={styles.muted}>
        Streets, water, and labels load from OpenFreeMap over the network and
        follow the appearance. When off, or when the tiles cannot load,
        footprints are shown on a plain background. Map data &copy;
        OpenStreetMap contributors.
      </p>

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
