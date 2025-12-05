import { useState, useEffect } from 'react';
import { getQuizHistory } from '../api';
import type { QuizHistoryItem } from '../api';

interface QuizHistoryProps {
  curriculumId: string;
  clusterIndex: number;
  topicIndex: number;
  onViewQuiz: (version: number) => void;
  onTakeNewQuiz: () => void;
  isLoadingNewQuiz: boolean;
}

export function QuizHistory({
  curriculumId,
  clusterIndex,
  topicIndex,
  onViewQuiz,
  onTakeNewQuiz,
  isLoadingNewQuiz
}: QuizHistoryProps) {
  const [history, setHistory] = useState<QuizHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedAssessment, setExpandedAssessment] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const loadHistory = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const data = await getQuizHistory(curriculumId, clusterIndex, topicIndex);
        setHistory(data.history);
      } catch (e) {
        console.error('Failed to load quiz history:', e);
        setLoadError('Failed to load quiz history');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadHistory();
  }, [curriculumId, clusterIndex, topicIndex]);

  if (isLoading) {
    return (
      <div className="p-6 rounded-2xl glass-strong">
        <div className="flex items-center justify-center py-8">
          <svg className="w-6 h-6 animate-spin text-white/40" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="p-6 rounded-2xl glass-strong text-center">
        <p className="text-coral-400 mb-4">{loadError}</p>
        <button
          onClick={onTakeNewQuiz}
          className="px-6 py-3 rounded-xl font-semibold
                     bg-gradient-to-r from-electric-500 to-electric-400 text-midnight-950
                     hover:from-electric-400 hover:to-electric-500 transition-all"
        >
          Take a Quiz
        </button>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="p-6 rounded-2xl glass-strong text-center">
        <p className="text-white/50 mb-4">No quiz attempts yet</p>
        <button
          onClick={onTakeNewQuiz}
          disabled={isLoadingNewQuiz}
          className="px-6 py-3 rounded-xl font-semibold
                     bg-gradient-to-r from-electric-500 to-electric-400 text-midnight-950
                     hover:from-electric-400 hover:to-electric-500
                     disabled:opacity-50 transition-all"
        >
          {isLoadingNewQuiz ? 'Loading...' : 'Take Your First Quiz'}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Take New Quiz Button */}
      <div className="flex justify-end">
        <button
          onClick={onTakeNewQuiz}
          disabled={isLoadingNewQuiz}
          className="flex items-center gap-2 px-4 py-2 rounded-xl glass hover:glass-strong
                     text-white/70 hover:text-white transition-all
                     disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoadingNewQuiz ? (
            <>
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Generating...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Take New Quiz
            </>
          )}
        </button>
      </div>

      {/* Quiz History List */}
      {history.map((item) => (
        <div key={item.version} className="rounded-2xl glass-strong overflow-hidden">
          {/* Quiz Header */}
          <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                <span className="text-white/60 font-mono font-bold">#{item.version + 1}</span>
              </div>
              <div>
                <h4 className="font-semibold text-white">Quiz Version {item.version + 1}</h4>
                <p className="text-white/40 text-sm">
                  {item.assessments.length} attempt{item.assessments.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            
            <button
              onClick={() => onViewQuiz(item.version)}
              className="px-4 py-2 rounded-lg glass hover:glass-strong text-white/70 hover:text-white
                         text-sm transition-all flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Review Quiz
            </button>
          </div>
          
          {/* Assessment Results */}
          {item.assessments.length > 0 && (
            <div className="p-4 space-y-2">
              {item.assessments.map((assessment, aidx) => {
                const assessmentKey = `${item.version}-${aidx}`;
                const isExpanded = expandedAssessment === assessmentKey;
                
                return (
                  <div key={aidx} className="rounded-xl glass">
                    <button
                      onClick={() => setExpandedAssessment(isExpanded ? null : assessmentKey)}
                      className="w-full p-3 flex items-center justify-between text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center
                                        ${assessment.passed ? 'bg-electric-500' : 'bg-coral-500/20'}`}>
                          {assessment.passed ? (
                            <svg className="w-5 h-5 text-midnight-950" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <span className="text-coral-400 font-bold text-sm">{assessment.score}%</span>
                          )}
                        </div>
                        <div>
                          <span className={`font-medium ${assessment.passed ? 'text-electric-400' : 'text-white/70'}`}>
                            {assessment.passed ? 'Passed' : 'Not Passed'}
                          </span>
                          <span className="text-white/40 text-sm ml-2">
                            {assessment.correct_count}/{assessment.total_questions} correct
                          </span>
                        </div>
                      </div>
                      
                      <svg
                        className={`w-5 h-5 text-white/40 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    
                    {/* Expanded Assessment Details */}
                    {isExpanded && (
                      <div className="px-3 pb-3 border-t border-white/[0.06] pt-3">
                        {/* Summary */}
                        <div className="mb-4 p-3 rounded-lg bg-white/5">
                          <p className="text-white/70 text-sm">{assessment.summary.encouragement}</p>
                        </div>
                        
                        {/* Misconceptions */}
                        {assessment.summary.misconceptions.length > 0 && (
                          <div className="mb-3">
                            <h5 className="text-xs font-semibold text-coral-400 uppercase tracking-wider mb-2">
                              Areas to Review
                            </h5>
                            <ul className="space-y-1">
                              {assessment.summary.misconceptions.map((m, i) => (
                                <li key={i} className="text-white/60 text-sm flex items-start gap-2">
                                  <span className="text-coral-400">•</span>
                                  {m}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {/* Focus Areas */}
                        {assessment.summary.focus_areas.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {assessment.summary.focus_areas.map((area, i) => (
                              <span 
                                key={i}
                                className="px-2 py-1 rounded-full bg-electric-500/10 text-electric-400 text-xs"
                              >
                                {area}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
