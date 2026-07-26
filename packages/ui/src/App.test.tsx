import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders the placeholder board with all four seat winds', () => {
    render(<App />)

    expect(screen.getByText('MCR Mahjong Trainer')).toBeInTheDocument()
    expect(screen.getByTestId('board')).toBeInTheDocument()
    for (const wind of ['E', 'S', 'W', 'N']) {
      expect(screen.getByText(wind)).toBeInTheDocument()
    }
  })
})
