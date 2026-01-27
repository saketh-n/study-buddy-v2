import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QuizView } from '../QuizView'
import type { Quiz } from '../../types'

const mockQuiz: Quiz = {
  topic_name: 'Binary Search',
  questions: [
    {
      question: 'What is the time complexity of binary search?',
      options: ['O(n)', 'O(log n)', 'O(n^2)', 'O(1)'],
      correct_index: 1,
      explanation: 'Binary search halves the search space each iteration.'
    },
    {
      question: 'Binary search requires the array to be:',
      options: ['Empty', 'Sorted', 'Reversed', 'Random'],
      correct_index: 1,
      explanation: 'Binary search only works correctly on sorted arrays.'
    }
  ],
  passing_score: 80,
  version: 0
}

describe('QuizView', () => {
  const mockOnSubmit = vi.fn()
  const mockOnBack = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render the quiz with all questions', () => {
    render(
      <QuizView
        quiz={mockQuiz}
        onSubmit={mockOnSubmit}
        onBack={mockOnBack}
      />
    )

    expect(screen.getByText('What is the time complexity of binary search?')).toBeInTheDocument()
    expect(screen.getByText('Binary search requires the array to be:')).toBeInTheDocument()
  })

  it('should display all options for each question', () => {
    render(
      <QuizView
        quiz={mockQuiz}
        onSubmit={mockOnSubmit}
        onBack={mockOnBack}
      />
    )

    // First question options
    expect(screen.getByText('O(n)')).toBeInTheDocument()
    expect(screen.getByText('O(log n)')).toBeInTheDocument()
    expect(screen.getByText('O(n^2)')).toBeInTheDocument()
    expect(screen.getByText('O(1)')).toBeInTheDocument()

    // Second question options
    expect(screen.getByText('Empty')).toBeInTheDocument()
    expect(screen.getByText('Sorted')).toBeInTheDocument()
  })

  it('should show quiz metadata', () => {
    render(
      <QuizView
        quiz={mockQuiz}
        onSubmit={mockOnSubmit}
        onBack={mockOnBack}
      />
    )

    expect(screen.getByText('2 questions')).toBeInTheDocument()
    expect(screen.getByText('80% to pass')).toBeInTheDocument()
  })

  it('should track answered questions count', () => {
    render(
      <QuizView
        quiz={mockQuiz}
        onSubmit={mockOnSubmit}
        onBack={mockOnBack}
      />
    )

    expect(screen.getByText('0 of 2 answered')).toBeInTheDocument()
  })

  it('should update count when selecting an answer', async () => {
    const user = userEvent.setup()
    
    render(
      <QuizView
        quiz={mockQuiz}
        onSubmit={mockOnSubmit}
        onBack={mockOnBack}
      />
    )

    // Click on the first option of the first question
    await user.click(screen.getByText('O(n)'))

    expect(screen.getByText('1 of 2 answered')).toBeInTheDocument()
  })

  it('should have a disabled submit button when not all questions answered', () => {
    render(
      <QuizView
        quiz={mockQuiz}
        onSubmit={mockOnSubmit}
        onBack={mockOnBack}
      />
    )

    const submitButton = screen.getByRole('button', { name: /answer all questions/i })
    expect(submitButton).toBeDisabled()
  })

  it('should enable submit button when all questions are answered', async () => {
    const user = userEvent.setup()
    
    render(
      <QuizView
        quiz={mockQuiz}
        onSubmit={mockOnSubmit}
        onBack={mockOnBack}
      />
    )

    // Answer both questions
    await user.click(screen.getByText('O(log n)'))
    await user.click(screen.getByText('Sorted'))

    const submitButton = screen.getByRole('button', { name: /submit quiz/i })
    expect(submitButton).not.toBeDisabled()
  })

  it('should call onSubmit with answers when submitted', async () => {
    const user = userEvent.setup()
    
    render(
      <QuizView
        quiz={mockQuiz}
        onSubmit={mockOnSubmit}
        onBack={mockOnBack}
      />
    )

    // Answer both questions
    await user.click(screen.getByText('O(log n)'))  // index 1
    await user.click(screen.getByText('Sorted'))    // index 1

    // Submit
    const submitButton = screen.getByRole('button', { name: /submit quiz/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith([1, 1])
    })
  })

  it('should call onBack when back button is clicked', async () => {
    const user = userEvent.setup()
    
    render(
      <QuizView
        quiz={mockQuiz}
        onSubmit={mockOnSubmit}
        onBack={mockOnBack}
      />
    )

    await user.click(screen.getByText('Back to Lesson'))

    expect(mockOnBack).toHaveBeenCalled()
  })

  describe('Review Mode', () => {
    it('should show review mode indicator', () => {
      render(
        <QuizView
          quiz={mockQuiz}
          onSubmit={mockOnSubmit}
          onBack={mockOnBack}
          isReviewMode={true}
          reviewVersion={0}
        />
      )

      expect(screen.getByText('Reviewing Quiz #1')).toBeInTheDocument()
      expect(screen.getByText('Review Mode')).toBeInTheDocument()
    })

    it('should show "Show Answers" button in review mode', () => {
      render(
        <QuizView
          quiz={mockQuiz}
          onSubmit={mockOnSubmit}
          onBack={mockOnBack}
          isReviewMode={true}
          reviewVersion={0}
        />
      )

      expect(screen.getByRole('button', { name: /show answers/i })).toBeInTheDocument()
    })

    it('should reveal answers and explanations when "Show Answers" is clicked', async () => {
      const user = userEvent.setup()
      
      render(
        <QuizView
          quiz={mockQuiz}
          onSubmit={mockOnSubmit}
          onBack={mockOnBack}
          isReviewMode={true}
          reviewVersion={0}
        />
      )

      // Select some answers first
      await user.click(screen.getByText('O(log n)'))
      await user.click(screen.getByText('Sorted'))

      // Click show answers
      await user.click(screen.getByRole('button', { name: /show answers/i }))

      // Explanations should now be visible
      expect(screen.getByText(/binary search halves the search space/i)).toBeInTheDocument()
      expect(screen.getByText(/binary search only works correctly on sorted/i)).toBeInTheDocument()
    })
  })

  describe('AI Grading Toggle', () => {
    it('should render AI grading toggle when hasApiKey is true', () => {
      render(
        <QuizView
          quiz={mockQuiz}
          onSubmit={mockOnSubmit}
          onBack={mockOnBack}
          hasApiKey={true}
          useAiGrading={false}
          onToggleAiGrading={vi.fn()}
        />
      )

      expect(screen.getByText('Grade with AI')).toBeInTheDocument()
      expect(screen.getByText(/Get detailed feedback and personalized analysis/i)).toBeInTheDocument()
    })

    it('should disable AI grading toggle when hasApiKey is false', () => {
      render(
        <QuizView
          quiz={mockQuiz}
          onSubmit={mockOnSubmit}
          onBack={mockOnBack}
          hasApiKey={false}
          useAiGrading={false}
          onToggleAiGrading={vi.fn()}
        />
      )

      const toggle = screen.getByRole('switch', { name: /toggle ai grading/i })
      expect(toggle).toBeDisabled()
    })

    it('should show disabled state explanation when API key is missing', () => {
      render(
        <QuizView
          quiz={mockQuiz}
          onSubmit={mockOnSubmit}
          onBack={mockOnBack}
          hasApiKey={false}
          useAiGrading={false}
          onToggleAiGrading={vi.fn()}
        />
      )

      expect(screen.getByText(/AI grading unavailable \(no API key configured\)/i)).toBeInTheDocument()
    })

    it('should call onToggleAiGrading when toggle is clicked', async () => {
      const user = userEvent.setup()
      const mockToggle = vi.fn()

      render(
        <QuizView
          quiz={mockQuiz}
          onSubmit={mockOnSubmit}
          onBack={mockOnBack}
          hasApiKey={true}
          useAiGrading={false}
          onToggleAiGrading={mockToggle}
        />
      )

      const toggle = screen.getByRole('switch', { name: /toggle ai grading/i })
      await user.click(toggle)

      expect(mockToggle).toHaveBeenCalledWith(true)
    })

    it('toggle should default to off', () => {
      render(
        <QuizView
          quiz={mockQuiz}
          onSubmit={mockOnSubmit}
          onBack={mockOnBack}
          hasApiKey={true}
          useAiGrading={false}
          onToggleAiGrading={vi.fn()}
        />
      )

      const toggle = screen.getByRole('switch', { name: /toggle ai grading/i })
      expect(toggle).toHaveAttribute('aria-checked', 'false')
    })

    it('toggle should be on when useAiGrading is true', () => {
      render(
        <QuizView
          quiz={mockQuiz}
          onSubmit={mockOnSubmit}
          onBack={mockOnBack}
          hasApiKey={true}
          useAiGrading={true}
          onToggleAiGrading={vi.fn()}
        />
      )

      const toggle = screen.getByRole('switch', { name: /toggle ai grading/i })
      expect(toggle).toHaveAttribute('aria-checked', 'true')
    })
  })
})
