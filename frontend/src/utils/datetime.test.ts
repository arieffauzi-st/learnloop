import { describe, expect, it } from 'vitest'
import { parseUtcNaive, formatDueAt, dueDayHint } from './datetime'

describe('parseUtcNaive (#74)', () => {
  it('anchors naive datetime strings to UTC, not browser-local time', () => {
    // "2026-09-23T02:00:00" is stored UTC; in UTC+7 it must display as 9:00 AM wall clock.
    const d = parseUtcNaive('2026-09-23T02:00:00')
    expect(d.toISOString()).toBe('2026-09-23T02:00:00.000Z')
  })

  it('passes through strings that already carry an offset', () => {
    const d = parseUtcNaive('2026-09-23T02:00:00Z')
    expect(d.toISOString()).toBe('2026-09-23T02:00:00.000Z')
    expect(parseUtcNaive('2026-09-23T02:00:00+00:00').toISOString()).toBe('2026-09-23T02:00:00.000Z')
  })
})

describe('dueDayHint', () => {
  it('labels today, tomorrow and overdue', () => {
    const now = new Date()
    const plusDays = (n: number) => new Date(now.getTime() + n * 24 * 3600e3).toISOString().slice(0, 19)
    expect(dueDayHint(plusDays(0))).toBe('due today')
    expect(dueDayHint(plusDays(1))).toBe('due tomorrow')
    expect(dueDayHint(plusDays(-3))).toBe('overdue')
  })
})

describe('formatDueAt', () => {
  it('formats with the browser timezone', () => {
    expect(typeof formatDueAt('2026-09-23T02:00:00')).toBe('string')
    expect(formatDueAt('2026-09-23T02:00:00')).toMatch(/Sep/)
  })
})
