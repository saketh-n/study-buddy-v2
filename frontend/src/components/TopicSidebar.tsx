import { Link } from 'react-router-dom';
import type { Curriculum, FlatTopic, LearningProgress } from '../types';

interface TopicSidebarProps {
  curriculum: Curriculum;
  flatTopics: FlatTopic[];
  currentTopicKey: string;
  progress: LearningProgress | null;
  onSelectTopic: (topicKey: string) => void;
  curriculumId: string;
}

export function TopicSidebar({
  curriculum,
  flatTopics,
  currentTopicKey,
  progress,
  onSelectTopic,
  curriculumId
}: TopicSidebarProps) {
  const completedCount = progress 
    ? Object.values(progress.topics).filter(t => t.completed).length 
    : 0;

  // Group flat topics by cluster
  const groupedTopics: { clusterName: string; topics: (FlatTopic & { isCompleted: boolean })[] }[] = [];
  let currentCluster = '';
  
  flatTopics.forEach(ft => {
    const isCompleted = progress?.topics[ft.topicKey]?.completed || false;
    
    if (ft.clusterName !== currentCluster) {
      currentCluster = ft.clusterName;
      groupedTopics.push({ clusterName: currentCluster, topics: [] });
    }
    groupedTopics[groupedTopics.length - 1].topics.push({ ...ft, isCompleted });
  });

  return (
    <div className="w-80 border-r border-white/10 flex flex-col bg-midnight-950/30 backdrop-blur-sm hidden lg:flex">
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <Link 
          to={`/curriculum/${curriculumId}`}
          className="text-lg font-bold text-white hover:text-electric-400 transition-colors line-clamp-1"
        >
          {curriculum.subject}
        </Link>
        
        {/* Progress */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-white/40">Progress</span>
            <span className="text-electric-400">{completedCount}/{flatTopics.length}</span>
          </div>
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-electric-500 to-electric-400 rounded-full transition-all duration-500"
              style={{ width: `${flatTopics.length > 0 ? (completedCount / flatTopics.length) * 100 : 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* Topics list */}
      <div className="flex-1 overflow-y-auto p-2">
        {groupedTopics.map((group, gi) => (
          <div key={gi} className="mb-4">
            <h3 className="px-3 py-2 text-xs font-semibold text-white/40 uppercase tracking-wider">
              {group.clusterName}
            </h3>
            
            <div className="space-y-1">
              {group.topics.map((ft) => {
                const isCurrent = ft.topicKey === currentTopicKey;
                
                return (
                  <button
                    key={ft.topicKey}
                    onClick={() => onSelectTopic(ft.topicKey)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg transition-all duration-200
                               flex items-center gap-3 group
                               ${isCurrent 
                                 ? 'bg-electric-500/20 text-white' 
                                 : 'text-white/60 hover:text-white hover:bg-white/5'}`}
                  >
                    {/* Status indicator */}
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0
                                    ${ft.isCompleted 
                                      ? 'bg-electric-500' 
                                      : isCurrent 
                                        ? 'border-2 border-electric-500' 
                                        : 'border-2 border-white/20'}`}>
                      {ft.isCompleted && (
                        <svg className="w-3 h-3 text-midnight-950" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    
                    <span className={`text-sm truncate ${isCurrent ? 'font-medium' : ''}`}>
                      {ft.topic.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-white/10">
        <Link
          to={`/curriculum/${curriculumId}`}
          className="flex items-center gap-2 text-white/40 hover:text-white text-sm transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
          View Full Curriculum
        </Link>
      </div>
    </div>
  );
}
