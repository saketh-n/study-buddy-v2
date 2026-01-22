import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getCurriculum, getLearningProgress, getContentStatus, prepareCurriculumContent } from '../api';
import type { Curriculum, LearningProgress, FlatTopic } from '../types';
import type { ContentStatus, PreparationUpdate, BatchItem } from '../api';
import { flattenTopics, getTopicKey } from '../types';

export function CurriculumPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [curriculum, setCurriculum] = useState<Curriculum | null>(null);
  const [progress, setProgress] = useState<LearningProgress | null>(null);
  const [contentStatus, setContentStatus] = useState<ContentStatus | null>(null);
  const [flatTopics, setFlatTopics] = useState<FlatTopic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Generation tracking state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingItems, setGeneratingItems] = useState<Set<string>>(new Set());
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [generationProgress, setGenerationProgress] = useState({ completed: 0, total: 0 });
  const generationStartedRef = useRef(false);
  const currentBatchRef = useRef<BatchItem[]>([]);

  // Helper to create item key for tracking
  const getItemKey = useCallback((clusterIndex: number, topicIndex: number, type: 'lesson' | 'quiz') => {
    return `${clusterIndex}-${topicIndex}-${type}`;
  }, []);

  // Start background content generation
  const startBackgroundGeneration = useCallback(async () => {
    if (!id || generationStartedRef.current) return;
    generationStartedRef.current = true;
    
    setIsGenerating(true);
    setGenerationError(null);
    
    try {
      await prepareCurriculumContent(id, (update: PreparationUpdate) => {
        if (update.type === 'start') {
          setGenerationProgress({ completed: 0, total: update.total || 0 });
        } else if (update.type === 'batch_start' && update.items) {
          // Track which items are currently being generated
          currentBatchRef.current = update.items;
          setGeneratingItems(prev => {
            const newSet = new Set(prev);
            for (const item of update.items!) {
              newSet.add(getItemKey(item.cluster_index, item.topic_index, item.type));
            }
            return newSet;
          });
        } else if (update.type === 'batch_complete') {
          // Remove completed items from generating set and update content status
          const completedBatch = currentBatchRef.current;
          setGeneratingItems(prev => {
            const newSet = new Set(prev);
            for (const item of completedBatch) {
              newSet.delete(getItemKey(item.cluster_index, item.topic_index, item.type));
            }
            return newSet;
          });
          
          // Update content status to reflect newly cached items
          setContentStatus(prev => {
            if (!prev) return prev;
            const newStatus = { ...prev };
            for (const item of completedBatch) {
              if (item.type === 'lesson') {
                newStatus.missing_lessons = newStatus.missing_lessons.filter(
                  m => !(m.cluster_index === item.cluster_index && m.topic_index === item.topic_index)
                );
                newStatus.lessons_cached++;
              } else {
                newStatus.missing_quizzes = newStatus.missing_quizzes.filter(
                  m => !(m.cluster_index === item.cluster_index && m.topic_index === item.topic_index)
                );
                newStatus.quizzes_cached++;
              }
            }
            // Check if all content is now ready
            newStatus.ready = newStatus.lessons_cached === newStatus.total_topics && 
                             newStatus.quizzes_cached === newStatus.total_topics;
            return newStatus;
          });
          
          setGenerationProgress({ 
            completed: update.completed || 0, 
            total: update.total || 0 
          });
          currentBatchRef.current = [];
        } else if (update.type === 'complete') {
          setIsGenerating(false);
          setGeneratingItems(new Set());
          // Mark content as fully ready
          setContentStatus(prev => prev ? { ...prev, ready: true } : prev);
        }
      });
    } catch (e) {
      setGenerationError('Failed to generate content');
      setIsGenerating(false);
    }
  }, [id, getItemKey]);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      
      try {
        setIsLoading(true);
        const [record, progressData, status] = await Promise.all([
          getCurriculum(id),
          getLearningProgress(id).catch(() => null),
          getContentStatus(id).catch(() => null)
        ]);
        setCurriculum(record.curriculum);
        setProgress(progressData);
        setContentStatus(status);
        setFlatTopics(flattenTopics(record.curriculum));
        
        // Auto-start generation if content is not ready
        if (status && !status.ready) {
          // Small delay to ensure state is set before starting generation
          setTimeout(() => startBackgroundGeneration(), 100);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load curriculum');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id, startBackgroundGeneration]);

  const getFirstTopicKey = () => {
    const firstIncomplete = flatTopics.find(t => {
      const key = getTopicKey(t.clusterIndex, t.topicIndex);
      return !progress?.topics[key]?.completed;
    });
    return firstIncomplete?.topicKey || flatTopics[0]?.topicKey || '0-0';
  };

  // Check if first topic's lesson is ready (for enabling Start Learning button)
  const isFirstLessonReady = () => {
    if (flatTopics.length === 0) return false;
    const first = flatTopics[0];
    return hasLesson(first.clusterIndex, first.topicIndex);
  };

  const handleStartLearning = () => {
    if (!id || !isFirstLessonReady()) return;
    navigate(`/curriculum/${id}/learn/${getFirstTopicKey()}`);
  };

  const handleTopicClick = (topicKey: string, clusterIndex: number, topicIndex: number) => {
    // Only allow clicking if the topic has its lesson ready
    if (!hasLesson(clusterIndex, topicIndex)) return;
    navigate(`/curriculum/${id}/learn/${topicKey}`);
  };

  const isTopicCompleted = (clusterIndex: number, topicIndex: number): boolean => {
    if (!progress) return false;
    return progress.topics[getTopicKey(clusterIndex, topicIndex)]?.completed || false;
  };

  // Check if lesson/quiz is cached for a topic
  const hasLesson = (clusterIndex: number, topicIndex: number): boolean => {
    if (!contentStatus) return false;
    return !contentStatus.missing_lessons.some(
      m => m.cluster_index === clusterIndex && m.topic_index === topicIndex
    );
  };

  const hasQuiz = (clusterIndex: number, topicIndex: number): boolean => {
    if (!contentStatus) return false;
    return !contentStatus.missing_quizzes.some(
      m => m.cluster_index === clusterIndex && m.topic_index === topicIndex
    );
  };

  // Check if lesson/quiz is currently being generated
  const isLessonGenerating = (clusterIndex: number, topicIndex: number): boolean => {
    return generatingItems.has(getItemKey(clusterIndex, topicIndex, 'lesson'));
  };

  const isQuizGenerating = (clusterIndex: number, topicIndex: number): boolean => {
    return generatingItems.has(getItemKey(clusterIndex, topicIndex, 'quiz'));
  };


  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3 text-white/60">
          <svg className="w-6 h-6 animate-spin" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-lg">Loading curriculum...</span>
        </div>
      </div>
    );
  }

  if (error || !curriculum) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Curriculum Not Found</h1>
          <p className="text-white/50 mb-6">{error || 'The curriculum you\'re looking for doesn\'t exist.'}</p>
          <Link 
            to="/"
            className="px-6 py-3 rounded-xl bg-electric-500 text-midnight-950 font-semibold hover:bg-electric-400 transition-colors"
          >
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  // Calculate progress stats
  const totalTopics = curriculum.clusters.reduce((sum, c) => sum + c.topics.length, 0);
  const completedTopics = progress ? Object.values(progress.topics).filter(t => t.completed).length : 0;
  const progressPercent = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

  // Content generation stats
  const contentGenerated = contentStatus ? contentStatus.lessons_cached + contentStatus.quizzes_cached : 0;
  const contentTotal = totalTopics * 2; // lesson + quiz per topic
  const contentPercent = contentTotal > 0 ? Math.round((contentGenerated / contentTotal) * 100) : 0;

  // Sort clusters by order
  const sortedClusters = [...curriculum.clusters].sort((a, b) => a.order - b.order);

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Back button */}
        <Link 
          to="/"
          className="inline-flex items-center gap-2 text-white/50 hover:text-white mb-8 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Home
        </Link>

        {/* Start Learning CTA */}
        <div className="mb-8 p-6 rounded-2xl glass-strong animate-fade-in">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="space-y-3">
              <h2 className="text-xl font-bold text-white">
                {isGenerating ? 'Preparing Your Lessons...' : 'Ready to Learn?'}
              </h2>
              
              {/* Learning Progress */}
              {completedTopics > 0 && (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-electric-500 rounded-full transition-all duration-500"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                    <span className="text-white/60 text-xs">{progressPercent}%</span>
                  </div>
                  <span className="text-white/40 text-xs">
                    {completedTopics}/{totalTopics} completed
                  </span>
                </div>
              )}
              
              {/* Content Status */}
              {contentStatus && (
                <div className="flex items-center gap-2 text-xs">
                  {contentStatus.ready ? (
                    <span className="flex items-center gap-1.5 text-electric-400">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      All content ready
                    </span>
                  ) : isGenerating ? (
                    <span className="flex items-center gap-1.5 text-electric-400">
                      <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Generating content... {contentGenerated}/{contentTotal}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-white/40">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {contentGenerated}/{contentTotal} items prepared ({contentPercent}%)
                    </span>
                  )}
                </div>
              )}
              
              {/* Generation Error */}
              {generationError && (
                <div className="text-xs text-coral-400">
                  {generationError}
                </div>
              )}
            </div>
            
            <button
              onClick={handleStartLearning}
              disabled={!isFirstLessonReady()}
              className={`px-8 py-4 rounded-xl font-bold text-lg flex items-center gap-3 transition-all duration-200
                         ${isFirstLessonReady() 
                           ? 'bg-gradient-to-r from-electric-500 to-electric-400 text-midnight-950 hover:from-electric-400 hover:to-electric-500 transform hover:scale-[1.02] active:scale-[0.98] glow cursor-pointer' 
                           : 'bg-white/10 text-white/40 cursor-not-allowed'}`}
            >
              {!isFirstLessonReady() ? (
                <>
                  <svg className="w-6 h-6 animate-spin" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Preparing...
                </>
              ) : completedTopics > 0 ? (
                <>
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Continue Learning
                </>
              ) : (
                <>
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  Start Learning
                </>
              )}
            </button>
          </div>
        </div>

        {/* Curriculum Header */}
        <div className="mb-10 animate-fade-in">
          <h1 className="text-4xl font-extrabold text-gradient mb-3">
            {curriculum.subject}
          </h1>
          <p className="text-white/60 text-lg leading-relaxed max-w-2xl">
            {curriculum.description}
          </p>
          
          {/* Stats */}
          <div className="flex gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-electric-400"></div>
              <span className="text-white/50 text-sm">
                <span className="text-white/80 font-semibold">{curriculum.clusters.length}</span> clusters
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-coral-400"></div>
              <span className="text-white/50 text-sm">
                <span className="text-white/80 font-semibold">{totalTopics}</span> topics
              </span>
            </div>
          </div>
          
          <p className="mt-4 text-white/30 text-sm flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
            </svg>
            Click any topic to start learning
          </p>
        </div>

        {/* Curriculum Content */}
        <div className="relative">
          {/* Vertical connector line */}
          <div className="absolute left-6 top-0 bottom-0 w-px bg-gradient-to-b from-electric-500/50 via-coral-500/30 to-transparent"></div>
          
          {/* Clusters */}
          <div className="space-y-6 pl-16">
            {sortedClusters.map((cluster, index) => {
              const clusterIndex = curriculum.clusters.findIndex(c => c.name === cluster.name);
              const sortedTopics = [...cluster.topics].sort((a, b) => a.order - b.order);
              const clusterCompleted = sortedTopics.filter((topic) => {
                const originalIndex = cluster.topics.findIndex(t => t.name === topic.name);
                return isTopicCompleted(clusterIndex, originalIndex);
              }).length;
              
              return (
                <div key={cluster.name} className="relative animate-slide-up" style={{ animationDelay: `${index * 100}ms` }}>
                  {/* Timeline dot */}
                  <div className="absolute -left-16 top-6 w-3 h-3 rounded-full bg-electric-400 
                                  shadow-lg shadow-electric-400/50"></div>
                  
                  <div className="rounded-2xl glass-strong overflow-hidden">
                    {/* Cluster Header */}
                    <div className="p-6 border-b border-white/[0.06]">
                      <div className="flex items-center gap-4">
                        <div className="flex-shrink-0 w-12 h-12 rounded-xl 
                                        bg-gradient-to-br from-electric-500/30 to-coral-500/20
                                        flex items-center justify-center glow">
                          <span className="text-2xl font-bold text-gradient">{cluster.order}</span>
                        </div>
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-white/95">{cluster.name}</h3>
                          <p className="text-white/50 text-sm">{cluster.description}</p>
                        </div>
                        {clusterCompleted > 0 && (
                          <span className="text-electric-400 text-sm flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            {clusterCompleted}/{cluster.topics.length}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Topics */}
                    <div className="p-4 space-y-2">
                      {sortedTopics.map((topic) => {
                        const originalTopicIndex = cluster.topics.findIndex(t => t.name === topic.name);
                        const topicKey = getTopicKey(clusterIndex, originalTopicIndex);
                        const completed = isTopicCompleted(clusterIndex, originalTopicIndex);
                        const lessonReady = hasLesson(clusterIndex, originalTopicIndex);
                        const quizReady = hasQuiz(clusterIndex, originalTopicIndex);
                        const lessonGen = isLessonGenerating(clusterIndex, originalTopicIndex);
                        const quizGen = isQuizGenerating(clusterIndex, originalTopicIndex);
                        const isPending = !lessonReady && !lessonGen;
                        
                        return (
                          <button
                            key={topic.name}
                            onClick={() => handleTopicClick(topicKey, clusterIndex, originalTopicIndex)}
                            disabled={!lessonReady}
                            className={`w-full text-left p-4 rounded-xl transition-all duration-200 group
                                       ${isPending 
                                         ? 'glass opacity-50 cursor-not-allowed' 
                                         : lessonReady 
                                           ? 'glass hover:glass-strong hover:scale-[1.01] active:scale-[0.99] cursor-pointer'
                                           : 'glass cursor-wait'}`}
                          >
                            <div className="flex items-center gap-4">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors
                                              ${completed 
                                                ? 'bg-electric-500' 
                                                : isPending
                                                  ? 'bg-white/10'
                                                  : 'bg-electric-500/20 group-hover:bg-electric-500/30'}`}>
                                {completed ? (
                                  <svg className="w-5 h-5 text-midnight-950" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                  </svg>
                                ) : isPending ? (
                                  <span className="text-white/30 font-mono font-bold text-sm">{topic.order}</span>
                                ) : (
                                  <span className="text-electric-400 font-mono font-bold text-sm">{topic.order}</span>
                                )}
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <h4 className={`font-semibold truncate transition-colors
                                               ${completed 
                                                 ? 'text-electric-400' 
                                                 : isPending 
                                                   ? 'text-white/40' 
                                                   : 'text-white/90 group-hover:text-white'}`}>
                                  {topic.name}
                                </h4>
                                <p className={`text-sm truncate ${isPending ? 'text-white/30' : 'text-white/50'}`}>
                                  {topic.description}
                                </p>
                                
                                {/* Content status indicators */}
                                {contentStatus && !completed && (
                                  <div className="flex items-center gap-3 mt-1.5">
                                    {/* Lesson status */}
                                    <span className={`flex items-center gap-1 text-xs ${
                                      lessonReady ? 'text-electric-400/70' : lessonGen ? 'text-electric-400' : 'text-white/30'
                                    }`}>
                                      {lessonGen ? (
                                        <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24">
                                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                      ) : (
                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                        </svg>
                                      )}
                                      {lessonReady ? 'Lesson ready' : lessonGen ? 'Generating lesson...' : 'Pending'}
                                    </span>
                                    
                                    {/* Quiz status */}
                                    <span className={`flex items-center gap-1 text-xs ${
                                      quizReady ? 'text-electric-400/70' : quizGen ? 'text-electric-400' : 'text-white/30'
                                    }`}>
                                      {quizGen ? (
                                        <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24">
                                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                      ) : (
                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                        </svg>
                                      )}
                                      {quizReady ? 'Quiz ready' : quizGen ? 'Generating quiz...' : 'Pending'}
                                    </span>
                                  </div>
                                )}
                              </div>
                              
                              {/* Arrow indicator - only show if clickable */}
                              {lessonReady && !completed && (
                                <svg 
                                  className="w-5 h-5 text-white/30 group-hover:text-electric-400 transition-colors"
                                  fill="none" viewBox="0 0 24 24" stroke="currentColor"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              )}
                              
                              {/* Lock icon for pending topics */}
                              {isPending && (
                                <svg 
                                  className="w-5 h-5 text-white/20"
                                  fill="none" viewBox="0 0 24 24" stroke="currentColor"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-white/[0.06] text-center">
          <p className="text-white/30 text-sm">
            Start from the top and work your way down for the best learning experience
          </p>
        </div>
      </div>
    </div>
  );
}
