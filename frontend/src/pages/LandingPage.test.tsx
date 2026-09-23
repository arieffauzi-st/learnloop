import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'

// jsdom has no canvas API — lottie-web's renderer crashes on import/mount.
vi.mock('../components/characters/LottieSparkle', () => ({
  LottieSparkle: () => null,
}))

import LandingPage from './LandingPage'

describe('LandingPage', () => {
  it('renders without crashing and shows the English game teaser', () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>,
    )
    expect(screen.getByText((_, el) => el?.textContent === 'Fold it, hide your army, and strike — play Paper War and more, right in your browser.')).toBeDefined()
  })

  it('renders the 2D illustrated hero scene', () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>,
    )
    const scenes = screen.getAllByRole('img', { name: /illustrated meadow scene/i })
    expect(scenes.length).toBeGreaterThan(0)
  })
})
