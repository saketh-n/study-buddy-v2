import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ProgressBar } from '../ProgressBar'

describe('ProgressBar', () => {
  it('should render the message', () => {
    render(<ProgressBar progress={50} message="Processing..." />)
    
    expect(screen.getByText('Processing...')).toBeInTheDocument()
  })

  it('should display the progress percentage', () => {
    render(<ProgressBar progress={75} message="Loading" />)
    
    expect(screen.getByText('75%')).toBeInTheDocument()
  })

  it('should render with 0% progress', () => {
    render(<ProgressBar progress={0} message="Starting..." />)
    
    expect(screen.getByText('0%')).toBeInTheDocument()
  })

  it('should render with 100% progress', () => {
    render(<ProgressBar progress={100} message="Complete!" />)
    
    expect(screen.getByText('100%')).toBeInTheDocument()
  })

  it('should have the progress bar element', () => {
    const { container } = render(<ProgressBar progress={50} message="Loading" />)
    
    // Check that there's a progress bar div with the correct width style
    const progressBar = container.querySelector('[style*="width: 50%"]')
    expect(progressBar).toBeInTheDocument()
  })

  it('should have animated dots', () => {
    const { container } = render(<ProgressBar progress={50} message="Loading" />)
    
    // Should have 3 animated dots
    const dots = container.querySelectorAll('.animate-pulse-soft')
    expect(dots).toHaveLength(3)
  })
})
