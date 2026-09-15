import {
  CircleCheck,
  CircleX,
  Info,
  Link2,
  ShieldAlert,
  TriangleAlert,
  Wrench,
} from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { Input, Label, TextField } from 'react-aria-components'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useAgentSnapshot, useServices } from '../WorkbenchContext.tsx'
import { toolInputOf, toolTypeOf } from '../agent/tools.ts'
import type { ReferenceTarget, TranscriptItem } from '../agent/types.ts'
import { ActionButton } from '../components/ActionButton.tsx'
import { CapabilityBadge } from '../components/CapabilityBadge.tsx'
import componentStyles from '../components/components.module.css'
import formStyles from '../components/forms.module.css'
import { cx } from '../cx.ts'
import styles from './reasoning.module.css'

type EntryProps = {
  item: TranscriptItem
  onFollow: (target: ReferenceTarget) => void
  onApprove: (itemId: string) => void
  onDecline: (itemId: string) => void
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
            {item.status === 'pending'
              ? 'Waiting for your approval'
              : item.status === 'approved'
                ? 'Approved'
                : 'Rejected'}
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

/**
 * The Reasoning mode of the context panel: the agent transcript with tool
 * calls linked to operation log entries, approvals, references, and chat
 * (decisions 0005, 0006, and 0011).
 */
export function ReasoningMode() {
  const { agent, layout, workbench, setContextMode } = useServices()
  const status = useAgentSnapshot((snapshot) => snapshot.status)
  const transcript = useAgentSnapshot((snapshot) => snapshot.transcript)
  const presets = useAgentSnapshot((snapshot) => snapshot.presets)
  const [message, setMessage] = useState('')
  const endRef = useRef<HTMLDivElement>(null)
  const presetsLabelId = useId()

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: 'nearest' })
  }, [transcript.length])

  const busyReason =
    status === 'running'
      ? 'A session is running. Wait for it to finish or stop it.'
      : status === 'awaitingApproval'
        ? 'Answer the pending approval first.'
        : null

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
        setContextMode('inspection')
        return
    }
  }

  const send = () => {
    if (busyReason || !message.trim()) return
    agent.send(message)
    setMessage('')
  }

  return (
    <div className={styles.reasoning}>
      <header className={styles.agentHeader}>
        <p className={styles.agentName}>{agent.label}</p>
        <CapabilityBadge id="agent.sessions" />
      </header>

      <div role="log" aria-label="Agent transcript" className={styles.log}>
        {transcript.length === 0 ? (
          <p className={styles.intro}>
            Choose a prepared session or type a request. Sessions replay tool
            calls through the same commands, view operations, and layout
            operations as the workbench controls, and changes to the project
            wait for your approval.
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
        <p id={presetsLabelId} className={styles.presetsLabel}>
          Prepared sessions
        </p>
        <div
          className={styles.presets}
          role="group"
          aria-labelledby={presetsLabelId}
        >
          {presets.map((preset) => (
            <ActionButton
              key={preset.id}
              label={`Start session: ${preset.label}`}
              disabledReason={busyReason}
              onPress={() => agent.startPreset(preset.id)}
            >
              {preset.label}
            </ActionButton>
          ))}
        </div>
        <form
          className={styles.composer}
          onSubmit={(event) => {
            event.preventDefault()
            send()
          }}
        >
          <TextField
            className={styles.messageField}
            value={message}
            onChange={setMessage}
          >
            <Label className="visually-hidden">Message the agent</Label>
            <Input
              className={formStyles.input}
              placeholder="Ask the agent"
              maxLength={500}
            />
          </TextField>
          <ActionButton
            label="Send message"
            disabledReason={
              busyReason ?? (message.trim() ? null : 'Type a message first.')
            }
            onPress={send}
          >
            Send
          </ActionButton>
          {status !== 'idle' ? (
            <ActionButton
              label="Stop the agent session"
              disabledReason={null}
              onPress={() => agent.stop()}
            >
              Stop
            </ActionButton>
          ) : null}
        </form>
      </div>
    </div>
  )
}
