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
    expect(screen.getByText(/main sekarang/i)).toBeTruthy()
    // Tagline in Indonesian
    expect(screen.getByText(/lipat kertas/i)).toBeTruthy()
  })
})
