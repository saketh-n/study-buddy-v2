import type { 
  Curriculum, CurriculumSummary, SavedCurriculumRecord,
  Lesson, Quiz, QuizAssessment, LearningProgress, ChatMessage
} from './types';

const API_BASE_URL = 'http://localhost:8000';

export interface ProgressUpdate {
  status: 'processing' | 'complete' | 'error';
  message: string;
  progress: number;
  curriculum?: Curriculum;
  saved_id?: string;
}

// ============ Curriculum Parsing ============

export async function parseCurriculumStream(
  rawText: string,
  onProgress: (update: ProgressUpdate) => void
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/parse/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ raw_text: rawText }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const update = JSON.parse(line.slice(6)) as ProgressUpdate;
          onProgress(update);
        } catch (e) {
          console.error('Failed to parse SSE data:', e);
        }
      }
    }
  }
}

// ============ Curriculum Storage ============

export async function listCurriculums(): Promise<CurriculumSummary[]> {
  const response = await fetch(`${API_BASE_URL}/api/curriculums`);
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  const data = await response.json();
  return data.curriculums;
}

export async function getCurriculum(id: string): Promise<SavedCurriculumRecord> {
  const response = await fetch(`${API_BASE_URL}/api/curriculums/${id}`);
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return response.json();
}

export async function deleteCurriculum(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/curriculums/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
}

// ============ Learning Progress ============

export async function getLearningProgress(curriculumId: string): Promise<LearningProgress> {
  const response = await fetch(`${API_BASE_URL}/api/curriculums/${curriculumId}/progress`);
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return response.json();
}

export async function startLearning(curriculumId: string): Promise<LearningProgress> {
  const response = await fetch(`${API_BASE_URL}/api/curriculums/${curriculumId}/progress/start`, {
    method: 'POST',
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return response.json();
}

// ============ Content Preparation ============

export interface MissingContent {
  cluster_index: number;
  topic_index: number;
  topic_name: string;
  cluster_name: string;
}

export interface ContentStatus {
  total_topics: number;
  lessons_cached: number;
  quizzes_cached: number;
  missing_lessons: MissingContent[];
  missing_quizzes: MissingContent[];
  ready: boolean;
}

export async function getContentStatus(curriculumId: string): Promise<ContentStatus> {
  const response = await fetch(`${API_BASE_URL}/api/curriculums/${curriculumId}/content-status`);
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return response.json();
}

export interface BatchItem {
  type: 'lesson' | 'quiz';
  topic_name: string;
  cluster_index: number;
  topic_index: number;
}

export interface PreparationUpdate {
  type: 'start' | 'batch_start' | 'batch_complete' | 'complete';
  total?: number;
  current?: number;
  batch_size?: number;
  items?: BatchItem[];
  completed?: number;
  generated_count?: number;
  message?: string;
  errors?: Array<{ type: string; topic_name: string; error: string }>;
}

export async function prepareCurriculumContent(
  curriculumId: string,
  onProgress: (update: PreparationUpdate) => void
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/curriculums/${curriculumId}/prepare`, {
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const update = JSON.parse(line.slice(6)) as PreparationUpdate;
          onProgress(update);
        } catch (e) {
          console.error('Failed to parse SSE data:', e);
        }
      }
    }
  }
}

// ============ Lessons ============

export async function generateLesson(
  curriculumId: string, 
  clusterIndex: number, 
  topicIndex: number
): Promise<Lesson> {
  const response = await fetch(`${API_BASE_URL}/api/lesson`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      curriculum_id: curriculumId,
      cluster_index: clusterIndex,
      topic_index: topicIndex
    }),
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return response.json();
}

// ============ Quizzes ============

export async function generateQuiz(
  curriculumId: string, 
  clusterIndex: number, 
  topicIndex: number
): Promise<Quiz> {
  const response = await fetch(`${API_BASE_URL}/api/quiz`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      curriculum_id: curriculumId,
      cluster_index: clusterIndex,
      topic_index: topicIndex
    }),
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return response.json();
}

export async function generateNewQuiz(
  curriculumId: string, 
  clusterIndex: number, 
  topicIndex: number
): Promise<Quiz> {
  const response = await fetch(`${API_BASE_URL}/api/quiz/new`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      curriculum_id: curriculumId,
      cluster_index: clusterIndex,
      topic_index: topicIndex
    }),
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return response.json();
}

export async function submitQuiz(
  curriculumId: string,
  clusterIndex: number,
  topicIndex: number,
  answers: number[]
): Promise<QuizAssessment> {
  const response = await fetch(`${API_BASE_URL}/api/quiz/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      curriculum_id: curriculumId,
      cluster_index: clusterIndex,
      topic_index: topicIndex,
      answers
    }),
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return response.json();
}

export interface QuizHistoryItem {
  version: number;
  quiz: Quiz;
  assessments: QuizAssessment[];
}

export interface QuizHistory {
  total_quizzes: number;
  history: QuizHistoryItem[];
}

export async function getQuizHistory(
  curriculumId: string,
  clusterIndex: number,
  topicIndex: number
): Promise<QuizHistory> {
  const response = await fetch(
    `${API_BASE_URL}/api/quiz/history/${curriculumId}/${clusterIndex}/${topicIndex}`
  );
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return response.json();
}

// ============ AI Tutor ============

export async function getChatHistory(
  curriculumId: string,
  clusterIndex: number,
  topicIndex: number
): Promise<ChatMessage[]> {
  const response = await fetch(
    `${API_BASE_URL}/api/chat/${curriculumId}/${clusterIndex}/${topicIndex}`
  );
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  const data = await response.json();
  return data.messages;
}

export async function chatWithTutor(
  curriculumId: string,
  clusterIndex: number,
  topicIndex: number,
  message: string,
  highlightedContext: string = ""
): Promise<{ response: string; history: ChatMessage[] }> {
  const response = await fetch(`${API_BASE_URL}/api/tutor`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      curriculum_id: curriculumId,
      cluster_index: clusterIndex,
      topic_index: topicIndex,
      message,
      highlighted_context: highlightedContext
    }),
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return response.json();
}
