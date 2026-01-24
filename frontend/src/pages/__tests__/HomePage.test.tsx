import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

import { HomePage } from '../HomePage';
import type { ProgressUpdate } from '../../api';

// --- Mock API ---
const parseCurriculumStreamMock = vi.fn();

vi.mock('../../api', () => ({
  parseCurriculumStream: (...args: unknown[]) => parseCurriculumStreamMock(...args),
}));

// --- Mock components to avoid brittle UI coupling ---
vi.mock('../../components/TextInput', () => ({
  TextInput: ({ onSubmit, isLoading }: { onSubmit: (text: string) => void; isLoading: boolean }) => (
    <div>
      <div data-testid="textinput-loading">{String(isLoading)}</div>
      <button onClick={() => onSubmit('my topics')}>Submit</button>
    </div>
  ),
}));

vi.mock('../../components/ProgressBar', () => ({
  ProgressBar: ({ progress, message }: { progress: number; message: string }) => (
    <div data-testid="progressbar">{progress}:{message}</div>
  ),
}));

vi.mock('../../components/SavedCurriculums', () => ({
  SavedCurriculums: ({ onSelect }: { onSelect: (id: string) => void }) => (
    <div>
      <div data-testid="saved-curriculums">Saved</div>
      <button onClick={() => onSelect('abc')}>Open Saved</button>
    </div>
  ),
}));

describe('HomePage', () => {
  beforeEach(() => {
    parseCurriculumStreamMock.mockReset();
  });

  it('renders the main heading and Saved Curriculums section when not loading', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<HomePage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Study')).toBeInTheDocument();
    expect(screen.getByText('Buddy')).toBeInTheDocument();
    expect(screen.getByText(/Saved Curriculums/i)).toBeInTheDocument();
    expect(screen.getByTestId('saved-curriculums')).toBeInTheDocument();
  });

  it('navigates to the new curriculum when parseCurriculumStream reports complete', async () => {
    const user = userEvent.setup();

    parseCurriculumStreamMock.mockImplementation(async (_text: string, onProgress: (update: ProgressUpdate) => void) => {
      onProgress({ status: 'processing', progress: 10, message: 'Starting...' });
      onProgress({ status: 'complete', progress: 100, message: 'Done', saved_id: 'new123' });
    });

    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/curriculum/:id" element={<div data-testid="curriculum-route">Curriculum Route</div>} />
        </Routes>
      </MemoryRouter>
    );

    await user.click(screen.getByRole('button', { name: /submit/i }));
    expect(await screen.findByTestId('curriculum-route')).toBeInTheDocument();
  });

  it('shows an error message when parseCurriculumStream reports error', async () => {
    const user = userEvent.setup();

    parseCurriculumStreamMock.mockImplementation(async (_text: string, onProgress: (update: ProgressUpdate) => void) => {
      onProgress({ status: 'error', progress: 0, message: 'Bad input' });
    });

    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<HomePage />} />
        </Routes>
      </MemoryRouter>
    );

    await user.click(screen.getByRole('button', { name: /submit/i }));
    expect(await screen.findByText(/Bad input/i)).toBeInTheDocument();
  });
});
