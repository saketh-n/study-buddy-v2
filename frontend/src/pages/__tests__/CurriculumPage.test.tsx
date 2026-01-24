import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

import { CurriculumPage } from '../CurriculumPage';

// --- Mock API ---
const getCurriculumMock = vi.fn();
const getLearningProgressMock = vi.fn();
const getContentStatusMock = vi.fn();
const prepareCurriculumContentMock = vi.fn();

vi.mock('../../api', () => ({
  getCurriculum: (...args: any[]) => getCurriculumMock(...args),
  getLearningProgress: (...args: any[]) => getLearningProgressMock(...args),
  getContentStatus: (...args: any[]) => getContentStatusMock(...args),
  prepareCurriculumContent: (...args: any[]) => prepareCurriculumContentMock(...args),
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
        topics: [
          { name: 'Topic 1', order: 1, description: 'Intro' },
          { name: 'Topic 2', order: 2, description: 'More' },
        ],
      },
    ],
    created_at: new Date().toISOString(),
  };
}

describe('CurriculumPage', () => {
  beforeEach(() => {
    getCurriculumMock.mockReset();
    getLearningProgressMock.mockReset();
    getContentStatusMock.mockReset();
    prepareCurriculumContentMock.mockReset();
  });

  it('renders curriculum subject and stats when loaded', async () => {
    const curriculum = makeCurriculum();

    getCurriculumMock.mockResolvedValueOnce({ curriculum });
    getLearningProgressMock.mockResolvedValueOnce({ topics: {} });
    getContentStatusMock.mockResolvedValueOnce({
      ready: true,
      total_topics: 2,
      lessons_cached: 2,
      quizzes_cached: 2,
      missing_lessons: [],
      missing_quizzes: [],
    });

    render(
      <MemoryRouter initialEntries={['/curriculum/c1']}>
        <Routes>
          <Route path="/curriculum/:id" element={<CurriculumPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText('Algebra')).toBeInTheDocument();
    expect(screen.getByTestId('curriculum-stats')).toBeInTheDocument();
    expect(screen.getByText(/clusters/i)).toBeInTheDocument();
    expect(screen.getByText(/topics/i)).toBeInTheDocument();
  });

  it('shows not found UI when curriculum load fails', async () => {
    getCurriculumMock.mockRejectedValueOnce(new Error('404'));
    getLearningProgressMock.mockResolvedValueOnce(null);
    getContentStatusMock.mockResolvedValueOnce(null);

    render(
      <MemoryRouter initialEntries={['/curriculum/missing']}>
        <Routes>
          <Route path="/curriculum/:id" element={<CurriculumPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText(/Curriculum Not Found/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Go Home/i })).toBeInTheDocument();
  });
});
