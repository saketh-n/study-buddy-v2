import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { LessonView } from '../LessonView'
import type { Lesson } from '../../types'

// Mock the QuizHistory component since we're not testing it here
vi.mock('../QuizHistory', () => ({
  QuizHistory: () => <div data-testid="quiz-history">Quiz History Component</div>
}))

const mockLesson: Lesson = {
  topic_name: 'Binary Search',
  introduction: 'Binary search is a fundamental algorithm for efficiently finding items.',
  sections: [
    {
      title: 'How Binary Search Works',
      content: 'Binary search works by repeatedly dividing the search interval in half.',
      key_points: ['O(log n) time complexity', 'Requires sorted array']
    },
    {
      title: 'Implementation',
      content: 'Here is how you implement binary search in code.',
      key_points: ['Use left and right pointers', 'Calculate mid point']
    }
  ],
  summary: 'Binary search is a powerful technique for searching sorted data efficiently.',
  estimated_time_minutes: 15
}

const mockNavigate = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate
  }
})

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  )
}

describe('LessonView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render the lesson introduction', () => {
    renderWithRouter(
      <LessonView
        lesson={mockLesson}
        isCompleted={false}
        curriculumId="test123"
        clusterIndex={0}
        topicIndex={0}
        topicKey="0-0"
      />
    )

    expect(screen.getByText(/binary search is a fundamental algorithm/i)).toBeInTheDocument()
  })

  it('should display estimated reading time', () => {
    renderWithRouter(
      <LessonView
        lesson={mockLesson}
        isCompleted={false}
        curriculumId="test123"
        clusterIndex={0}
        topicIndex={0}
        topicKey="0-0"
      />
    )

    expect(screen.getByText('~15 min read')).toBeInTheDocument()
  })

  it('should render all sections with titles', () => {
    renderWithRouter(
      <LessonView
        lesson={mockLesson}
        isCompleted={false}
        curriculumId="test123"
        clusterIndex={0}
        topicIndex={0}
        topicKey="0-0"
      />
    )

    expect(screen.getByText('How Binary Search Works')).toBeInTheDocument()
    expect(screen.getByText('Implementation')).toBeInTheDocument()
  })

  it('should render section content', () => {
    renderWithRouter(
      <LessonView
        lesson={mockLesson}
        isCompleted={false}
        curriculumId="test123"
        clusterIndex={0}
        topicIndex={0}
        topicKey="0-0"
      />
    )

    expect(screen.getByText(/repeatedly dividing the search interval/i)).toBeInTheDocument()
  })

  it('should render key points for sections', () => {
    renderWithRouter(
      <LessonView
        lesson={mockLesson}
        isCompleted={false}
        curriculumId="test123"
        clusterIndex={0}
        topicIndex={0}
        topicKey="0-0"
      />
    )

    expect(screen.getByText('O(log n) time complexity')).toBeInTheDocument()
    expect(screen.getByText('Requires sorted array')).toBeInTheDocument()
  })

  it('should render the summary', () => {
    renderWithRouter(
      <LessonView
        lesson={mockLesson}
        isCompleted={false}
        curriculumId="test123"
        clusterIndex={0}
        topicIndex={0}
        topicKey="0-0"
      />
    )

    expect(screen.getByText(/powerful technique for searching sorted data/i)).toBeInTheDocument()
  })

  it('should show "Take Quiz" button for incomplete topics', () => {
    renderWithRouter(
      <LessonView
        lesson={mockLesson}
        isCompleted={false}
        curriculumId="test123"
        clusterIndex={0}
        topicIndex={0}
        topicKey="0-0"
      />
    )

    expect(screen.getByRole('button', { name: /take quiz/i })).toBeInTheDocument()
    expect(screen.getByText(/ready to test your knowledge/i)).toBeInTheDocument()
  })

  it('should show different message for completed topics', () => {
    renderWithRouter(
      <LessonView
        lesson={mockLesson}
        isCompleted={true}
        curriculumId="test123"
        clusterIndex={0}
        topicIndex={0}
        topicKey="0-0"
      />
    )

    expect(screen.getByText(/review your knowledge/i)).toBeInTheDocument()
    expect(screen.getByText(/you've already mastered this topic/i)).toBeInTheDocument()
  })

  it('should show "View Past Quizzes" button for completed topics', () => {
    renderWithRouter(
      <LessonView
        lesson={mockLesson}
        isCompleted={true}
        curriculumId="test123"
        clusterIndex={0}
        topicIndex={0}
        topicKey="0-0"
      />
    )

    expect(screen.getByRole('button', { name: /view past quizzes/i })).toBeInTheDocument()
  })

  it('should navigate to quiz when Take Quiz is clicked', async () => {
    const user = userEvent.setup()
    
    renderWithRouter(
      <LessonView
        lesson={mockLesson}
        isCompleted={false}
        curriculumId="test123"
        clusterIndex={0}
        topicIndex={0}
        topicKey="0-0"
      />
    )

    await user.click(screen.getByRole('button', { name: /take quiz/i }))

    expect(mockNavigate).toHaveBeenCalledWith('/curriculum/test123/quiz/0-0')
  })

  describe('Tab Navigation', () => {
    it('should have Lesson and Quiz History tabs', () => {
      renderWithRouter(
        <LessonView
          lesson={mockLesson}
          isCompleted={false}
          curriculumId="test123"
          clusterIndex={0}
          topicIndex={0}
          topicKey="0-0"
        />
      )

      expect(screen.getByRole('button', { name: /lesson/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /quiz history/i })).toBeInTheDocument()
    })

    it('should switch to Quiz History tab when clicked', async () => {
      const user = userEvent.setup()
      
      renderWithRouter(
        <LessonView
          lesson={mockLesson}
          isCompleted={false}
          curriculumId="test123"
          clusterIndex={0}
          topicIndex={0}
          topicKey="0-0"
        />
      )

      await user.click(screen.getByRole('button', { name: /quiz history/i }))

      // Quiz History component should be rendered
      expect(screen.getByTestId('quiz-history')).toBeInTheDocument()
    })
  })
})
