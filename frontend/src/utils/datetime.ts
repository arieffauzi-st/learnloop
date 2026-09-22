/** due_at handling (issue #74).
 *
 *  The backend stores `due_at` as a naive UTC datetime (no timezone suffix) in a
 *  plain DateTime column. When such a string reaches `new Date(...)`, JS parses
 *  it as *browser-local* time, so the displayed wall-clock time is shifted by
 *  the UTC offset (e.g. teacher enters 09:00, students see 2:00 PM).
 *
 *  The teacher form already sends `new Date(input).toISOString()` (correct UTC),
 *  so the fix is on the read side: anchor the naive string to UTC before
 *  formatting, then format with the browser timezone — one shift, not two.
 */

/** Parse an API datetime string. Naive strings (no offset) are treated as UTC,
 *  exactly how the backend stores them. Already-offset strings pass through. */
export function parseUtcNaive(s: string): Date {
  const hasOffset = /(?:z|Z)$|[+-]\d{2}:?\d{2}$/.test(s)
  return new Date(hasOffset ? s : `${s}Z`)
}

/** "Sep 24, 9:00 AM" — formatted in the browser's timezone. */
export function formatDueAt(s: string): string {
  return parseUtcNaive(s).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

/** Small friendly hint: "today", "tomorrow", "overdue". */
export function dueDayHint(s: string): string | null {
  const due = parseUtcNaive(s)
  const now = new Date()
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const days = Math.round((startOf(due) - startOf(now)) / (24 * 3600e3))
  if (days < 0) return 'overdue'
  if (days === 0) return 'due today'
  if (days === 1) return 'due tomorrow'
  return `in ${days} days`
}
