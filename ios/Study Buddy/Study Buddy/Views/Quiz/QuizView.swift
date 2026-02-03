import SwiftUI

struct QuizView: View {
    let curriculumId: String
    let topicKey: String
    var forceNew: Bool = false
    var reviewVersion: Int? = nil
    
    @StateObject private var viewModel: QuizViewModel
    @Environment(\.dismiss) private var dismiss
    
    init(curriculumId: String, topicKey: String, forceNew: Bool = false, reviewVersion: Int? = nil) {
        self.curriculumId = curriculumId
        self.topicKey = topicKey
        self.forceNew = forceNew
        self.reviewVersion = reviewVersion
        _viewModel = StateObject(wrappedValue: QuizViewModel(
            curriculumId: curriculumId,
            topicKey: topicKey,
            forceNew: forceNew,
            reviewVersion: reviewVersion
        ))
    }
    
    var body: some View {
        Group {
            if viewModel.isLoading {
                LoadingView(message: viewModel.isReviewMode ? "Loading quiz for review..." : "Loading quiz...")
                    .appBackground()
            } else if viewModel.assessment != nil && !viewModel.isReviewMode {
                // Show results
                QuizResultsView(
                    viewModel: viewModel,
                    curriculumId: curriculumId,
                    topicKey: topicKey
                )
            } else if let quiz = viewModel.quiz {
                // Show quiz questions
                QuizQuestionsView(
                    quiz: quiz,
                    viewModel: viewModel
                )
                .appBackground()
            } else if let error = viewModel.errorMessage {
                VStack(spacing: 16) {
                    Image(systemName: "exclamationmark.triangle")
                        .font(.largeTitle)
                        .foregroundColor(.coral400)
                    
                    Text(error)
                        .multilineTextAlignment(.center)
                        .foregroundColor(.white.opacity(0.6))
                    
                    Button("Retry") {
                        Task { await viewModel.loadQuiz() }
                    }
                    .buttonStyle(GlassButtonStyle())
                }
                .padding()
                .appBackground()
            }
        }
        .navigationBarHidden(true)
        .task {
            await viewModel.loadQuiz()
        }
    }
}

struct QuizQuestionsView: View {
    let quiz: Quiz
    @ObservedObject var viewModel: QuizViewModel
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                // Header with back button
                HStack {
                    Button(action: { dismiss() }) {
                        HStack(spacing: 8) {
                            Image(systemName: "chevron.left")
                                .font(.body.weight(.medium))
                            Text("Back to Lesson")
                        }
                        .foregroundColor(.white.opacity(0.5))
                    }
                    
                    Spacer()
                    
                    if viewModel.isReviewMode {
                        Text("Review Mode")
                            .font(.caption)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 6)
                            .glassBackground()
                            .foregroundColor(.white.opacity(0.6))
                    }
                    
                    Text("\(viewModel.answeredCount) of \(quiz.questions.count) answered")
                        .font(.caption)
                        .foregroundColor(.white.opacity(0.4))
                }
                
                // Quiz info card
                HStack(spacing: 16) {
                    HStack(spacing: 6) {
                        Image(systemName: "doc.text")
                            .font(.caption)
                        Text("\(quiz.questions.count) questions")
                    }
                    
                    Text("•")
                    
                    HStack(spacing: 6) {
                        Image(systemName: "checkmark.circle")
                            .font(.caption)
                        Text("\(quiz.passingScore)% to pass")
                    }
                    
                    if viewModel.isReviewMode {
                        Text("•")
                        Text("Review Mode")
                            .foregroundColor(.electric400)
                    }
                }
                .font(.caption)
                .foregroundColor(.white.opacity(0.6))
                .padding()
                .glassBackground()
                
                // Questions
                ForEach(Array(quiz.questions.enumerated()), id: \.element.id) { index, question in
                    QuestionView(
                        question: question,
                        questionIndex: index,
                        selectedAnswer: viewModel.answers[safe: index] ?? -1,
                        feedback: viewModel.assessment?.questionFeedback.first { $0.questionNum == index + 1 },
                        isReviewMode: viewModel.isReviewMode,
                        showAnswers: viewModel.isReviewMode,
                        onSelectAnswer: { optionIndex in
                            viewModel.selectAnswer(questionIndex: index, optionIndex: optionIndex)
                        }
                    )
                }
                
                // Submit section (sticky at bottom)
                VStack(spacing: 16) {
                    // AI Grading toggle (only if API key available and not review mode)
                    if !viewModel.isReviewMode {
                        VStack(alignment: .leading, spacing: 8) {
                            HStack {
                                VStack(alignment: .leading, spacing: 4) {
                                    HStack(spacing: 8) {
                                        Image(systemName: "lightbulb")
                                            .foregroundColor(viewModel.hasApiKey ? .electric400 : .white.opacity(0.4))
                                        Text("Grade with AI")
                                            .fontWeight(.semibold)
                                            .foregroundColor(viewModel.hasApiKey ? .white : .white.opacity(0.4))
                                    }
                                    
                                    Text(viewModel.hasApiKey 
                                         ? "Get detailed feedback and personalized analysis" 
                                         : "AI grading unavailable (no API key configured)")
                                        .font(.caption)
                                        .foregroundColor(.white.opacity(0.6))
                                }
                                
                                Spacer()
                                
                                Toggle("", isOn: $viewModel.useAiGrading)
                                    .labelsHidden()
                                    .tint(.electric400)
                                    .disabled(!viewModel.hasApiKey)
                            }
                        }
                        .padding()
                        .glassBackground(isStrong: true)
                    }
                    
                    // Submit button (not in review mode)
                    if !viewModel.isReviewMode {
                        Button(action: {
                            Task { await viewModel.submitQuiz() }
                        }) {
                            HStack(spacing: 12) {
                                if viewModel.isSubmitting {
                                    ProgressView()
                                        .progressViewStyle(CircularProgressViewStyle(tint: .midnight950))
                                        .scaleEffect(0.8)
                                    Text("Checking answers...")
                                } else if viewModel.allAnswered {
                                    Text("Submit Quiz")
                                } else {
                                    Text("Answer all questions (\(viewModel.answeredCount)/\(quiz.questions.count))")
                                }
                            }
                            .fontWeight(.bold)
                        }
                        .buttonStyle(ElectricButtonStyle(isEnabled: viewModel.allAnswered && !viewModel.isSubmitting))
                        .disabled(!viewModel.allAnswered || viewModel.isSubmitting)
                    }
                }
                
                if let error = viewModel.errorMessage {
                    Text(error)
                        .font(.caption)
                        .foregroundColor(.coral400)
                        .padding()
                        .frame(maxWidth: .infinity)
                        .glassBackground()
                }
            }
            .padding()
        }
    }
}

struct QuestionView: View {
    let question: QuizQuestion
    let questionIndex: Int
    let selectedAnswer: Int
    let feedback: QuestionFeedback?
    let isReviewMode: Bool
    let showAnswers: Bool
    let onSelectAnswer: (Int) -> Void
    
    private var isCorrect: Bool {
        showAnswers && selectedAnswer == question.correctIndex
    }
    
    private var isWrong: Bool {
        showAnswers && selectedAnswer != -1 && selectedAnswer != question.correctIndex
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            // Question header with number badge
            HStack(alignment: .top, spacing: 12) {
                NumberBadge(number: questionIndex + 1, size: 32)
                
                Text(question.question)
                    .font(.body)
                    .fontWeight(.medium)
                    .foregroundColor(.white)
            }
            
            // Options
            VStack(spacing: 8) {
                ForEach(Array(question.options.enumerated()), id: \.offset) { optionIndex, option in
                    OptionButton(
                        option: option,
                        optionIndex: optionIndex,
                        isSelected: selectedAnswer == optionIndex,
                        isCorrect: showAnswers && optionIndex == question.correctIndex,
                        isWrong: showAnswers && selectedAnswer == optionIndex && optionIndex != question.correctIndex,
                        isReviewMode: isReviewMode && showAnswers,
                        onSelect: { onSelectAnswer(optionIndex) }
                    )
                }
            }
            .padding(.leading, 44) // Align with question text
            
            // Show explanation when answers revealed
            if showAnswers {
                VStack(alignment: .leading, spacing: 8) {
                    Text(question.explanation)
                        .font(.subheadline)
                        .foregroundColor(.white.opacity(0.7))
                }
                .padding()
                .background(
                    RoundedRectangle(cornerRadius: 12)
                        .fill(Color.white.opacity(0.05))
                )
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(Color.electric500, lineWidth: 2)
                        .padding(.leading, -4),
                    alignment: .leading
                )
                .padding(.leading, 44)
            }
        }
        .padding()
        .glassBackground(isStrong: true)
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(
                    showAnswers && isCorrect ? Color.electric500.opacity(0.3) :
                    showAnswers && isWrong ? Color.coral500.opacity(0.3) :
                    Color.clear,
                    lineWidth: 1
                )
        )
    }
}

struct OptionButton: View {
    let option: String
    let optionIndex: Int
    let isSelected: Bool
    let isCorrect: Bool
    let isWrong: Bool
    let isReviewMode: Bool
    let onSelect: () -> Void
    
    var body: some View {
        Button(action: onSelect) {
            HStack(spacing: 12) {
                // Radio circle indicator
                ZStack {
                    Circle()
                        .stroke(circleColor, lineWidth: 2)
                        .frame(width: 24, height: 24)
                    
                    if isSelected || isCorrect {
                        Circle()
                            .fill(circleColor)
                            .frame(width: 16, height: 16)
                        
                        if isCorrect && !isWrong {
                            Image(systemName: "checkmark")
                                .font(.system(size: 10, weight: .bold))
                                .foregroundColor(.midnight950)
                        } else if isWrong {
                            Image(systemName: "xmark")
                                .font(.system(size: 10, weight: .bold))
                                .foregroundColor(.white)
                        }
                    }
                }
                
                Text(option)
                    .font(.subheadline)
                    .foregroundColor(textColor)
                    .multilineTextAlignment(.leading)
                
                Spacer()
            }
            .padding()
            .background(backgroundColor)
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(borderColor, lineWidth: isSelected || isCorrect || isWrong ? 2 : 0)
            )
            .cornerRadius(12)
        }
        .buttonStyle(.plain)
        .disabled(isReviewMode)
    }
    
    private var circleColor: Color {
        if isCorrect {
            return .electric500
        } else if isWrong {
            return .coral500
        } else if isSelected {
            return .electric500
        }
        return .white.opacity(0.3)
    }
    
    private var backgroundColor: Color {
        if isCorrect {
            return .electric500.opacity(0.2)
        } else if isWrong {
            return .coral500.opacity(0.2)
        } else if isSelected {
            return .electric500.opacity(0.2)
        }
        return .white.opacity(0.03)
    }
    
    private var borderColor: Color {
        if isCorrect {
            return .electric500
        } else if isWrong {
            return .coral500
        } else if isSelected {
            return .electric500
        }
        return .clear
    }
    
    private var textColor: Color {
        if isCorrect {
            return .electric400
        } else if isWrong {
            return .coral400
        } else if isSelected {
            return .white
        }
        return .white.opacity(0.7)
    }
}

#Preview {
    NavigationStack {
        QuizView(curriculumId: "064c2aa6", topicKey: "0-0")
    }
}
