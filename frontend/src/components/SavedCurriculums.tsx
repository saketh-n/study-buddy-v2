import { useState, useEffect } from 'react';
import type { CurriculumSummary } from '../types';
import { listCurriculums, deleteCurriculum } from '../api';

interface SavedCurriculumsProps {
  onSelect: (id: string) => void;
  refreshTrigger?: number;
}

export function SavedCurriculums({ onSelect, refreshTrigger }: SavedCurriculumsProps) {
  const [curriculums, setCurriculums] = useState<CurriculumSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchCurriculums = async () => {
    try {
      setIsLoading(true);
      const data = await listCurriculums();
      setCurriculums(data);
      setError(null);
    } catch (err) {
      setError('Failed to load saved curriculums');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCurriculums();
  }, [refreshTrigger]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this curriculum?')) return;
    
    setDeletingId(id);
    try {
      await deleteCurriculum(id);
      setCurriculums(curriculums.filter(c => c.id !== id));
    } catch (err) {
      console.error('Failed to delete:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getProgressPercent = (completed: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((completed / total) * 100);
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-3">
        {[1, 2].map(i => (
          <div key={i} className="h-24 rounded-xl bg-white/5"></div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-white/40">
        <p>{error}</p>
      </div>
    );
  }

  if (curriculums.length === 0) {
    return (
      <div className="text-center py-12 px-4">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl glass flex items-center justify-center">
          <svg className="w-8 h-8 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </div>
        <p className="text-white/40 text-sm">No saved curriculums yet</p>
        <p className="text-white/25 text-xs mt-1">Generate your first one above!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {curriculums.map((curriculum, index) => {
        const progressPercent = getProgressPercent(curriculum.completed_topics, curriculum.topic_count);
        const isComplete = progressPercent === 100;
        const hasStarted = curriculum.completed_topics > 0;
        
        return (
          <div
            data-testid="curriculum-card"
            key={curriculum.id}
            onClick={() => deletingId !== curriculum.id && onSelect(curriculum.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (deletingId !== curriculum.id) {
                  onSelect(curriculum.id);
                }
              }
            }}
            className="w-full text-left p-4 rounded-xl glass hover:glass-strong 
                       transition-all duration-300 group animate-fade-in
                       hover:scale-[1.01] active:scale-[0.99] cursor-pointer
                       focus:outline-none focus:ring-2 focus:ring-electric-500/50"
            style={{ 
              animationDelay: `${index * 50}ms`,
              opacity: deletingId === curriculum.id ? 0.5 : 1,
              pointerEvents: deletingId === curriculum.id ? 'none' : 'auto'
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-white/90 truncate group-hover:text-white transition-colors">
                    {curriculum.subject}
                  </h3>
                  {isComplete && (
                    <span className="flex-shrink-0 px-2 py-0.5 rounded-full bg-electric-500/20 text-electric-400 text-xs font-medium">
                      ✓ Complete
                    </span>
                  )}
                  <svg 
                    className="w-4 h-4 text-white/30 group-hover:text-electric-400 transition-colors flex-shrink-0 ml-auto"
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
                <p className="text-white/50 text-sm line-clamp-1 mb-3">
                  {curriculum.description}
                </p>
                
                {/* Progress Bar */}
                <div className="mb-2">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-white/40">
                      {hasStarted 
                        ? `${curriculum.completed_topics}/${curriculum.topic_count} topics completed`
                        : 'Not started yet'}
                    </span>
                    {hasStarted && (
                      <span className={`font-medium ${isComplete ? 'text-electric-400' : 'text-white/60'}`}>
                        {progressPercent}%
                      </span>
                    )}
                  </div>
                  <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        isComplete 
                          ? 'bg-electric-500' 
                          : hasStarted 
                            ? 'bg-gradient-to-r from-electric-500 to-electric-400' 
                            : 'bg-white/20'
                      }`}
                      style={{ width: `${Math.max(progressPercent, hasStarted ? 0 : 0)}%` }}
                    />
                  </div>
                </div>
                
                <div className="flex items-center gap-4 text-xs text-white/40">
                  <span className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-electric-400"></div>
                    {curriculum.cluster_count} clusters
                  </span>
                  <span className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-coral-400"></div>
                    {curriculum.topic_count} topics
                  </span>
                  <span className="text-white/30">
                    {formatDate(curriculum.created_at)}
                  </span>
                </div>
              </div>
              
              {/* Delete button */}
              <button
                onClick={(e) => handleDelete(e, curriculum.id)}
                disabled={deletingId === curriculum.id}
                className="p-2 rounded-lg opacity-0 group-hover:opacity-100 
                           hover:bg-red-500/20 text-white/40 hover:text-red-400
                           transition-all duration-200 flex-shrink-0
                           focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:opacity-100"
                title="Delete curriculum"
                aria-label="Delete curriculum"
              >
                {deletingId === curriculum.id ? (
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}