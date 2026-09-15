import { Check } from 'lucide-react'
import {
  Button,
  Keyboard,
  Menu,
  MenuItem,
  MenuTrigger,
  Popover,
  Separator,
  Text,
  Toolbar,
} from 'react-aria-components'
import { useWorkbenchSnapshot } from '../WorkbenchContext.tsx'
import { ACTION_GROUPS, type AppAction } from '../actions.ts'
import { toAriaKeyShortcut } from '../shortcuts.ts'
import styles from './shell.module.css'

const QUICK_ACTION_IDS = [
  'file.save',
  'edit.undo',
  'edit.redo',
  'run.current',
  'view.toggleAssets',
  'view.toggleReasoning',
  'view.toggleMaximize',
  'view.resetLayout',
  'view.fullScreen',
  'help.comments',
]

type RibbonProps = {
  actions: AppAction[]
  invoke: (action: AppAction) => void
}

export function Ribbon({ actions, invoke }: RibbonProps) {
  const projectName = useWorkbenchSnapshot(
    (snapshot) => snapshot.state.project.name,
  )
  const palette = actions.find((action) => action.id === 'help.palette')
  const quickActions = QUICK_ACTION_IDS.flatMap((id) => {
    const action = actions.find((candidate) => candidate.id === id)
    return action ? [action] : []
  })

  return (
    <header className={styles.ribbon}>
      <div className={styles.brand}>
        <span className={styles.product}>EnergyAtlas UI</span>
        <h1 className={styles.project}>{projectName}</h1>
      </div>
      <Toolbar aria-label="Workbench commands" className={styles.toolbar}>
        {ACTION_GROUPS.map((group) => (
          <RibbonMenu
            key={group}
            label={group}
            actions={actions.filter((action) => action.group === group)}
            invoke={invoke}
          />
        ))}
        <Separator orientation="vertical" className={styles.separator} />
        {palette ? (
          <button
            type="button"
            className={styles.searchButton}
            aria-keyshortcuts={toAriaKeyShortcut(palette.shortcut ?? '')}
            onClick={() => invoke(palette)}
          >
            Search commands
            <kbd className={styles.kbd}>{palette.shortcut}</kbd>
          </button>
        ) : null}
        <Separator orientation="vertical" className={styles.separator} />
        {quickActions.map((action) => (
          <QuickButton key={action.id} action={action} invoke={invoke} />
        ))}
      </Toolbar>
    </header>
  )
}

function QuickButton({
  action,
  invoke,
}: {
  action: AppAction
  invoke: (action: AppAction) => void
}) {
  const Icon = action.icon
  const hint = action.shortcut ? ` (${action.shortcut})` : ''
  return (
    <button
      type="button"
      className={styles.quickButton}
      aria-label={action.label}
      aria-pressed={action.pressed}
      aria-disabled={action.disabledReason ? true : undefined}
      aria-keyshortcuts={
        action.shortcut ? toAriaKeyShortcut(action.shortcut) : undefined
      }
      title={action.disabledReason ?? `${action.label}${hint}`}
      onClick={() => invoke(action)}
    >
      {Icon ? <Icon size={16} aria-hidden="true" /> : action.label}
    </button>
  )
}

function RibbonMenu({
  label,
  actions,
  invoke,
}: {
  label: string
  actions: AppAction[]
  invoke: (action: AppAction) => void
}) {
  return (
    <MenuTrigger>
      <Button className={styles.menuButton}>{label}</Button>
      <Popover className={styles.popover} placement="bottom start">
        <Menu
          aria-label={`${label} menu`}
          className={styles.menu}
          items={actions}
          disabledKeys={actions
            .filter((action) => action.disabledReason)
            .map((action) => action.id)}
          onAction={(key) => {
            const action = actions.find((candidate) => candidate.id === key)
            if (action) invoke(action)
          }}
        >
          {(action) => (
            <MenuItem
              id={action.id}
              textValue={action.label}
              className={styles.menuItem}
            >
              <span className={styles.menuCheck} aria-hidden="true">
                {action.pressed ? <Check size={14} /> : null}
              </span>
              <Text slot="label" className={styles.menuLabel}>
                {action.label}
                {action.pressed ? (
                  <span className="visually-hidden"> (on)</span>
                ) : null}
              </Text>
              {action.disabledReason ? (
                <Text slot="description" className={styles.menuDescription}>
                  {action.disabledReason}
                </Text>
              ) : null}
              {action.shortcut ? (
                <Keyboard className={styles.kbd}>{action.shortcut}</Keyboard>
              ) : null}
            </MenuItem>
          )}
        </Menu>
      </Popover>
    </MenuTrigger>
  )
}
