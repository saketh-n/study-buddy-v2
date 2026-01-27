import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  parseCurriculumStream,
  listCurriculums,
  getCurriculum,
  deleteCurriculum,
  getApiStatus,
  getLearningProgress,
  startLearning,
  getContentStatus,
  prepareCurriculumContent,
  generateLesson,
  generateQuiz,
  generateNewQuiz,
  submitQuiz,
  getQuizHistory,
  API_BASE_URL,
} from './api';

// ---- Helpers ----

type MockFetchResponse<TJson = unknown> = {
  ok: boolean;
  status: number;
  json?: () => Promise<TJson>;
  body?: {
    getReader: () => {
      read: () => Promise<{ done: boolean; value?: Uint8Array }>;
    };
  };
};

// Create a minimal "fetch Response" that streams SSE chunks
function makeSseResponse(chunks: string[], status = 200): MockFetchResponse {
  const encoder = new TextEncoder();
  let i = 0;

  return {
    ok: status >= 200 && status < 300,
    status,
    body: {
      getReader: () => ({
        read: async () => {
          if (i >= chunks.length) return { done: true };
          const value = encoder.encode(chunks[i++]);
          return { done: false, value };
        },
      }),
    },
  };
}

// Create a basic JSON response
function makeJsonResponse<T>(data: T, status = 200): MockFetchResponse<T> {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
  };
}

describe('api.ts', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    globalThis.fetch = fetchMock;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('parseCurriculumStream (SSE)', () => {
    it('calls onProgress for each valid data: JSON event', async () => {
      const onProgress = vi.fn();

      // SSE events are separated by \n\n and lines start with "data: "
      const sseChunks = [
        'data: {"status":"processing","message":"Starting","progress":10}\n\n',
        'data: {"status":"processing","message":"Still going","progress":50}\n\n',
        'data: {"status":"complete","message":"Done","progress":100,"saved_id":"abc"}\n\n',
      ];

      fetchMock.mockResolvedValueOnce(makeSseResponse(sseChunks));

      await parseCurriculumStream('hello', onProgress);

      expect(fetchMock).toHaveBeenCalledWith(
        `${API_BASE_URL}/api/parse/stream`,
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );

      expect(onProgress).toHaveBeenCalledTimes(3);
      expect(onProgress).toHaveBeenNthCalledWith(1, expect.objectContaining({ progress: 10 }));
      expect(onProgress).toHaveBeenNthCalledWith(2, expect.objectContaining({ progress: 50 }));
      expect(onProgress).toHaveBeenNthCalledWith(3, expect.objectContaining({ status: 'complete', saved_id: 'abc' }));
    });

    it('throws when response is not ok', async () => {
      fetchMock.mockResolvedValueOnce(makeJsonResponse({ detail: 'nope' }, 500));

      await expect(parseCurriculumStream('hello', vi.fn()))
        .rejects
        .toThrow('HTTP error! status: 500');
    });

    it('throws when response has no body/reader', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        body: undefined,
      });

      await expect(parseCurriculumStream('hello', vi.fn()))
        .rejects
        .toThrow('No response body');
    });
  });

  describe('Curriculums', () => {
    it('listCurriculums returns data.curriculums', async () => {
      fetchMock.mockResolvedValueOnce(makeJsonResponse({ curriculums: [{ id: '1' }, { id: '2' }] }));

      const result = await listCurriculums();

      expect(fetchMock).toHaveBeenCalledWith(`${API_BASE_URL}/api/curriculums`);
      expect(result).toEqual([{ id: '1' }, { id: '2' }]);
    });

    it('listCurriculums throws when non-ok', async () => {
      fetchMock.mockResolvedValueOnce(makeJsonResponse({ detail: 'bad' }, 404));
      await expect(listCurriculums()).rejects.toThrow('HTTP error! status: 404');
    });

    it('getCurriculum fetches /api/curriculums/:id', async () => {
      fetchMock.mockResolvedValueOnce(makeJsonResponse({ curriculum: { id: 'x' } }));

      const result = await getCurriculum('x');

      expect(fetchMock).toHaveBeenCalledWith(`${API_BASE_URL}/api/curriculums/x`);
      expect(result).toEqual({ curriculum: { id: 'x' } });
    });

    it('deleteCurriculum calls DELETE and throws on non-ok', async () => {
      fetchMock.mockResolvedValueOnce(makeJsonResponse({}, 200));
      await deleteCurriculum('x');

      expect(fetchMock).toHaveBeenCalledWith(
        `${API_BASE_URL}/api/curriculums/x`,
        expect.objectContaining({ method: 'DELETE' })
      );

      fetchMock.mockResolvedValueOnce(makeJsonResponse({}, 500));
      await expect(deleteCurriculum('x')).rejects.toThrow('HTTP error! status: 500');
    });
  });

  describe('API Status', () => {
    it('getApiStatus fetches status endpoint', async () => {
      fetchMock.mockResolvedValueOnce(makeJsonResponse({ has_api_key: true }));

      const result = await getApiStatus();

      expect(fetchMock).toHaveBeenCalledWith(`${API_BASE_URL}/api/status`);
      expect(result).toEqual({ has_api_key: true });
    });

    it('getApiStatus handles no API key', async () => {
      fetchMock.mockResolvedValueOnce(makeJsonResponse({ has_api_key: false }));

      const result = await getApiStatus();

      expect(result).toEqual({ has_api_key: false });
    });
  });

  describe('Learning progress', () => {
    it('getLearningProgress fetches progress', async () => {
      fetchMock.mockResolvedValueOnce(makeJsonResponse({ started: true }));

      const result = await getLearningProgress('cid');

      expect(fetchMock).toHaveBeenCalledWith(`${API_BASE_URL}/api/curriculums/cid/progress`);
      expect(result).toEqual({ started: true });
    });

    it('startLearning POSTs progress/start', async () => {
      fetchMock.mockResolvedValueOnce(makeJsonResponse({ started: true }));

      const result = await startLearning('cid');

      expect(fetchMock).toHaveBeenCalledWith(
        `${API_BASE_URL}/api/curriculums/cid/progress/start`,
        expect.objectContaining({ method: 'POST' })
      );
      expect(result).toEqual({ started: true });
    });
  });

  describe('Content status & preparation SSE', () => {
    it('getContentStatus fetches content-status', async () => {
      fetchMock.mockResolvedValueOnce(makeJsonResponse({ ready: true }));

      const result = await getContentStatus('cid');

      expect(fetchMock).toHaveBeenCalledWith(`${API_BASE_URL}/api/curriculums/cid/content-status`);
      expect(result).toEqual({ ready: true });
    });

    it('prepareCurriculumContent streams SSE progress updates', async () => {
      const onProgress = vi.fn();

      const sseChunks = [
        'data: {"type":"start","total":2}\n\n',
        'data: {"type":"batch_complete","completed":1,"total":2,"generated_count":1}\n\n',
        'data: {"type":"complete","generated_count":2,"errors":[]}\n\n',
      ];

      fetchMock.mockResolvedValueOnce(makeSseResponse(sseChunks));

      await prepareCurriculumContent('cid', onProgress);

      expect(fetchMock).toHaveBeenCalledWith(
        `${API_BASE_URL}/api/curriculums/cid/prepare`,
        expect.objectContaining({ method: 'POST' })
      );

      expect(onProgress).toHaveBeenCalledTimes(3);
      expect(onProgress).toHaveBeenNthCalledWith(1, expect.objectContaining({ type: 'start', total: 2 }));
      expect(onProgress).toHaveBeenNthCalledWith(3, expect.objectContaining({ type: 'complete', generated_count: 2 }));
    });

    it('prepareCurriculumContent throws on non-ok', async () => {
      fetchMock.mockResolvedValueOnce(makeJsonResponse({}, 400));
      await expect(prepareCurriculumContent('cid', vi.fn()))
        .rejects
        .toThrow('HTTP error! status: 400');
    });
  });

  describe('Lessons & quizzes', () => {
    it('generateLesson POSTs /api/lesson with correct body', async () => {
      fetchMock.mockResolvedValueOnce(makeJsonResponse({ title: 'Lesson' }));

      const result = await generateLesson('cid', 1, 2);

      expect(fetchMock).toHaveBeenCalledWith(
        `${API_BASE_URL}/api/lesson`,
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ curriculum_id: 'cid', cluster_index: 1, topic_index: 2 }),
        })
      );
      expect(result).toEqual({ title: 'Lesson' });
    });

    it('generateQuiz and generateNewQuiz POST correct endpoints', async () => {
      fetchMock.mockResolvedValueOnce(makeJsonResponse({ id: 'q1' }));
      await expect(generateQuiz('cid', 0, 0)).resolves.toEqual({ id: 'q1' });
      expect(fetchMock).toHaveBeenLastCalledWith(
        `${API_BASE_URL}/api/quiz`,
        expect.objectContaining({ method: 'POST' })
      );

      fetchMock.mockResolvedValueOnce(makeJsonResponse({ id: 'q2' }));
      await expect(generateNewQuiz('cid', 0, 0)).resolves.toEqual({ id: 'q2' });
      expect(fetchMock).toHaveBeenLastCalledWith(
        `${API_BASE_URL}/api/quiz/new`,
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('submitQuiz POSTs answers with default useAiGrading false', async () => {
      fetchMock.mockResolvedValueOnce(makeJsonResponse({ score: 100, passed: true }));

      const result = await submitQuiz('cid', 3, 4, [0, 1, 2]);

      expect(fetchMock).toHaveBeenCalledWith(
        `${API_BASE_URL}/api/quiz/submit`,
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            curriculum_id: 'cid',
            cluster_index: 3,
            topic_index: 4,
            answers: [0, 1, 2],
            use_ai_grading: false,
          }),
        })
      );

      expect(result).toEqual({ score: 100, passed: true });
    });

    it('submitQuiz POSTs answers with useAiGrading true', async () => {
      fetchMock.mockResolvedValueOnce(makeJsonResponse({ score: 100, passed: true }));

      const result = await submitQuiz('cid', 3, 4, [0, 1, 2], true);

      expect(fetchMock).toHaveBeenCalledWith(
        `${API_BASE_URL}/api/quiz/submit`,
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            curriculum_id: 'cid',
            cluster_index: 3,
            topic_index: 4,
            answers: [0, 1, 2],
            use_ai_grading: true,
          }),
        })
      );

      expect(result).toEqual({ score: 100, passed: true });
    });

    it('getQuizHistory fetches history endpoint', async () => {
      fetchMock.mockResolvedValueOnce(makeJsonResponse({ total_quizzes: 1, history: [] }));

      const result = await getQuizHistory('cid', 1, 2);

      expect(fetchMock).toHaveBeenCalledWith(
        `${API_BASE_URL}/api/history/quiz/cid/1/2`
      );
      expect(result).toEqual({ total_quizzes: 1, history: [] });
    });
  });
});
