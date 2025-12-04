import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getCurriculum, getLearningProgress } from '../api';
import type { Curriculum, LearningProgress, FlatTopic } from '../types';
import { flattenTopics, getTopicKey } from '../types';

export function CurriculumPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [curriculum, setCurriculum] = useState<Curriculum | null>(null);
  const [progress, setProgress] = useState<LearningProgress | null>(null);
  const [flatTopics, setFlatTopics] = useState<FlatTopic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load curriculum');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleStartLearning = () => {
    // Find first incomplete topic or start from beginning
    const firstIncomplete = flatTopics.find(t => {
      const key = getTopicKey(t.clusterIndex, t.topicIndex);
      return !progress?.topics[key]?.completed;
    });
    
    const topicKey = firstIncomplete?.topicKey || flatTopics[0]?.topicKey || '0-0';
    navigate(`/curriculum/${id}/learn/${topicKey}`);
  };

  const handleTopicClick = (topicKey: string) => {
    navigate(`/curriculum/${id}/learn/${topicKey}`);
  };

  const isTopicCompleted = (clusterIndex: number, topicIndex: number): boolean => {
    if (!progress) return false;
    return progress.topics[getTopicKey(clusterIndex, topicIndex)]?.completed || false;
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
            <div>
              <h2 className="text-xl font-bold text-white mb-2">Ready to Learn?</h2>
              {completedTopics > 0 ? (
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-electric-500 to-electric-400 rounded-full transition-all duration-500"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                    <span className="text-white/60 text-sm">{progressPercent}%</span>
                  </div>
                  <span className="text-white/40 text-sm">
                    {completedTopics}/{totalTopics} topics completed
                  </span>
                </div>
              ) : (
                <p className="text-white/50 text-sm">
                  Start your learning journey with AI-powered lessons and quizzes
                </p>
              )}
            </div>
            
            <button
              onClick={handleStartLearning}
              className="px-8 py-4 rounded-xl font-bold text-lg
                         bg-gradient-to-r from-electric-500 to-electric-400 text-midnight-950
                         hover:from-electric-400 hover:to-electric-500
                         transform hover:scale-[1.02] active:scale-[0.98]
                         transition-all duration-200 glow flex items-center gap-3"
            >
              {completedTopics > 0 ? (
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
                        
                        return (
                          <button
                            key={topic.name}
                            onClick={() => handleTopicClick(topicKey)}
                            className="w-full text-left p-4 rounded-xl glass hover:glass-strong 
                                       transition-all duration-200 group
                                       hover:scale-[1.01] active:scale-[0.99]"
                          >
                            <div className="flex items-center gap-4">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors
                                              ${completed 
                                                ? 'bg-electric-500' 
                                                : 'bg-electric-500/20 group-hover:bg-electric-500/30'}`}>
                                {completed ? (
                                  <svg className="w-5 h-5 text-midnight-950" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                  </svg>
                                ) : (
                                  <span className="text-electric-400 font-mono font-bold text-sm">{topic.order}</span>
                                )}
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <h4 className={`font-semibold truncate group-hover:text-white transition-colors
                                               ${completed ? 'text-electric-400' : 'text-white/90'}`}>
                                  {topic.name}
                                </h4>
                                <p className="text-white/50 text-sm truncate">{topic.description}</p>
                              </div>
                              
                              <svg 
                                className="w-5 h-5 text-white/30 group-hover:text-electric-400 transition-colors"
                                fill="none" viewBox="0 0 24 24" stroke="currentColor"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
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
