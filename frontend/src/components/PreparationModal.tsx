import { useState, useEffect } from 'react';
import { prepareCurriculumContent } from '../api';
import type { PreparationUpdate, BatchItem } from '../api';

interface PreparationModalProps {
  curriculumId: string;
  curriculumName: string;
  onComplete: () => void;
  onCancel: () => void;
}

type Stage = 'preparing' | 'complete' | 'error';

export function PreparationModal({
  curriculumId,
  curriculumName,
  onComplete,
  onCancel
}: PreparationModalProps) {
  const [stage, setStage] = useState<Stage>('preparing');
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const [currentBatch, setCurrentBatch] = useState<BatchItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const startPreparation = async () => {
    try {
      await prepareCurriculumContent(curriculumId, (update: PreparationUpdate) => {
        if (update.type === 'start') {
          setProgress({ completed: 0, total: update.total || 0 });
        } else if (update.type === 'batch_start') {
          setCurrentBatch(update.items || []);
        } else if (update.type === 'batch_complete') {
          setProgress({ 
            completed: update.completed || 0, 
            total: update.total || 0 
          });
          setCurrentBatch([]);
        } else if (update.type === 'complete') {
          setStage('complete');
          setTimeout(onComplete, 600);
        }
      });
    } catch (e) {
      setError('Failed to prepare content');
      setStage('error');
    }
  };

  // Start preparing immediately on mount
  useEffect(() => {
    startPreparation();
  }, [curriculumId]);

  const progressPercent = progress.total > 0 
    ? Math.round((progress.completed / progress.total) * 100) 
    : 0;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
      <div className="w-full max-w-lg mx-4 p-8 rounded-3xl glass-strong animate-scale-in">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-electric-500/20 flex items-center justify-center">
            {stage === 'preparing' && (
              <svg className="w-8 h-8 text-electric-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            )}
            {stage === 'complete' && (
              <svg className="w-8 h-8 text-electric-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            {stage === 'error' && (
              <svg className="w-8 h-8 text-coral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            )}
          </div>
          
          <h2 className="text-2xl font-bold text-white mb-2">
            {stage === 'preparing' && 'Preparing your lessons'}
            {stage === 'complete' && 'Ready to learn!'}
            {stage === 'error' && 'Something went wrong'}
          </h2>
          
          <p className="text-white/50 text-sm">
            {stage === 'preparing' && `Generating content for "${curriculumName}"`}
            {stage === 'complete' && 'Starting your learning journey...'}
            {stage === 'error' && error}
          </p>
        </div>

        {/* Progress Section */}
        {stage === 'preparing' && (
          <div className="space-y-4">
            {/* Progress Bar */}
            <div>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-white/60">
                  {progress.completed} of {progress.total} items complete
                </span>
                <span className="text-electric-400 font-medium">{progressPercent}%</span>
              </div>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-electric-500 to-electric-400 transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Current Batch - show items being generated in parallel */}
            {currentBatch.length > 0 && (
              <div className="space-y-2">
                <p className="text-white/40 text-xs uppercase tracking-wider">
                  Generating {currentBatch.length} items in parallel
                </p>
                <div className="grid gap-2">
                  {currentBatch.map((item, idx) => (
                    <div key={idx} className="p-3 rounded-xl glass flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-electric-500/20 flex items-center justify-center flex-shrink-0">
                        {item.type === 'lesson' ? (
                          <svg className="w-3.5 h-3.5 text-electric-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                          </svg>
                        ) : (
                          <svg className="w-3.5 h-3.5 text-electric-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white/80 text-sm font-medium truncate">{item.topic_name}</p>
                        <p className="text-white/40 text-xs capitalize">{item.type}</p>
                      </div>
                      <div className="w-4 h-4 border-2 border-electric-400/30 border-t-electric-400 rounded-full animate-spin" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Waiting state when between batches */}
            {currentBatch.length === 0 && progress.completed > 0 && progress.completed < progress.total && (
              <div className="p-4 rounded-xl glass text-center">
                <div className="w-5 h-5 mx-auto border-2 border-electric-400/30 border-t-electric-400 rounded-full animate-spin" />
                <p className="text-white/40 text-sm mt-2">Starting next batch...</p>
              </div>
            )}

            {/* Info */}
            <p className="text-white/30 text-xs text-center">
              Generating 4 items in parallel for faster preparation
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 flex gap-3">
          {stage === 'preparing' && (
            <button
              onClick={onCancel}
              className="flex-1 py-3 px-4 rounded-xl glass hover:glass-strong text-white/70 hover:text-white transition-all text-sm"
            >
              Skip & Learn On-Demand
            </button>
          )}
          
          {stage === 'error' && (
            <>
              <button
                onClick={onCancel}
                className="flex-1 py-3 px-4 rounded-xl glass hover:glass-strong text-white/70 hover:text-white transition-all"
              >
                Learn On-Demand
              </button>
              <button
                onClick={() => {
                  setStage('preparing');
                  setError(null);
                  setProgress({ completed: 0, total: 0 });
                  setCurrentBatch([]);
                  startPreparation();
                }}
                className="flex-1 py-3 px-4 rounded-xl bg-electric-500 text-midnight-950 font-semibold hover:bg-electric-400 transition-all"
              >
                Retry
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
