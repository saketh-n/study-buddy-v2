import { Link } from 'react-router-dom';
import type { QuizAssessment } from '../types';
import Markdown from 'react-markdown';

interface QuizResultsProps {
  assessment: QuizAssessment;
  onNextTopic: () => void;
  onRetryQuiz: () => void;
  onBackToLesson: () => void;
  isLastTopic: boolean;
  curriculumId: string;
  isLoadingRetry: boolean;
}

export function QuizResults({
  assessment,
  onNextTopic,
  onRetryQuiz,
  onBackToLesson,
  isLastTopic,
  curriculumId,
  isLoadingRetry
}: QuizResultsProps) {
  return (
    <div className="animate-fade-in">
      {/* Score Header */}
      <div className={`p-8 rounded-2xl glass-strong text-center mb-8 ${
        assessment.passed ? 'border border-electric-500/30' : 'border border-coral-500/30'
      }`}>
        <div className={`text-6xl font-bold mb-4 ${
          assessment.passed ? 'text-electric-400' : 'text-coral-400'
        }`}>
          {assessment.score}%
        </div>
        <h2 className={`text-2xl font-bold mb-2 ${
          assessment.passed ? 'text-electric-400' : 'text-coral-400'
        }`}>
          {assessment.passed ? '🎉 Mastery Achieved!' : 'Keep Learning!'}
        </h2>
        <p className="text-white/60">
          {assessment.correct_count} out of {assessment.total_questions} questions correct
        </p>
      </div>

      {/* Fallback Mode Notice */}
      {assessment.fallback_mode && (
        <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="text-amber-400 font-medium text-sm">Limited Feedback Mode</p>
              <p className="text-white/60 text-sm mt-1">
                AI-powered detailed feedback is currently unavailable (likely due to API credits). 
                Your score has been calculated and progress saved. Basic explanations are shown below.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Summary Section */}
      <div className="mb-8 p-6 rounded-2xl glass-strong">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-electric-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          {assessment.fallback_mode ? 'Results Summary' : 'AI Assessment'}
        </h3>
        
        {/* Encouragement */}
        <p className="text-white/80 mb-4 leading-relaxed">
          {assessment.summary.encouragement}
        </p>
        
        {/* Misconceptions */}
        {assessment.summary.misconceptions.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-coral-400 uppercase tracking-wider mb-2">
              Areas for Improvement
            </h4>
            <ul className="space-y-2">
              {assessment.summary.misconceptions.map((m, i) => (
                <li key={i} className="flex items-start gap-2 text-white/70 text-sm">
                  <svg className="w-4 h-4 text-coral-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01" />
                  </svg>
                  {m}
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {/* Focus Areas */}
        {assessment.summary.focus_areas.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-electric-400 uppercase tracking-wider mb-2">
              Recommended Focus
            </h4>
            <div className="flex flex-wrap gap-2">
              {assessment.summary.focus_areas.map((area, i) => (
                <span 
                  key={i}
                  className="px-3 py-1 rounded-full bg-electric-500/15 text-electric-400 text-sm border border-electric-500/20"
                >
                  {area}
                </span>
              ))}
            </div>
          </div>
        )}
        
        {/* Recommendation */}
        <div className="p-4 rounded-xl bg-white/5 border-l-2 border-electric-500">
          <p className="text-white/70 text-sm">
            <span className="font-semibold text-electric-400">Next Step: </span>
            {assessment.summary.recommendation}
          </p>
        </div>
      </div>

      {/* Question-by-Question Feedback */}
      <div className="mb-8">
        <h3 className="text-lg font-bold text-white mb-4">Question Breakdown</h3>
        <div className="space-y-4">
          {assessment.question_feedback.map((feedback, i) => (
            <div 
              key={i}
              className={`p-4 rounded-xl glass ${
                feedback.is_correct 
                  ? 'border-l-2 border-electric-500' 
                  : 'border-l-2 border-coral-500'
              }`}
            >
              <div className="flex items-start gap-3 mb-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                  feedback.is_correct ? 'bg-electric-500' : 'bg-coral-500'
                }`}>
                  {feedback.is_correct ? (
                    <svg className="w-4 h-4 text-midnight-950" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </div>
                <span className={`text-sm font-semibold ${
                  feedback.is_correct ? 'text-electric-400' : 'text-coral-400'
                }`}>
                  Question {feedback.question_num}
                </span>
              </div>
              
              {!feedback.is_correct && (
                <div className="ml-9 space-y-2 text-sm">
                  <div>
                    <span className="text-white/40">Your answer: </span>
                    <span className="text-coral-400">{feedback.student_choice}</span>
                  </div>
                  <div>
                    <span className="text-white/40">Correct answer: </span>
                    <span className="text-electric-400">{feedback.correct_answer}</span>
                  </div>
                </div>
              )}
              
              <div className="ml-9 mt-3">
                <div className="prose prose-sm prose-invert max-w-none text-white/70
                              prose-p:my-1 prose-strong:text-white/90">
                  <Markdown>{feedback.analysis}</Markdown>
                </div>
                {feedback.explanation && (
                  <div className="mt-2 p-3 rounded-lg bg-white/5">
                    <p className="text-white/60 text-xs uppercase tracking-wider mb-1">Explanation</p>
                    <div className="prose prose-sm prose-invert max-w-none text-white/70">
                      <Markdown>{feedback.explanation}</Markdown>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-4 sticky bottom-6">
        {assessment.passed ? (
          isLastTopic ? (
            <Link
              to={`/curriculum/${curriculumId}`}
              className="flex-1 py-4 px-6 rounded-xl font-semibold text-center
                         bg-gradient-to-r from-electric-500 to-electric-400 text-midnight-950"
            >
              🎓 Curriculum Complete!
            </Link>
          ) : (
            <button
              onClick={onNextTopic}
              className="flex-1 py-4 px-6 rounded-xl font-semibold
                         bg-gradient-to-r from-electric-500 to-electric-400 text-midnight-950
                         hover:from-electric-400 hover:to-electric-500 transition-all"
            >
              Next Topic →
            </button>
          )
        ) : (
          <>
            <button
              onClick={onBackToLesson}
              className="flex-1 py-4 px-6 rounded-xl font-semibold glass hover:glass-strong text-white/80"
            >
              Review Lesson
            </button>
            <button
              onClick={onRetryQuiz}
              disabled={isLoadingRetry}
              className="flex-1 py-4 px-6 rounded-xl font-semibold
                         bg-gradient-to-r from-coral-500 to-coral-400 text-white
                         disabled:opacity-50 disabled:cursor-not-allowed
                         flex items-center justify-center gap-2"
            >
              {isLoadingRetry ? (
                <>
                  <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Generating New Quiz...
                </>
              ) : (
                'Try New Quiz'
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

