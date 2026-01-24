import { useState } from 'react';
import type { Quiz } from '../types';

interface QuizViewProps {
  quiz: Quiz;
  onSubmit: (answers: number[]) => void;
  onBack: () => void;
  isReviewMode?: boolean;
  reviewVersion?: number | null;
}

export function QuizView({ quiz, onSubmit, onBack, isReviewMode, reviewVersion }: QuizViewProps) {
  const [answers, setAnswers] = useState<(number | null)[]>(
    new Array(quiz.questions.length).fill(null)
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAnswers, setShowAnswers] = useState(false);

  const handleSelectAnswer = (questionIndex: number, optionIndex: number) => {
    if (isReviewMode && showAnswers) return; // Don't allow changes when showing answers in review
    
    const newAnswers = [...answers];
    newAnswers[questionIndex] = optionIndex;
    setAnswers(newAnswers);
  };

  const handleSubmit = async () => {
    if (answers.some(a => a === null)) return;
    
    setIsSubmitting(true);
    await onSubmit(answers as number[]);
    setIsSubmitting(false);
  };

  const handleShowAnswers = () => {
    setShowAnswers(true);
  };

  const allAnswered = answers.every(a => a !== null);
  const answeredCount = answers.filter(a => a !== null).length;

  return (
    <div className="animate-fade-in" data-testid="quiz-view">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-white/50 hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Lesson
        </button>
        
        <div className="flex items-center gap-4">
          {isReviewMode && (
            <span className="px-3 py-1 rounded-full bg-white/10 text-white/60 text-sm">
              Reviewing Quiz #{(reviewVersion ?? 0) + 1}
            </span>
          )}
          <div className="text-white/40 text-sm">
            {answeredCount} of {quiz.questions.length} answered
          </div>
        </div>
      </div>

      {/* Quiz info */}
      <div className="p-4 rounded-xl glass mb-8">
        <div className="flex items-center gap-4 text-white/60 text-sm">
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            {quiz.questions.length} questions
          </span>
          <span>•</span>
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {quiz.passing_score}% to pass
          </span>
          {isReviewMode && (
            <>
              <span>•</span>
              <span className="text-electric-400">Review Mode</span>
            </>
          )}
        </div>
      </div>

      {/* Questions */}
      <div className="space-y-8">
        {quiz.questions.map((question, qIndex) => {
          const userAnswer = answers[qIndex];
          const isCorrect = showAnswers && userAnswer === question.correct_index;
          const isWrong = showAnswers && userAnswer !== null && userAnswer !== question.correct_index;
          
          return (
            <div 
              key={qIndex}
              className={`p-6 rounded-2xl glass-strong animate-slide-up ${
                showAnswers && isCorrect ? 'border border-electric-500/30' :
                showAnswers && isWrong ? 'border border-coral-500/30' : ''
              }`}
              style={{ animationDelay: `${qIndex * 50}ms` }}
            >
              <div className="flex items-start gap-4 mb-4">
                <span className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center 
                               text-white/60 font-mono text-sm flex-shrink-0">
                  {qIndex + 1}
                </span>
                <h3 className="text-lg font-medium text-white">{question.question}</h3>
              </div>
              
              <div className="space-y-3 pl-12">
                {question.options.map((option, oIndex) => {
                  const isSelected = answers[qIndex] === oIndex;
                  const isCorrectOption = question.correct_index === oIndex;
                  const showAsCorrect = showAnswers && isCorrectOption;
                  const showAsWrong = showAnswers && isSelected && !isCorrectOption;
                  
                  return (
                    <button
                      key={oIndex}
                      onClick={() => handleSelectAnswer(qIndex, oIndex)}
                      disabled={isReviewMode && showAnswers}
                      className={`w-full text-left p-4 rounded-xl transition-all duration-200
                                 ${showAsCorrect
                                   ? 'bg-electric-500/20 border-2 border-electric-500'
                                   : showAsWrong
                                     ? 'bg-coral-500/20 border-2 border-coral-500'
                                     : isSelected
                                       ? 'bg-electric-500/20 border-2 border-electric-500'
                                       : 'glass hover:glass-strong border-2 border-transparent'
                                 }
                                 ${isReviewMode && showAnswers ? 'cursor-default' : ''}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center
                                        ${showAsCorrect
                                          ? 'border-electric-500 bg-electric-500'
                                          : showAsWrong
                                            ? 'border-coral-500 bg-coral-500'
                                            : isSelected
                                              ? 'border-electric-500 bg-electric-500'
                                              : 'border-white/30'
                                        }`}>
                          {(showAsCorrect || (isSelected && !showAnswers)) && (
                            <svg className="w-4 h-4 text-midnight-950" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                          {showAsWrong && (
                            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          )}
                        </span>
                        <span className={`${
                          showAsCorrect ? 'text-electric-400' :
                          showAsWrong ? 'text-coral-400' :
                          isSelected ? 'text-white' : 'text-white/70'
                        }`}>
                          {option}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
              
              {/* Show explanation when answers revealed */}
              {showAnswers && (
                <div className="mt-4 ml-12 p-4 rounded-xl bg-white/5 border-l-2 border-electric-500">
                  <p className="text-white/70 text-sm">{question.explanation}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Submit / Actions */}
      <div className="mt-10 sticky bottom-6">
        {isReviewMode ? (
          <div className="flex gap-4">
            {!showAnswers ? (
              <>
                <button
                  onClick={onBack}
                  className="flex-1 py-4 px-6 rounded-xl font-semibold glass hover:glass-strong text-white/80"
                >
                  Back to Lesson
                </button>
                <button
                  onClick={handleShowAnswers}
                  className="flex-1 py-4 px-6 rounded-xl font-bold
                             bg-gradient-to-r from-electric-500 to-electric-400 text-midnight-950
                             hover:from-electric-400 hover:to-electric-500 transition-all"
                >
                  Show Answers
                </button>
              </>
            ) : (
              <button
                onClick={onBack}
                className="w-full py-4 px-6 rounded-xl font-semibold
                           bg-gradient-to-r from-electric-500 to-electric-400 text-midnight-950
                           hover:from-electric-400 hover:to-electric-500 transition-all"
              >
                Back to Lesson
              </button>
            )}
          </div>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!allAnswered || isSubmitting}
            className="w-full py-4 px-6 rounded-xl font-bold text-lg
                       bg-gradient-to-r from-electric-500 to-electric-400 text-midnight-950
                       hover:from-electric-400 hover:to-electric-500
                       disabled:from-midnight-700 disabled:to-midnight-600 disabled:text-white/30
                       disabled:cursor-not-allowed
                       transform hover:scale-[1.01] active:scale-[0.99]
                       transition-all duration-200 glow"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-3">
                <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Checking answers...
              </span>
            ) : allAnswered ? (
              'Submit Quiz'
            ) : (
              `Answer all questions (${answeredCount}/${quiz.questions.length})`
            )}
          </button>
        )}
      </div>
    </div>
  );
}
