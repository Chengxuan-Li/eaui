import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'
import { App } from './App.tsx'

afterEach(cleanup)

test('states that the scaffold implements no workflow yet', () => {
  render(<App />)

  expect(
    screen.getByRole('heading', {
      level: 1,
      name: 'EnergyAtlas UI experiment',
    }),
  ).toBeTruthy()
  expect(screen.getByText(/Scaffold only/)).toBeTruthy()
})
