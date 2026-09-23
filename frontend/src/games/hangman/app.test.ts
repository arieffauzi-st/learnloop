import { describe, expect, it } from 'vitest'
import { createHangman, WORD_LIST } from './app'

describe('hangman game module', () => {
  it('has a curated kid-friendly word list with hints', () => {
    expect(WORD_LIST.length).toBeGreaterThanOrEqual(40)
    for (const entry of WORD_LIST) {
      expect(entry.word).toMatch(/^[A-Z]+$/)
      expect(entry.hint.length).toBeGreaterThan(0)
    }
  })

  it('mounts keyboard + word slots into root and cleans up on destroy', () => {
    const root = document.createElement('div')
    const destroy = createHangman(root, { embedded: true, onHome: () => {} })
    expect(root.querySelectorAll('.hm-key').length).toBe(26)
    expect(root.querySelector('.hm-word')).toBeTruthy()
    expect(root.querySelector('.hm-hint')?.textContent).toContain('Hint')
    expect(root.querySelector('#hmHome')).toBeTruthy()
    destroy()
    expect(root.innerHTML).toBe('')
  })

  it('counts wrong guesses, draws the stickman progressively, and loses after 6 misses', () => {
    const root = document.createElement('div')
    const destroy = createHangman(root)
    // Click letters until the counter shows 6/6 wrong (up to clicking every key).
    for (let i = 0; i < 30; i += 1) {
      const wrongText = root.querySelector('.hm-wrong')?.textContent ?? ''
      if (wrongText.includes('6 / 6')) break
      root.querySelectorAll<HTMLButtonElement>('.hm-key:not([disabled])')[0]?.click()
    }
    expect(root.querySelector('.hm-wrong')?.textContent).toContain('6 / 6')
    // Stickman fully drawn: head + 5 limbs/body lines + 4 gallows lines = 10 shapes
    expect(root.querySelectorAll('.hm-stickman line, .hm-stickman circle').length).toBe(10)
    expect(root.textContent).toMatch(/The word was/i)
    expect(root.querySelector('#hmAgain')).toBeTruthy()
    destroy()
    expect(root.innerHTML).toBe('')
  })
})
