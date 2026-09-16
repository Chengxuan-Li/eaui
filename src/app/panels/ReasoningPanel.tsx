import {
  ChevronDown,
  CircleCheck,
  CircleX,
  CornerDownLeft,
  Info,
  Link2,
  Plus,
  ShieldAlert,
  TriangleAlert,
  Wrench,
  X,
} from 'lucide-react'
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import {
  Button,
  Label,
  Menu,
  MenuItem,
  MenuTrigger,
  Popover,
  Text,
  TextArea,
  TextField,
} from 'react-aria-components'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useAgentSnapshot, useServices } from '../WorkbenchContext.tsx'
import {
  PERMISSION_MODES,
  permissionModeOption,
  SEND_MODES,
  sendModeOption,
  type ModeOption,
} from '../agent/modes.ts'
import { suggestNextSteps } from '../agent/suggestions.ts'
import { toolInputOf, toolTypeOf } from '../agent/tools.ts'
import type {
  PermissionMode,
  ReferenceTarget,
  SendMode,
  TranscriptItem,
} from '../agent/types.ts'
import { ActionButton } from '../components/ActionButton.tsx'
import { CapabilityBadge } from '../components/CapabilityBadge.tsx'
import componentStyles from '../components/components.module.css'
import { cx } from '../cx.ts'
import styles from './reasoning.module.css'

type EntryProps = {
  item: TranscriptItem
  onFollow: (target: ReferenceTarget) => void
  onApprove: (itemId: string) => void
  onDecline: (itemId: string) => void
}

function approvalLabel(
  item: Extract<TranscriptItem, { kind: 'approval' }>,
): string {
  if (item.status === 'pending') return 'Waiting for your approval'
  if (item.status === 'declined') return 'Rejected'
  return item.decidedBy
    ? `Approved by ${permissionModeOption(item.decidedBy).label} mode`
    : 'Approved'
}

function TranscriptEntry({ item, onFollow, onApprove, onDecline }: EntryProps) {
  switch (item.kind) {
    case 'user':
      return (
        <li className={cx(styles.entry, styles.user)}>
          <p className={styles.speaker}>You</p>
          <p className={styles.text}>{item.text}</p>
        </li>
      )
    case 'agent':
      return (
        <li className={styles.entry}>
          <p className={styles.speaker}>Agent</p>
          <div className={styles.markdown}>
            <Markdown remarkPlugins={[remarkGfm]}>{item.markdown}</Markdown>
          </div>
        </li>
      )
    case 'reasoning':
      return (
        <li className={cx(styles.entry, styles.reasoningStep)}>
          <details>
            <summary>Reasoning</summary>
            <p className={styles.text}>{item.text}</p>
          </details>
        </li>
      )
    case 'reference':
      return (
        <li className={styles.entry}>
          <button
            type="button"
            className={styles.linkButton}
            onClick={() => onFollow(item.target)}
          >
            <Link2 size={14} aria-hidden="true" className={styles.icon} />
            {item.label}
          </button>
        </li>
      )
    case 'tool': {
      const applied = item.result.status === 'applied'
      return (
        <li
          className={cx(styles.entry, styles.tool)}
          aria-label={`Tool call: ${item.title}`}
        >
          <div className={styles.toolRow}>
            <Wrench size={14} aria-hidden="true" className={styles.icon} />
            <span className={styles.toolTitle}>{item.title}</span>
            {applied ? (
              <span
                className={cx(
                  componentStyles.state,
                  componentStyles.stateQuiet,
                )}
              >
                <CircleCheck size={12} aria-hidden="true" />
                Applied
              </span>
            ) : (
              <span
                className={cx(
                  componentStyles.state,
                  componentStyles.stateAttention,
                  componentStyles.danger,
                )}
              >
                <CircleX size={12} aria-hidden="true" />
                Rejected
              </span>
            )}
          </div>
          <p className={styles.toolMeta}>
            {toolTypeOf(item.call)} ·{' '}
            {item.result.operationIds.join(', ') || 'no operation'}
          </p>
          {item.result.summary ? (
            <p className={styles.text}>{item.result.summary}</p>
          ) : null}
          {item.result.issues.map((issue) => (
            <p key={issue.message} className={styles.toolIssue}>
              {issue.message}
            </p>
          ))}
          <details className={styles.toolDetails}>
            <summary>Input</summary>
            <pre>{JSON.stringify(toolInputOf(item.call), null, 2)}</pre>
          </details>
        </li>
      )
    }
    case 'approval':
      return (
        <li
          className={cx(
            styles.entry,
            styles.approval,
            item.status === 'pending' && styles.approvalPending,
          )}
          aria-label={item.title}
        >
          <p className={styles.approvalLabel}>
            <ShieldAlert size={14} aria-hidden="true" />
            {approvalLabel(item)}
          </p>
          <p className={styles.approvalTitle}>{item.title}</p>
          {item.description ? (
            <p className={styles.text}>{item.description}</p>
          ) : null}
          <ul className={styles.callList}>
            {item.callTitles.map((title, index) => (
              <li key={`${index}-${title}`}>{title}</li>
            ))}
          </ul>
          {item.status === 'pending' ? (
            <div className={styles.approvalActions}>
              <ActionButton
                label={`Approve: ${item.title}`}
                variant="primary"
                disabledReason={null}
                onPress={() => onApprove(item.id)}
              >
                Approve
              </ActionButton>
              <ActionButton
                label={`Reject: ${item.title}`}
                disabledReason={null}
                onPress={() => onDecline(item.id)}
              >
                Reject
              </ActionButton>
            </div>
          ) : null}
        </li>
      )
    case 'notice': {
      const Icon =
        item.tone === 'error'
          ? CircleX
          : item.tone === 'warning'
            ? TriangleAlert
            : Info
      return (
        <li
          className={cx(
            styles.entry,
            styles.notice,
            item.tone === 'error'
              ? styles.noticeError
              : item.tone === 'warning'
                ? styles.noticeWarning
                : styles.noticeInfo,
          )}
        >
          <Icon size={14} aria-hidden="true" className={styles.icon} />
          <span>{item.text}</span>
        </li>
      )
    }
  }
}

/** A compact menu that picks one mode and explains each choice. */
function ModeMenu<Id extends string>({
  label,
  options,
  selected,
  onSelect,
  triggerLabel,
  className,
}: {
  label: string
  options: ModeOption<Id>[]
  selected: Id
  onSelect: (id: Id) => void
  triggerLabel: string
  className: string | undefined
}) {
  return (
    <MenuTrigger>
      <Button className={className} aria-label={`${label}: ${triggerLabel}`}>
        {triggerLabel}
        <ChevronDown size={12} aria-hidden="true" />
      </Button>
      <Popover className={styles.popover} placement="top start">
        <Menu
          className={styles.menu}
          onAction={(key) => onSelect(key as Id)}
          selectionMode="single"
          selectedKeys={[selected]}
        >
          {options.map((option) => (
            <MenuItem
              key={option.id}
              id={option.id}
              className={styles.menuItem}
              textValue={option.label}
            >
              <Text slot="label" className={styles.menuLabel}>
                {option.label}
              </Text>
              <Text slot="description" className={styles.menuDescription}>
                {option.description}
              </Text>
            </MenuItem>
          ))}
        </Menu>
      </Popover>
    </MenuTrigger>
  )
}

/** Grows with its content instead of staying a one-line field. */
function useAutoGrow(value: string) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useLayoutEffect(() => {
    const field = ref.current
    if (!field) return
    field.style.height = 'auto'
    field.style.height = `${field.scrollHeight}px`
  }, [value])
  return ref
}

/**
 * The Reasoning panel: the agent transcript with tool calls linked to
 * operation log entries, approvals, references, and a composer whose send and
 * permission modes decide when a message arrives and how much the agent may do
 * without asking (decisions 0005, 0006, 0011, and 0016).
 */
export function ReasoningPanel() {
  const { agent, layout, workbench, showInspection } = useServices()
  const status = useAgentSnapshot((snapshot) => snapshot.status)
  const transcript = useAgentSnapshot((snapshot) => snapshot.transcript)
  const presets = useAgentSnapshot((snapshot) => snapshot.presets)
  const permissionMode = useAgentSnapshot((snapshot) => snapshot.permissionMode)
  const queued = useAgentSnapshot((snapshot) => snapshot.queued)
  const ranSessionIds = useAgentSnapshot((snapshot) => snapshot.ranSessionIds)
  const [message, setMessage] = useState('')
  const [sendMode, setSendMode] = useState<SendMode>('send')
  const endRef = useRef<HTMLDivElement>(null)
  const textAreaRef = useAutoGrow(message)
  const suggestionsLabelId = useId()
  const queueLabelId = useId()

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: 'nearest' })
  }, [transcript.length])

  const suggestions = suggestNextSteps(presets, ranSessionIds)
  const busyReason =
    status === 'running'
      ? 'A session is running. Wait for it to finish or stop it.'
      : status === 'awaitingApproval'
        ? 'Answer the pending approval first.'
        : null
  const sendBlocker = agent.sendBlocker(sendMode, message)
  const sendOption = sendModeOption(sendMode)

  const follow = (target: ReferenceTarget) => {
    switch (target.type) {
      case 'page':
        layout.openPage(target.page)
        return
      case 'stage':
        workbench.execute({
          type: 'workflow.setCurrentStage',
          input: { stageId: target.stageId },
        })
        layout.openPage('roadmap')
        return
      case 'inspection':
        showInspection()
        return
    }
  }

  const submit = () => {
    if (sendBlocker) return
    agent.send(message, sendMode)
    setMessage('')
  }

  return (
    <section className={styles.reasoning} aria-label="Reasoning">
      <header className={styles.agentHeader}>
        <p className={styles.agentName}>{agent.label}</p>
        <CapabilityBadge id="agent.sessions" />
      </header>

      {/* Scrollable once the composer takes height, so it must be reachable
          by keyboard (axe scrollable-region-focusable). */}
      <div
        role="log"
        aria-label="Agent transcript"
        className={styles.log}
        tabIndex={0}
      >
        {transcript.length === 0 ? (
          <p className={styles.intro}>
            Choose a suggested next step or type a request. Sessions replay tool
            calls through the same commands, view operations, and layout
            operations as the workbench controls, and what the agent may do
            without asking follows the permission mode below.
          </p>
        ) : (
          <ol className={styles.transcript}>
            {transcript.map((item) => (
              <TranscriptEntry
                key={item.id}
                item={item}
                onFollow={follow}
                onApprove={(itemId) => agent.approve(itemId)}
                onDecline={(itemId) => agent.decline(itemId)}
              />
            ))}
          </ol>
        )}
        <div ref={endRef} />
      </div>

      <div className={styles.controls}>
        <p id={suggestionsLabelId} className={styles.controlsLabel}>
          Suggested next steps based on your conversation
        </p>
        <ul className={styles.suggestions} aria-labelledby={suggestionsLabelId}>
          {suggestions.map((suggestion) => (
            <li key={suggestion.id}>
              <ActionButton
                label={`Start session: ${suggestion.label}`}
                disabledReason={busyReason}
                onPress={() => agent.startPreset(suggestion.id)}
              >
                {suggestion.label}
              </ActionButton>
              <span className={styles.suggestionReason}>
                {suggestion.reason}
              </span>
            </li>
          ))}
        </ul>

        {queued.length > 0 ? (
          <>
            <p id={queueLabelId} className={styles.controlsLabel}>
              Waiting for the agent
            </p>
            <ul className={styles.queue} aria-labelledby={queueLabelId}>
              {queued.map((text, index) => (
                <li key={`${index}-${text}`} className={styles.queueItem}>
                  <span className={styles.queueText}>{text}</span>
                  <button
                    type="button"
                    className={styles.queueRemove}
                    aria-label={`Remove queued message: ${text}`}
                    onClick={() => agent.dropQueued(index)}
                  >
                    <X size={12} aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : null}

        <form
          className={styles.composer}
          onSubmit={(event) => {
            event.preventDefault()
            submit()
          }}
        >
          <div className={styles.inputRow}>
            <TextField
              className={styles.messageField}
              value={message}
              onChange={setMessage}
            >
              <Label className="visually-hidden">Message the agent</Label>
              <TextArea
                ref={textAreaRef}
                className={styles.messageInput}
                placeholder="Ask the agent"
                rows={1}
                maxLength={500}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault()
                    submit()
                  }
                }}
              />
            </TextField>
            <div className={styles.sendGroup}>
              <ActionButton
                label={sendOption.label}
                variant="primary"
                disabledReason={sendBlocker}
                onPress={submit}
              >
                <CornerDownLeft size={14} aria-hidden="true" />
              </ActionButton>
              <ModeMenu
                label="Send mode"
                options={SEND_MODES}
                selected={sendMode}
                onSelect={setSendMode}
                triggerLabel={sendOption.label}
                className={styles.modeButton}
              />
            </div>
          </div>

          {/* Outside the box: what a message carries, who approves, and which
              model answers. The first and last are planned, so they explain
              themselves instead of doing nothing. */}
          <div className={styles.composerTools}>
            <ActionButton
              label="Attach context to the message"
              disabledReason="Attaching documents, images, or selections to a message is planned."
              onPress={() => {}}
            >
              <Plus size={14} aria-hidden="true" />
            </ActionButton>
            <ModeMenu
              label="Permission mode"
              options={PERMISSION_MODES}
              selected={permissionMode}
              onSelect={(mode: PermissionMode) => agent.setPermissionMode(mode)}
              triggerLabel={permissionModeOption(permissionMode).label}
              className={styles.modeButton}
            />
            <ActionButton
              label="Choose a model and reasoning effort"
              disabledReason="Choosing a language model and its reasoning effort is planned; this prototype replays scripted sessions."
              onPress={() => {}}
            >
              Scripted agent
            </ActionButton>
            <CapabilityBadge id="agent.reasoningEffort" />
            {status !== 'idle' ? (
              <ActionButton
                label="Stop the agent session"
                disabledReason={null}
                onPress={() => agent.stop()}
              >
                Stop
              </ActionButton>
            ) : null}
          </div>
        </form>
      </div>
    </section>
  )
}
