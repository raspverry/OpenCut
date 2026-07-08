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
  })
})
