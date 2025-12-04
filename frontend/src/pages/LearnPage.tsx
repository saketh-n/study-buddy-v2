import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getCurriculum, getLearningProgress, generateLesson, generateQuiz, generateNewQuiz, submitQuiz } from '../api';
import type { Curriculum, LearningProgress, Lesson, Quiz, QuizAssessment, FlatTopic } from '../types';
import { flattenTopics, findTopicByKey } from '../types';
import { LessonView } from '../components/LessonView';
import { QuizView } from '../components/QuizView';
import { QuizResults } from '../components/QuizResults';
import { AiTutor } from '../components/AiTutor';
import { TopicSidebar } from '../components/TopicSidebar';
import { SelectionContextMenu } from '../components/SelectionContextMenu';

type LearnMode = 'lesson' | 'quiz' | 'results' | 'review-quiz';

export function LearnPage() {
  const { id, topicKey: routeTopicKey } = useParams<{ id: string; topicKey?: string }>();
  const navigate = useNavigate();
  
  // Core data
  const [curriculum, setCurriculum] = useState<Curriculum | null>(null);
  const [progress, setProgress] = useState<LearningProgress | null>(null);
  const [flatTopics, setFlatTopics] = useState<FlatTopic[]>([]);
  
  // Current topic
  const [currentTopicKey, setCurrentTopicKey] = useState<string | null>(null);
  const [mode, setMode] = useState<LearnMode>('lesson');
  
  // Lesson & Quiz
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [assessment, setAssessment] = useState<QuizAssessment | null>(null);
  const [reviewingQuizVersion, setReviewingQuizVersion] = useState<number | null>(null);
  
  // Loading states
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isLoadingLesson, setIsLoadingLesson] = useState(false);
  const [isLoadingQuiz, setIsLoadingQuiz] = useState(false);
  
  const [error, setError] = useState<string | null>(null);
  const [isTutorOpen, setIsTutorOpen] = useState(false);
  const [highlightedContext, setHighlightedContext] = useState<string>('');

  // Load curriculum and progress
  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      
      try {
        setIsLoadingData(true);
        const [record, progressData] = await Promise.all([
          getCurriculum(id),
          getLearningProgress(id).catch(() => null)
        ]);
        setCurriculum(record.curriculum);
        setProgress(progressData);
        
        const topics = flattenTopics(record.curriculum);
        setFlatTopics(topics);
        
        // Set initial topic from route or find first incomplete
        if (routeTopicKey && findTopicByKey(topics, routeTopicKey)) {
          setCurrentTopicKey(routeTopicKey);
        } else if (progressData) {
          const firstIncomplete = topics.find(t => !progressData.topics[t.topicKey]?.completed);
          setCurrentTopicKey(firstIncomplete?.topicKey || topics[0]?.topicKey || '0-0');
        } else {
          setCurrentTopicKey(topics[0]?.topicKey || '0-0');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load curriculum');
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchData();
  }, [id, routeTopicKey]);

  // Update URL when topic changes
  useEffect(() => {
    if (currentTopicKey && id && currentTopicKey !== routeTopicKey) {
      navigate(`/curriculum/${id}/learn/${currentTopicKey}`, { replace: true });
    }
  }, [currentTopicKey, id, routeTopicKey, navigate]);

  // Load lesson when topic changes
  useEffect(() => {
    const loadLesson = async () => {
      if (!id || !currentTopicKey || flatTopics.length === 0) return;
      
      const currentTopic = findTopicByKey(flatTopics, currentTopicKey);
      if (!currentTopic) return;
      
      setIsLoadingLesson(true);
      setLesson(null);
      setQuiz(null);
      setAssessment(null);
      setReviewingQuizVersion(null);
      setMode('lesson');
      
      try {
        const lessonData = await generateLesson(
          id,
          currentTopic.clusterIndex,
          currentTopic.topicIndex
        );
        setLesson(lessonData);
      } catch (err) {
        setError('Failed to load lesson');
      } finally {
        setIsLoadingLesson(false);
      }
    };

    loadLesson();
  }, [id, currentTopicKey, flatTopics]);

  const currentTopic = currentTopicKey ? findTopicByKey(flatTopics, currentTopicKey) : null;
  const isTopicCompleted = currentTopic && progress?.topics[currentTopic.topicKey]?.completed;

  const handleStartQuiz = async () => {
    if (!id || !currentTopic) return;
    
    setIsLoadingQuiz(true);
    
    try {
      const quizData = await generateQuiz(
        id,
        currentTopic.clusterIndex,
        currentTopic.topicIndex
      );
      setQuiz(quizData);
      setReviewingQuizVersion(null);
      setMode('quiz');
    } catch (err) {
      setError('Failed to load quiz');
    } finally {
      setIsLoadingQuiz(false);
    }
  };

  const handleTakeNewQuiz = async () => {
    if (!id || !currentTopic) return;
    
    setIsLoadingQuiz(true);
    
    try {
      const quizData = await generateNewQuiz(
        id,
        currentTopic.clusterIndex,
        currentTopic.topicIndex
      );
      setQuiz(quizData);
      setReviewingQuizVersion(null);
      setMode('quiz');
    } catch (err) {
      setError('Failed to generate new quiz');
    } finally {
      setIsLoadingQuiz(false);
    }
  };

  const handleViewQuiz = async (version: number) => {
    if (!id || !currentTopic) return;
    
    setIsLoadingQuiz(true);
    
    try {
      // Fetch specific quiz version
      const response = await fetch(
        `http://localhost:8000/api/quiz/${id}/${currentTopic.clusterIndex}/${currentTopic.topicIndex}/${version}`
      );
      if (!response.ok) throw new Error('Failed to fetch quiz');
      const quizData = await response.json();
      
      setQuiz(quizData);
      setReviewingQuizVersion(version);
      setMode('review-quiz');
    } catch (err) {
      setError('Failed to load quiz');
    } finally {
      setIsLoadingQuiz(false);
    }
  };

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
    } catch (err) {
      setError('Failed to submit quiz');
    }
  };

  const handleNextTopic = () => {
    if (!currentTopic) return;
    const nextIndex = currentTopic.globalIndex + 1;
    if (nextIndex < flatTopics.length) {
      setCurrentTopicKey(flatTopics[nextIndex].topicKey);
    }
  };

  const handleRetryQuiz = async () => {
    if (!id || !currentTopic) return;
    
    setIsLoadingQuiz(true);
    setAssessment(null);
    
    try {
      // Generate a new quiz for retry
      const quizData = await generateNewQuiz(
        id,
        currentTopic.clusterIndex,
        currentTopic.topicIndex
      );
      setQuiz(quizData);
      setReviewingQuizVersion(null);
      setMode('quiz');
    } catch (err) {
      setError('Failed to generate new quiz');
    } finally {
      setIsLoadingQuiz(false);
    }
  };

  const handleBackToLesson = () => {
    setMode('lesson');
    setQuiz(null);
    setAssessment(null);
    setReviewingQuizVersion(null);
  };

  const handleSelectTopic = (topicKey: string) => {
    setCurrentTopicKey(topicKey);
  };

  const handleAddToTutor = (text: string) => {
    setHighlightedContext(text);
    setIsTutorOpen(true);
  };

  const handleClearHighlight = () => {
    setHighlightedContext('');
  };

  if (isLoadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3 text-white/60">
          <svg className="w-6 h-6 animate-spin" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-lg">Loading learning session...</span>
        </div>
      </div>
    );
  }

  if (error || !curriculum) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Error</h1>
          <p className="text-white/50 mb-6">{error}</p>
          <Link 
            to={`/curriculum/${id}`}
            className="px-6 py-3 rounded-xl bg-electric-500 text-midnight-950 font-semibold"
          >
            Back to Curriculum
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Selection Context Menu */}
      <SelectionContextMenu onAddToTutor={handleAddToTutor} />

      {/* Sidebar */}
      <TopicSidebar
        curriculum={curriculum}
        flatTopics={flatTopics}
        currentTopicKey={currentTopicKey || '0-0'}
        progress={progress}
        onSelectTopic={handleSelectTopic}
        curriculumId={id!}
      />

      {/* Main Content */}
      <div className="flex-1 min-w-0 p-6 lg:p-8">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <Link 
              to={`/curriculum/${id}`}
              className="flex items-center gap-2 text-white/50 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Exit Learning
            </Link>
            
            {/* Tutor toggle */}
            <button
              onClick={() => setIsTutorOpen(!isTutorOpen)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all
                         ${isTutorOpen ? 'bg-electric-500 text-midnight-950' : 'glass hover:glass-strong text-white/70 hover:text-white'}
                         ${highlightedContext && !isTutorOpen ? 'ring-2 ring-electric-500 ring-offset-2 ring-offset-midnight-950' : ''}`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              AI Tutor
              {highlightedContext && !isTutorOpen && (
                <span className="w-2 h-2 rounded-full bg-electric-400 animate-pulse"></span>
              )}
            </button>
          </div>

          {/* Topic Header */}
          {currentTopic && (
            <div className="mb-8 animate-fade-in">
              <div className="flex items-center gap-2 text-white/40 text-sm mb-2">
                <span>{currentTopic.clusterName}</span>
                <span>•</span>
                <span>Topic {currentTopic.globalIndex + 1} of {flatTopics.length}</span>
                {isTopicCompleted && (
                  <>
                    <span>•</span>
                    <span className="text-electric-400 flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Completed
                    </span>
                  </>
                )}
              </div>
              <h1 className="text-3xl font-bold text-white">{currentTopic.topic.name}</h1>
            </div>
          )}

          {/* Tip for highlight feature */}
          {mode === 'lesson' && lesson && (
            <div className="mb-6 p-3 rounded-xl glass text-white/40 text-sm flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Tip: Highlight any text and right-click to ask the AI Tutor about it</span>
            </div>
          )}

          {/* Content Area */}
          {isLoadingLesson ? (
            <div className="py-24 text-center">
              <div className="inline-flex items-center gap-3 text-white/60">
                <svg className="w-6 h-6 animate-spin" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span>Loading your lesson...</span>
              </div>
            </div>
          ) : mode === 'lesson' && lesson && currentTopic ? (
            <LessonView
              lesson={lesson}
              onStartQuiz={handleStartQuiz}
              onTakeNewQuiz={handleTakeNewQuiz}
              onViewQuiz={handleViewQuiz}
              isLoadingQuiz={isLoadingQuiz}
              isCompleted={isTopicCompleted || false}
              curriculumId={id!}
              clusterIndex={currentTopic.clusterIndex}
              topicIndex={currentTopic.topicIndex}
            />
          ) : (mode === 'quiz' || mode === 'review-quiz') && quiz ? (
            <QuizView
              quiz={quiz}
              onSubmit={handleSubmitQuiz}
              onBack={handleBackToLesson}
              isReviewMode={mode === 'review-quiz'}
              reviewVersion={reviewingQuizVersion}
            />
          ) : mode === 'results' && assessment ? (
            <QuizResults
              assessment={assessment}
              onNextTopic={handleNextTopic}
              onRetryQuiz={handleRetryQuiz}
              onBackToLesson={handleBackToLesson}
              isLastTopic={currentTopic ? currentTopic.globalIndex >= flatTopics.length - 1 : true}
              curriculumId={id!}
              isLoadingRetry={isLoadingQuiz}
            />
          ) : null}
        </div>
      </div>

      {/* AI Tutor */}
      {currentTopic && (
        <AiTutor
          isOpen={isTutorOpen}
          onClose={() => setIsTutorOpen(false)}
          curriculumId={id!}
          clusterIndex={currentTopic.clusterIndex}
          topicIndex={currentTopic.topicIndex}
          topicName={currentTopic.topic.name}
          highlightedContext={highlightedContext}
          onClearHighlight={handleClearHighlight}
        />
      )}
    </div>
  );
}
