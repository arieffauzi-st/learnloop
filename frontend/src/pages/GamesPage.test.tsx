import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import GamesPage from './GamesPage'

describe('GamesPage', () => {
  it('renders the games hub with the Perang Kertas card', () => {
    render(
      <MemoryRouter>
        <GamesPage />
      </MemoryRouter>,
    )
    expect(screen.getByRole('heading', { name: /game zone/i })).toBeTruthy()
    expect(screen.getByText('Perang Kertas')).toBeTruthy()
    expect(screen.getAllByText(/play now/i).length).toBe(3)
    // Tagline in English
    expect(screen.getByText(/fold the paper/i)).toBeTruthy()
    // New games wired into the hub
    expect(screen.getByText('Word Hangman 🎩')).toBeTruthy()
    expect(screen.getByText('Quick Math ⚡')).toBeTruthy()
  })
})
