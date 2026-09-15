import { Info, TriangleAlert } from 'lucide-react'
import { useId, useMemo, type ReactNode } from 'react'
import { Tab, TabList, TabPanel, Tabs } from 'react-aria-components'
import { useServices, useWorkbenchSnapshot } from '../WorkbenchContext.tsx'
import { ActionButton } from '../components/ActionButton.tsx'
import { CapabilityBadge } from '../components/CapabilityBadge.tsx'
import { ReasoningMode } from './ReasoningMode.tsx'
import styles from './context.module.css'
import {
  buildInspection,
  type Fact,
  type LinkedEntity,
  type MultipleInspection,
  type SingleInspection,
} from './inspection.ts'

/**
 * The right-side contextual surface (guidelines section 10): Reasoning and
 * Inspection share one panel instead of competing as separate panels.
 */
export function ContextPanel() {
  const { contextMode, setContextMode } = useServices()
  return (
    <section className={styles.panel} aria-label="Context">
      <Tabs
        className={styles.tabs}
        selectedKey={contextMode}
        onSelectionChange={(key) => {
          const next = key === 'inspection' ? 'inspection' : 'reasoning'
          if (next !== contextMode) setContextMode(next)
        }}
      >
        <TabList aria-label="Context mode" className={styles.modeSwitch}>
          <Tab id="reasoning" className={styles.mode}>
            Reasoning
          </Tab>
          <Tab id="inspection" className={styles.mode}>
            Inspection
          </Tab>
        </TabList>
        <TabPanel id="reasoning" className={styles.modePanel}>
          <ReasoningMode />
        </TabPanel>
        <TabPanel id="inspection" className={styles.modePanel}>
          <InspectionMode />
        </TabPanel>
      </Tabs>
    </section>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  const headingId = useId()
  return (
    <section className={styles.section} aria-labelledby={headingId}>
      <h4 id={headingId}>{title}</h4>
      {children}
    </section>
  )
}

function Facts({ facts }: { facts: Fact[] }) {
  return (
    <dl className={styles.facts}>
      {facts.map((fact) => (
        <div key={fact.label} className={styles.fact}>
          <dt>{fact.label}</dt>
          <dd>{fact.value}</dd>
        </div>
      ))}
    </dl>
  )
}

function EntityLinks({
  entities,
  more,
  emptyText,
  onInspect,
}: {
  entities: LinkedEntity[]
  more: number
  emptyText: string
  onInspect: (entity: LinkedEntity) => void
}) {
  if (entities.length === 0) {
    return <p className={styles.muted}>{emptyText}</p>
  }
  return (
    <>
      <ul className={styles.list}>
        {entities.map((entity) => (
          <li key={`${entity.entityType}:${entity.id}`}>
            <button
              type="button"
              className={styles.linkButton}
              onClick={() => onInspect(entity)}
            >
              {entity.label}
            </button>
          </li>
        ))}
      </ul>
      {more > 0 ? (
        <p className={styles.muted}>and {more.toLocaleString('en-US')} more</p>
      ) : null}
    </>
  )
}

function SingleView({
  inspection,
  onInspect,
}: {
  inspection: SingleInspection
  onInspect: (entity: LinkedEntity) => void
}) {
  return (
    <>
      <Section title="Properties">
        <Facts facts={inspection.properties} />
      </Section>
      <Section title="Results">
        {inspection.results.length > 0 ? (
          <Facts facts={inspection.results} />
        ) : (
          <p className={styles.muted}>{inspection.resultsHint}</p>
        )}
      </Section>
      <Section title="Warnings">
        {inspection.warnings.length === 0 ? (
          <p className={styles.muted}>No warnings.</p>
        ) : (
          <ul className={styles.list}>
            {inspection.warnings.map((warning, index) => (
              <li key={`${index}-${warning}`} className={styles.warning}>
                <TriangleAlert
                  size={14}
                  aria-hidden="true"
                  className={styles.icon}
                />
                {warning}
              </li>
            ))}
          </ul>
        )}
      </Section>
      <Section title="Linked objects">
        <EntityLinks
          entities={inspection.linked}
          more={inspection.linkedMore}
          emptyText="No linked objects."
          onInspect={onInspect}
        />
      </Section>
      <Section title="Provenance">
        <p className={styles.provenanceNote}>
          <CapabilityBadge id="workflow.stageRuns" />
        </p>
        <ul className={styles.list}>
          {inspection.provenance.map((line) => (
            <li key={line} className={styles.muted}>
              {line}
            </li>
          ))}
        </ul>
      </Section>
    </>
  )
}

function MultipleView({
  inspection,
  onInspect,
}: {
  inspection: MultipleInspection
  onInspect: (entity: LinkedEntity) => void
}) {
  return (
    <>
      <Section title="Summary">
        <Facts facts={inspection.summary} />
      </Section>
      <Section title="Selected">
        <EntityLinks
          entities={inspection.items}
          more={inspection.itemsMore}
          emptyText="Nothing selected."
          onInspect={onInspect}
        />
      </Section>
    </>
  )
}

function InspectionMode() {
  const { workbench, layout } = useServices()
  const state = useWorkbenchSnapshot((snapshot) => snapshot.state)
  const inspection = useMemo(() => buildInspection(state), [state])

  const inspect = (entity: LinkedEntity) => {
    workbench.execute({
      type: 'selection.set',
      input: { entityType: entity.entityType, ids: [entity.id] },
    })
  }

  const pageActions = (
    <>
      <ActionButton
        label="Open Map for the inspected selection"
        disabledReason={null}
        onPress={() => layout.openPage('map')}
      >
        Open Map
      </ActionButton>
      <ActionButton
        label="Open Table for the inspected selection"
        disabledReason={null}
        onPress={() => layout.openPage('table')}
      >
        Open Table
      </ActionButton>
    </>
  )

  if (inspection.kind === 'empty') {
    return (
      <div className={styles.empty}>
        <p className={styles.emptyTitle}>
          <Info size={16} aria-hidden="true" /> Nothing selected
        </p>
        <p className={styles.muted}>
          Select buildings or grid elements on the Map or Table page to see
          their properties, results, warnings, and linked objects here.
        </p>
        <div className={styles.actions}>{pageActions}</div>
      </div>
    )
  }

  return (
    <div>
      <header className={styles.header}>
        <p className={styles.eyebrow}>{inspection.eyebrow}</p>
        <h3 className={styles.title}>{inspection.title}</h3>
      </header>
      {inspection.kind === 'single' ? (
        <SingleView inspection={inspection} onInspect={inspect} />
      ) : (
        <MultipleView inspection={inspection} onInspect={inspect} />
      )}
      <div className={styles.actions}>
        {pageActions}
        <ActionButton
          label="Clear selection from Inspection"
          disabledReason={null}
          onPress={() =>
            workbench.execute({ type: 'selection.clear', input: {} })
          }
        >
          Clear selection
        </ActionButton>
      </div>
    </div>
  )
}
