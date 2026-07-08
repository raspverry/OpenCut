// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { EditorPage } from '../components/editor/editor-page'

describe('EditorPage', () => {
  it('renders the OpenCut AI Shorts editor shell', () => {
    render(<EditorPage />)

    expect(screen.getByText('Source Media')).toBeTruthy()
    expect(screen.getByText('AI Shorts')).toBeTruthy()
    expect(screen.getByText('Preview')).toBeTruthy()
    expect(screen.getByText('Timeline')).toBeTruthy()
    expect(screen.getAllByText('p01-c01').length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText('p01')).toBeTruthy()
    expect(screen.getByText('Score 87')).toBeTruthy()
    expect(screen.getByText('10.0s-28.0s')).toBeTruthy()
    expect(screen.getByText('実演と価格が同じ短い区間に入っている')).toBeTruthy()
  })
})
