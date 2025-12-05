import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getCurriculum, getLearningProgress, generateLesson } from '../api';
import type { Curriculum, LearningProgress, Lesson, FlatTopic } from '../types';
import { flattenTopics, findTopicByKey } from '../types';
import { LessonView } from '../components/LessonView';
import { AiTutor } from '../components/AiTutor';
import { TopicSidebar } from '../components/TopicSidebar';
import { SelectionContextMenu } from '../components/SelectionContextMenu';

export function LearnPage() {
  const { id, topicKey: routeTopicKey } = useParams<{ id: string; topicKey?: string }>();
  const navigate = useNavigate();
  
  // Core data
  const [curriculum, setCurriculum] = useState<Curriculum | null>(null);
  const [progress, setProgress] = useState<LearningProgress | null>(null);
  const [flatTopics, setFlatTopics] = useState<FlatTopic[]>([]);
  
  // Current topic
  const [currentTopicKey, setCurrentTopicKey] = useState<string | null>(null);
  
  // Lesson
  const [lesson, setLesson] = useState<Lesson | null>(null);
  
  // Loading states
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isLoadingLesson, setIsLoadingLesson] = useState(false);
  
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
          {lesson && (
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
          ) : lesson && currentTopic ? (
            <LessonView
              lesson={lesson}
              isCompleted={isTopicCompleted || false}
              curriculumId={id!}
              clusterIndex={currentTopic.clusterIndex}
              topicIndex={currentTopic.topicIndex}
              topicKey={currentTopic.topicKey}
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
