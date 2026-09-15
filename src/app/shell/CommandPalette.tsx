import {
  Autocomplete,
  Dialog,
  Input,
  Keyboard,
  Menu,
  MenuItem,
  Modal,
  ModalOverlay,
  SearchField,
  Text,
  useFilter,
} from 'react-aria-components'
import type { AppAction } from '../actions.ts'
import styles from './shell.module.css'

type CommandPaletteProps = {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  actions: AppAction[]
  invoke: (action: AppAction) => void
}

export function CommandPalette({
  isOpen,
  onOpenChange,
  actions,
  invoke,
}: CommandPaletteProps) {
  const { contains } = useFilter({ sensitivity: 'base' })
  return (
    <ModalOverlay
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      isDismissable
      className={styles.overlay}
    >
      <Modal className={styles.paletteModal}>
        <Dialog aria-label="Command palette" className={styles.dialog}>
          <Autocomplete filter={contains}>
            <SearchField
              aria-label="Search commands"
              autoFocus
              className={styles.paletteSearch}
            >
              <Input
                placeholder="Type a command"
                className={styles.paletteInput}
              />
            </SearchField>
            <Menu
              items={actions}
              className={styles.paletteMenu}
              disabledKeys={actions
                .filter((action) => action.disabledReason)
                .map((action) => action.id)}
              renderEmptyState={() => (
                <p className={styles.paletteEmpty}>No matching commands.</p>
              )}
              onAction={(key) => {
                const action = actions.find((candidate) => candidate.id === key)
                onOpenChange(false)
                if (action) invoke(action)
              }}
            >
              {(action) => (
                <MenuItem
                  id={action.id}
                  textValue={`${action.group} ${action.label}`}
                  className={styles.menuItem}
                >
                  <span className={styles.menuCheck} aria-hidden="true" />
                  <Text slot="label" className={styles.menuLabel}>
                    {action.label}
                    <span className={styles.paletteGroup}>
                      {' '}
                      · {action.group}
                    </span>
                  </Text>
                  {action.disabledReason ? (
                    <Text slot="description" className={styles.menuDescription}>
                      {action.disabledReason}
                    </Text>
                  ) : null}
                  {action.shortcut ? (
                    <Keyboard className={styles.kbd}>
                      {action.shortcut}
                    </Keyboard>
                  ) : null}
                </MenuItem>
              )}
            </Menu>
          </Autocomplete>
        </Dialog>
      </Modal>
    </ModalOverlay>
  )
}
