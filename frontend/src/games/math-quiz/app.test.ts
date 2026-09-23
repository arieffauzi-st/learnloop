import { describe, expect, it, vi } from 'vitest'
import { createMathQuiz, starsForScore } from './app'

describe('math quiz module', () => {
  it('starsForScore follows the 3-star rule (3 stars = 9-10 correct)', () => {
    expect(starsForScore(10)).toBe(3)
    expect(starsForScore(9)).toBe(3)
    expect(starsForScore(8)).toBe(2)
    expect(starsForScore(6)).toBe(2)
    expect(starsForScore(5)).toBe(1)
    expect(starsForScore(2)).toBe(0)
  })

  it('mounts 10-question round with 4 choices, progress bar and countdown ring', () => {
    vi.useFakeTimers()
    const root = document.createElement('div')
    const destroy = createMathQuiz(root, { embedded: true, onHome: () => {} })
    expect(root.querySelectorAll('.mq-btn.choice').length).toBe(4)
    expect(root.querySelector('.mq-progressbar')).toBeTruthy()
    expect(root.querySelector('.mq-ring')).toBeTruthy()
    expect(root.querySelector('.mq-count')?.textContent).toContain('1/10')
    expect(root.querySelector('#mqHome')).toBeTruthy()
    destroy()
    expect(root.innerHTML).toBe('')
    vi.useRealTimers()
  })

  it('gives immediate feedback on a click and shows the score screen with stars after 10 answers', () => {
    vi.useFakeTimers()
    const root = document.createElement('div')
    const destroy = createMathQuiz(root)
    // Answer all 10 questions by clicking the correct choice (dataset.value holds each number,
    // and the question text is "a op b = ?" so we compute the answer).
    for (let q = 0; q < 10; q += 1) {
      const text = root.querySelector('.mq-question')?.textContent ?? ''
      const [expr] = text.split('=')
      const [a, op, b] = (expr ?? '').trim().split(/\s+/)
      const x = Number(a)
      const y = Number(b)
      const answer = op === '+' ? x + y : op === '−' ? x - y : x * y
      const correctBtn = Array.from(root.querySelectorAll<HTMLButtonElement>('.mq-btn.choice')).find(
        (btn) => Number(btn.dataset.value) === answer,
      )
      correctBtn?.click()
      expect(root.querySelector('.mq-feedback')?.className).toContain('right')
      // advance past the 1.2s feedback delay to the next question / score screen
      vi.advanceTimersByTime(1300)
    }
    expect(root.querySelector('.mq-stars')).toBeTruthy()
    expect(root.textContent).toContain('10 / 10')
    expect(root.textContent).toMatch(/⭐/)
    expect(root.querySelector('#mqAgain')).toBeTruthy()
    destroy()
    expect(root.innerHTML).toBe('')
    vi.useRealTimers()
  })
})
