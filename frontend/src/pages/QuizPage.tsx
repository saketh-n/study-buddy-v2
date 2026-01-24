import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { getCurriculum, getLearningProgress, generateQuiz, generateNewQuiz, submitQuiz } from '../api';
import type { Curriculum, Quiz, QuizAssessment, FlatTopic, LearningProgress } from '../types';
import { flattenTopics, findTopicByKey } from '../types';
import { QuizView } from '../components/QuizView';
import { QuizResults } from '../components/QuizResults';
import { API_BASE_URL } from '../api';

type QuizMode = 'quiz' | 'results';

export function QuizPage() {
  const { id, topicKey } = useParams<{ id: string; topicKey: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const reviewVersion = searchParams.get('review');
  const isReviewMode = reviewVersion !== null;
  const forceNew = searchParams.get('new') === 'true';
  
  const [curriculum, setCurriculum] = useState<Curriculum | null>(null);
  const [, setProgress] = useState<LearningProgress | null>(null);
  const [flatTopics, setFlatTopics] = useState<FlatTopic[]>([]);
  
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [assessment, setAssessment] = useState<QuizAssessment | null>(null);
  const [mode, setMode] = useState<QuizMode>('quiz');
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currentTopic = topicKey ? findTopicByKey(flatTopics, topicKey) : null;

  // Load curriculum data
  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      
      try {
        setIsLoading(true);
        const [record, progressData] = await Promise.all([
          getCurriculum(id),
          getLearningProgress(id).catch(() => null)
        ]);
        setCurriculum(record.curriculum);
        setProgress(progressData);
        setFlatTopics(flattenTopics(record.curriculum));
      } catch {
        setError('Failed to load curriculum');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id]);

  // Load quiz when topic is ready
  useEffect(() => {
    const loadQuiz = async () => {
      if (!id || !topicKey || flatTopics.length === 0) return;
      
      const topic = findTopicByKey(flatTopics, topicKey);
      if (!topic) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        if (isReviewMode) {
          // Load specific version for review
          const response = await fetch(
            `${API_BASE_URL}/api/quiz/${id}/${topic.clusterIndex}/${topic.topicIndex}/${reviewVersion}`
          );
          if (!response.ok) throw new Error('Quiz not found');
          const quizData = await response.json();
          setQuiz(quizData);
        } else if (forceNew) {
          // Force generate new quiz
          const quizData = await generateNewQuiz(id, topic.clusterIndex, topic.topicIndex);
          setQuiz(quizData);
        } else {
          // Load existing or generate quiz
          const quizData = await generateQuiz(id, topic.clusterIndex, topic.topicIndex);
          setQuiz(quizData);
        }
      } catch {
        setError('Failed to load quiz');
      } finally {
        setIsLoading(false);
      }
    };

    loadQuiz();
  }, [id, topicKey, flatTopics, isReviewMode, reviewVersion, forceNew]);

  const handleSubmitQuiz = async (answers: number[]) => {
    if (!id || !quiz || !currentTopic) return;
    
    try {
      const result = await submitQuiz(
        id,
        currentTopic.clusterIndex,
        currentTopic.topicIndex,
        answers
      );
      setAssessment(result);
      setMode('results');
      
      // Refresh progress if passed
      if (result.passed) {
        const newProgress = await getLearningProgress(id);
        setProgress(newProgress);
      }
    } catch {
      setError('Failed to submit quiz');
    }
  };

  const handleRetryQuiz = async () => {
    if (!id || !currentTopic) return;
    
    setIsLoading(true);
    setAssessment(null);
    setMode('quiz');
    
    try {
      const quizData = await generateNewQuiz(
        id,
        currentTopic.clusterIndex,
        currentTopic.topicIndex
      );
      setQuiz(quizData);
    } catch {
      setError('Failed to generate new quiz');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNextTopic = () => {
    if (!currentTopic) return;
    const nextIndex = currentTopic.globalIndex + 1;
    if (nextIndex < flatTopics.length) {
      navigate(`/curriculum/${id}/learn/${flatTopics[nextIndex].topicKey}`);
    } else {
      navigate(`/curriculum/${id}`);
    }
  };

  const handleBackToLesson = () => {
    navigate(`/curriculum/${id}/learn/${topicKey}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3 text-white/60">
          <svg className="w-6 h-6 animate-spin" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-lg">{isReviewMode ? 'Loading quiz for review...' : 'Loading quiz...'}</span>
        </div>
      </div>
    );
  }

  if (error || !curriculum || !quiz || !currentTopic) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Error</h1>
          <p className="text-white/50 mb-6">{error || 'Quiz not found'}</p>
          <Link 
            to={`/curriculum/${id}/learn/${topicKey}`}
            className="px-6 py-3 rounded-xl bg-electric-500 text-midnight-950 font-semibold"
          >
            Back to Lesson
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 lg:p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Link 
            to={`/curriculum/${id}/learn/${topicKey}`}
            className="flex items-center gap-2 text-white/50 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Lesson
          </Link>
          
          {isReviewMode && (
            <span className="px-3 py-1 rounded-full bg-white/10 text-white/60 text-sm">
              Review Mode
            </span>
          )}
        </div>

        {/* Topic Header */}
        <div className="mb-8 animate-fade-in">
          <div className="flex items-center gap-2 text-white/40 text-sm mb-2">
            <span>{currentTopic.clusterName}</span>
            <span>•</span>
            <span>Quiz</span>
          </div>
          <h1 className="text-3xl font-bold text-white">{currentTopic.topic.name}</h1>
        </div>

        {/* Content */}
        {mode === 'quiz' ? (
          <QuizView
            quiz={quiz}
            onSubmit={handleSubmitQuiz}
            onBack={handleBackToLesson}
            isReviewMode={isReviewMode}
            reviewVersion={isReviewMode ? parseInt(reviewVersion!) : null}
          />
        ) : assessment ? (
          <QuizResults
            assessment={assessment}
            onNextTopic={handleNextTopic}
            onRetryQuiz={handleRetryQuiz}
            onBackToLesson={handleBackToLesson}
            isLastTopic={currentTopic.globalIndex >= flatTopics.length - 1}
            curriculumId={id!}
            isLoadingRetry={isLoading}
          />
        ) : null}
      </div>
    </div>
  );
}

