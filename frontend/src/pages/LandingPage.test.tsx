import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'

// Mock the 3D scene: jsdom has no WebGL, and we only assert the page shell.
vi.mock('../components/three/HeroScene', () => ({ default: () => null }))

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
})
