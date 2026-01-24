import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

import { QuizPage } from '../QuizPage';

// --- Mock API ---
const getCurriculumMock = vi.fn();
const getLearningProgressMock = vi.fn();
const generateQuizMock = vi.fn();
const generateNewQuizMock = vi.fn();
const submitQuizMock = vi.fn();

vi.mock('../../api', () => ({
  getCurriculum: (...args: unknown[]) => getCurriculumMock(...args),
  getLearningProgress: (...args: unknown[]) => getLearningProgressMock(...args),
  generateQuiz: (...args: unknown[]) => generateQuizMock(...args),
  generateNewQuiz: (...args: unknown[]) => generateNewQuizMock(...args),
  submitQuiz: (...args: unknown[]) => submitQuizMock(...args),
}));

// --- Mock child components ---
vi.mock('../../components/QuizView', () => ({
  QuizView: ({ onSubmit }: { onSubmit: (answers: number[]) => void }) => (
    <div>
      <div data-testid="quiz-view" />
      <button onClick={() => onSubmit([0, 1, 2])}>Submit Quiz</button>
    </div>
  ),
}));

vi.mock('../../components/QuizResults', () => ({
  QuizResults: () => <div data-testid="quiz-results" />,
}));

function makeCurriculum() {
  return {
    id: 'c1',
    subject: 'Algebra',
    description: 'Learn algebra step by step',
    clusters: [
      {
        name: 'Cluster 1',
        order: 1,
        description: 'Basics',
        topics: [{ name: 'Topic 1', order: 1, description: 'Intro' }],
      },
    ],
    created_at: new Date().toISOString(),
  };
}

describe('QuizPage', () => {
  beforeEach(() => {
    getCurriculumMock.mockReset();
    getLearningProgressMock.mockReset();
    generateQuizMock.mockReset();
    generateNewQuizMock.mockReset();
    submitQuizMock.mockReset();
  });

  it('loads and renders QuizView in normal mode (generateQuiz)', async () => {
    const curriculum = makeCurriculum();

    getCurriculumMock.mockResolvedValueOnce({ curriculum });
    getLearningProgressMock.mockResolvedValueOnce({ topics: {} });
    generateQuizMock.mockResolvedValueOnce({ id: 'q1', questions: [] });

    render(
      <MemoryRouter initialEntries={['/curriculum/c1/quiz/0-0']}>
        <Routes>
          <Route path="/curriculum/:id/quiz/:topicKey" element={<QuizPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByTestId('quiz-view')).toBeInTheDocument();
    expect(generateQuizMock).toHaveBeenCalledWith('c1', 0, 0);
  });

  it('loads quiz in force-new mode (generateNewQuiz) when ?new=true', async () => {
    const curriculum = makeCurriculum();

    getCurriculumMock.mockResolvedValueOnce({ curriculum });
    getLearningProgressMock.mockResolvedValueOnce({ topics: {} });
    generateNewQuizMock.mockResolvedValueOnce({ id: 'q-new', questions: [] });

    render(
      <MemoryRouter initialEntries={['/curriculum/c1/quiz/0-0?new=true']}>
        <Routes>
          <Route path="/curriculum/:id/quiz/:topicKey" element={<QuizPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByTestId('quiz-view')).toBeInTheDocument();
    expect(generateNewQuizMock).toHaveBeenCalledWith('c1', 0, 0);
  });

  it('submits quiz and shows results; refreshes progress when passed', async () => {
    const user = userEvent.setup();
    const curriculum = makeCurriculum();

    getCurriculumMock.mockResolvedValueOnce({ curriculum });
    getLearningProgressMock.mockResolvedValueOnce({ topics: {} }); // initial
    generateQuizMock.mockResolvedValueOnce({ id: 'q1', questions: [] });

    submitQuizMock.mockResolvedValueOnce({ passed: true, score: 100, feedback: '' });
    getLearningProgressMock.mockResolvedValueOnce({ topics: { '0-0': { completed: true } } }); // refresh

    render(
      <MemoryRouter initialEntries={['/curriculum/c1/quiz/0-0']}>
        <Routes>
          <Route path="/curriculum/:id/quiz/:topicKey" element={<QuizPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByTestId('quiz-view')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /submit quiz/i }));

    expect(await screen.findByTestId('quiz-results')).toBeInTheDocument();
    expect(submitQuizMock).toHaveBeenCalledWith('c1', 0, 0, [0, 1, 2]);

    // When passed, QuizPage fetches progress again
    expect(getLearningProgressMock).toHaveBeenCalledTimes(2);
  });
  
});
