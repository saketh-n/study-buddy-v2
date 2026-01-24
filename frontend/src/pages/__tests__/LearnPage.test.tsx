import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

import { LearnPage } from '../LearnPage';

// --- Mock API ---
const getCurriculumMock = vi.fn();
const getLearningProgressMock = vi.fn();
const generateLessonMock = vi.fn();

vi.mock('../../api', () => ({
  getCurriculum: (...args: any[]) => getCurriculumMock(...args),
  getLearningProgress: (...args: any[]) => getLearningProgressMock(...args),
  generateLesson: (...args: any[]) => generateLessonMock(...args),
}));

// --- Mock child components (reduce brittleness) ---
vi.mock('../../components/SelectionContextMenu', () => ({
  SelectionContextMenu: () => <div data-testid="selection-menu" />,
}));
vi.mock('../../components/TopicSidebar', () => ({
  TopicSidebar: () => <div data-testid="sidebar" />,
}));
vi.mock('../../components/AiTutor', () => ({
  AiTutor: () => <div data-testid="tutor" />,
}));
vi.mock('../../components/LessonView', () => ({
  LessonView: () => <div data-testid="lesson-view" />,
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

describe('LearnPage', () => {
  beforeEach(() => {
    getCurriculumMock.mockReset();
    getLearningProgressMock.mockReset();
    generateLessonMock.mockReset();
  });

  it('loads curriculum and then loads a lesson for the route topic key', async () => {
    const curriculum = makeCurriculum();

    getCurriculumMock.mockResolvedValueOnce({ curriculum });
    getLearningProgressMock.mockResolvedValueOnce({ topics: {} });
    generateLessonMock.mockResolvedValueOnce({ title: 'Lesson Title', content: '...' });

    render(
      <MemoryRouter initialEntries={['/curriculum/c1/learn/0-0']}>
        <Routes>
          <Route path="/curriculum/:id/learn/:topicKey" element={<LearnPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText('Topic 1')).toBeInTheDocument(); // topic header title
    expect(await screen.findByTestId('lesson-view')).toBeInTheDocument();

    // called with: (curriculum_id, clusterIndex, topicIndex)
    expect(generateLessonMock).toHaveBeenCalledWith('c1', 0, 0);
  });

  it('shows error page if lesson generation fails', async () => {
    const curriculum = makeCurriculum();

    getCurriculumMock.mockResolvedValueOnce({ curriculum });
    getLearningProgressMock.mockResolvedValueOnce({ topics: {} });
    generateLessonMock.mockRejectedValueOnce(new Error('boom'));

    render(
      <MemoryRouter initialEntries={['/curriculum/c1/learn/0-0']}>
        <Routes>
          <Route path="/curriculum/:id/learn/:topicKey" element={<LearnPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText(/Error/i)).toBeInTheDocument();
    expect(screen.getByText(/Failed to load lesson/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Back to Curriculum/i })).toBeInTheDocument();
  });
});
