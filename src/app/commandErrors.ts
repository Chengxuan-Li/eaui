import type { ValidationIssue } from '../domain/commands.ts'

/** Splits command issues into per-field messages (for React Aria Form) and a general message. */
export function splitIssues(issues: ValidationIssue[]): {
  fieldErrors: Record<string, string>
  general: string | null
} {
  const fieldErrors: Record<string, string> = {}
  const general: string[] = []
  for (const issue of issues) {
    if (issue.path && !(issue.path in fieldErrors)) {
      fieldErrors[issue.path] = issue.message
    } else if (!issue.path) {
      general.push(issue.message)
    }
  }
  return { fieldErrors, general: general.length > 0 ? general.join(' ') : null }
}
