import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TextInput } from '../components/TextInput';
import { ProgressBar } from '../components/ProgressBar';
import { SavedCurriculums } from '../components/SavedCurriculums';
import { parseCurriculumStream } from '../api';

export function HomePage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState({ value: 0, message: '' });
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleSubmit = async (text: string) => {
    setIsLoading(true);
    setError(null);
    setProgress({ value: 0, message: 'Starting...' });

    try {
      await parseCurriculumStream(text, (update) => {
        setProgress({ value: update.progress, message: update.message });
        
        if (update.status === 'complete' && update.saved_id) {
          setIsLoading(false);
          setRefreshTrigger(prev => prev + 1);
          // Navigate to the new curriculum
          navigate(`/curriculum/${update.saved_id}`);
        } else if (update.status === 'error') {
          setError(update.message);
          setIsLoading(false);
        }
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      setIsLoading(false);
    }
  };

  const handleSelectSaved = (id: string) => {
    navigate(`/curriculum/${id}`);
  };

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-6">
            <span className="w-2 h-2 rounded-full bg-electric-400 animate-pulse-soft"></span>
            <span className="text-white/60 text-sm font-medium">AI-Powered Learning</span>
          </div>
          
          <h1 className="text-5xl sm:text-6xl font-extrabold mb-6">
            <span className="text-white">Study</span>
            <span className="text-gradient">Buddy</span>
          </h1>
          
          <p className="text-white/50 text-lg max-w-xl mx-auto leading-relaxed">
            Paste your learning topics and let AI organize them into a structured 
            curriculum with the optimal learning path.
          </p>
        </div>

        {/* Main Content */}
        <div className="space-y-8">
          {/* Input / Progress Section */}
          <div className="animate-slide-up" style={{ animationDelay: '200ms' }}>
            {isLoading ? (
              <div className="py-16 px-8 rounded-2xl glass-strong">
                <ProgressBar progress={progress.value} message={progress.message} />
              </div>
            ) : (
              <TextInput onSubmit={handleSubmit} isLoading={isLoading} />
            )}
            
            {/* Error display */}
            {error && !isLoading && (
              <div className="mt-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 animate-fade-in">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h4 className="text-red-400 font-medium mb-1">Error</h4>
                    <p className="text-red-300/70 text-sm">{error}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Saved Curriculums Section */}
          {!isLoading && (
            <div className="animate-slide-up" style={{ animationDelay: '400ms' }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
                <h2 className="text-white/40 text-sm font-medium uppercase tracking-wider">
                  Saved Curriculums
                </h2>
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
              </div>
              
              <SavedCurriculums 
                onSelect={handleSelectSaved} 
                refreshTrigger={refreshTrigger}
              />
            </div>
          )}

          {/* Tips */}
          {!isLoading && (
            <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { icon: '📝', title: 'List Topics', desc: 'Paste any list of topics you want to learn' },
                { icon: '🧠', title: 'AI Organizes', desc: 'Claude structures them into a logical path' },
                { icon: '🎯', title: 'Learn Smart', desc: 'Follow the optimized curriculum order' },
              ].map((tip, i) => (
                <div 
                  key={tip.title}
                  className="p-4 rounded-xl glass text-center animate-fade-in"
                  style={{ animationDelay: `${600 + i * 100}ms` }}
                >
                  <div className="text-3xl mb-2">{tip.icon}</div>
                  <h3 className="text-white/90 font-semibold mb-1">{tip.title}</h3>
                  <p className="text-white/40 text-sm">{tip.desc}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

