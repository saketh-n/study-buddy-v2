import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Lesson } from '../types';
import { QuizHistory } from './QuizHistory';

interface LessonViewProps {
  lesson: Lesson;
  isCompleted: boolean;
  curriculumId: string;
  clusterIndex: number;
  topicIndex: number;
  topicKey: string;
}

type TabType = 'lesson' | 'quizzes';

export function LessonView({ 
  lesson, 
  isCompleted,
  curriculumId,
  clusterIndex,
  topicIndex,
  topicKey
}: LessonViewProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('lesson');

  const handleStartQuiz = () => {
    navigate(`/curriculum/${curriculumId}/quiz/${topicKey}`);
  };

  const handleTakeNewQuiz = () => {
    navigate(`/curriculum/${curriculumId}/quiz/${topicKey}?new=true`);
  };

  const handleViewQuiz = (version: number) => {
    navigate(`/curriculum/${curriculumId}/quiz/${topicKey}?review=${version}`);
  };

  return (
    <div className="animate-fade-in" data-testid="lesson-view">
      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('lesson')}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-all
                     ${activeTab === 'lesson' 
                       ? 'bg-electric-500 text-midnight-950' 
                       : 'glass text-white/60 hover:text-white'}`}
        >
          Lesson
        </button>
        <button
          onClick={() => setActiveTab('quizzes')}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2
                     ${activeTab === 'quizzes' 
                       ? 'bg-electric-500 text-midnight-950' 
                       : 'glass text-white/60 hover:text-white'}`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          Quiz History
        </button>
      </div>

      {activeTab === 'lesson' ? (
        <>
          {/* Time estimate */}
          <div className="flex items-center gap-2 text-white/40 text-sm mb-6">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>~{lesson.estimated_time_minutes} min read</span>
          </div>

          {/* Introduction */}
          <div className="p-6 rounded-2xl glass-strong mb-8">
            <p className="text-white/80 text-lg leading-relaxed">{lesson.introduction}</p>
          </div>

          {/* Sections */}
          <div className="space-y-8">
            {lesson.sections.map((section, index) => (
              <div 
                key={index} 
                className="animate-slide-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-electric-500/20 flex items-center justify-center text-electric-400 font-mono text-sm">
                    {index + 1}
                  </span>
                  {section.title}
                </h2>
                
                <div className="pl-11">
                  <p className="text-white/70 leading-relaxed whitespace-pre-wrap mb-4">
                    {section.content}
                  </p>
                  
                  {/* Key Points */}
                  {section.key_points.length > 0 && (
                    <div className="p-4 rounded-xl bg-electric-500/10 border border-electric-500/20">
                      <h4 className="text-electric-400 text-sm font-semibold mb-2 uppercase tracking-wider">
                        Key Points
                      </h4>
                      <ul className="space-y-2">
                        {section.key_points.map((point, i) => (
                          <li key={i} className="flex items-start gap-2 text-white/70 text-sm">
                            <svg className="w-4 h-4 text-electric-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            {point}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="mt-10 p-6 rounded-2xl glass-strong border-l-4 border-electric-500">
            <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <svg className="w-5 h-5 text-electric-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Summary
            </h3>
            <p className="text-white/70 leading-relaxed">{lesson.summary}</p>
          </div>

          {/* Take Quiz CTA */}
          <div className="mt-10 p-6 rounded-2xl glass-strong text-center">
            <h3 className="text-xl font-bold text-white mb-2">
              {isCompleted ? 'Review Your Knowledge' : 'Ready to Test Your Knowledge?'}
            </h3>
            <p className="text-white/50 mb-6">
              {isCompleted 
                ? 'You\'ve already mastered this topic. Take another quiz to reinforce your learning!'
                : 'Take a short quiz to demonstrate mastery and unlock the next topic.'
              }
            </p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={handleStartQuiz}
                className="px-8 py-4 rounded-xl font-bold text-lg
                           bg-gradient-to-r from-electric-500 to-electric-400 text-midnight-950
                           hover:from-electric-400 hover:to-electric-500
                           transform hover:scale-[1.02] active:scale-[0.98]
                           transition-all duration-200 glow"
              >
                Take Quiz
              </button>
              
              {isCompleted && (
                <button
                  onClick={() => setActiveTab('quizzes')}
                  className="px-6 py-4 rounded-xl font-semibold glass hover:glass-strong text-white/70 hover:text-white"
                >
                  View Past Quizzes
                </button>
              )}
            </div>
          </div>
        </>
      ) : (
        <QuizHistory
          curriculumId={curriculumId}
          clusterIndex={clusterIndex}
          topicIndex={topicIndex}
          onViewQuiz={handleViewQuiz}
          onTakeNewQuiz={handleTakeNewQuiz}
          isLoadingNewQuiz={false}
        />
      )}
    </div>
  );
}
