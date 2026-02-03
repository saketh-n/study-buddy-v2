import SwiftUI

struct QuizResultsView: View {
    @ObservedObject var viewModel: QuizViewModel
    let curriculumId: String
    let topicKey: String
    
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                if let assessment = viewModel.assessment {
                    // Score header
                    ScoreHeaderView(assessment: assessment)
                    
                    // AI Assessment summary
                    if !assessment.summary.encouragement.isEmpty {
                        AssessmentSummaryView(summary: assessment.summary)
                    }
                    
                    // Question feedback
                    VStack(alignment: .leading, spacing: 16) {
                        Text("Question Review")
                            .font(.headline)
                            .foregroundColor(.white)
                        
                        ForEach(assessment.questionFeedback) { feedback in
                            QuestionFeedbackView(
                                feedback: feedback,
                                question: viewModel.quiz?.questions[safe: feedback.questionNum - 1]
                            )
                        }
                    }
                    
                    // Actions
                    ActionsView(
                        viewModel: viewModel,
                        curriculumId: curriculumId,
                        topicKey: topicKey
                    )
                }
            }
            .padding()
        }
        .appBackground()
    }
}

struct ScoreHeaderView: View {
    let assessment: QuizAssessment
    
    var body: some View {
        VStack(spacing: 16) {
            // Score circle
            ZStack {
                Circle()
                    .stroke(Color.white.opacity(0.1), lineWidth: 12)
                    .frame(width: 120, height: 120)
                
                Circle()
                    .trim(from: 0, to: CGFloat(assessment.score) / 100)
                    .stroke(
                        assessment.passed ? Color.electric400 : Color.coral400,
                        style: StrokeStyle(lineWidth: 12, lineCap: .round)
                    )
                    .frame(width: 120, height: 120)
                    .rotationEffect(.degrees(-90))
                    .animation(.easeInOut(duration: 1), value: assessment.score)
                
                VStack(spacing: 4) {
                    Text("\(assessment.score)%")
                        .font(.title)
                        .fontWeight(.bold)
                        .foregroundColor(.white)
                    
                    Text(assessment.scoreFraction)
                        .font(.caption)
                        .foregroundColor(.white.opacity(0.5))
                }
            }
            
            // Pass/Fail badge
            HStack {
                Image(systemName: assessment.passed ? "checkmark.circle.fill" : "xmark.circle.fill")
                Text(assessment.passed ? "Passed!" : "Not Passed")
            }
            .font(.headline)
            .foregroundColor(assessment.passed ? .electric400 : .coral400)
            .padding(.horizontal, 16)
            .padding(.vertical, 8)
            .background(assessment.passed ? Color.electric500.opacity(0.1) : Color.coral500.opacity(0.1))
            .cornerRadius(20)
            
            // AI grading indicator
            if !assessment.usedAiGrading {
                HStack {
                    Image(systemName: "info.circle")
                    Text("Basic grading (AI unavailable)")
                }
                .font(.caption)
                .foregroundColor(.white.opacity(0.5))
            } else {
                HStack {
                    Image(systemName: "sparkles")
                    Text("AI-powered assessment")
                }
                .font(.caption)
                .foregroundColor(.electric400)
            }
        }
        .padding()
        .frame(maxWidth: .infinity)
        .glassBackground(isStrong: true)
    }
}

struct AssessmentSummaryView: View {
    let summary: AssessmentSummary
    
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Assessment")
                .font(.headline)
                .foregroundColor(.white)
            
            // Encouragement
            if !summary.encouragement.isEmpty {
                Text(summary.encouragement)
                    .font(.body)
                    .foregroundColor(.white.opacity(0.8))
            }
            
            // Misconceptions
            if !summary.misconceptions.isEmpty {
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Image(systemName: "exclamationmark.triangle")
                            .foregroundColor(.coral400)
                        Text("Areas to Review")
                            .font(.subheadline)
                            .fontWeight(.semibold)
                            .foregroundColor(.white)
                    }
                    
                    ForEach(summary.misconceptions, id: \.self) { item in
                        HStack(alignment: .top, spacing: 8) {
                            Image(systemName: "circle.fill")
                                .font(.system(size: 6))
                                .foregroundColor(.coral400)
                                .padding(.top, 6)
                            Text(item)
                                .font(.subheadline)
                                .foregroundColor(.white.opacity(0.7))
                        }
                    }
                }
                .padding()
                .background(Color.coral500.opacity(0.1))
                .cornerRadius(12)
            }
            
            // Focus areas
            if !summary.focusAreas.isEmpty {
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Image(systemName: "target")
                            .foregroundColor(.electric400)
                        Text("Focus Areas")
                            .font(.subheadline)
                            .fontWeight(.semibold)
                            .foregroundColor(.white)
                    }
                    
                    ForEach(summary.focusAreas, id: \.self) { item in
                        HStack(alignment: .top, spacing: 8) {
                            Image(systemName: "arrow.right.circle")
                                .font(.caption)
                                .foregroundColor(.electric400)
                            Text(item)
                                .font(.subheadline)
                                .foregroundColor(.white.opacity(0.7))
                        }
                    }
                }
                .padding()
                .background(Color.electric500.opacity(0.1))
                .cornerRadius(12)
            }
            
            // Recommendation
            if !summary.recommendation.isEmpty {
                HStack(alignment: .top, spacing: 8) {
                    Image(systemName: "lightbulb")
                        .foregroundColor(.yellow)
                    Text(summary.recommendation)
                        .font(.subheadline)
                        .foregroundColor(.white.opacity(0.7))
                }
                .padding()
                .background(Color.yellow.opacity(0.1))
                .cornerRadius(12)
            }
        }
        .padding()
        .glassBackground(isStrong: true)
    }
}

struct QuestionFeedbackView: View {
    let feedback: QuestionFeedback
    let question: QuizQuestion?
    
    @State private var isExpanded = false
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Button(action: { isExpanded.toggle() }) {
                HStack {
                    Image(systemName: feedback.isCorrect ? "checkmark.circle.fill" : "xmark.circle.fill")
                        .foregroundColor(feedback.isCorrect ? .electric400 : .coral400)
                    
                    Text("Question \(feedback.questionNum)")
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundColor(.white)
                    
                    Spacer()
                    
                    Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                        .font(.caption)
                        .foregroundColor(.white.opacity(0.3))
                }
            }
            .buttonStyle(.plain)
            
            if isExpanded {
                VStack(alignment: .leading, spacing: 8) {
                    if let question = question {
                        Text(question.question)
                            .font(.subheadline)
                            .foregroundColor(.white.opacity(0.6))
                    }
                    
                    HStack {
                        Text("Your answer:")
                            .font(.caption)
                            .foregroundColor(.white.opacity(0.4))
                        Text(feedback.studentChoice)
                            .font(.caption)
                            .foregroundColor(feedback.isCorrect ? .electric400 : .coral400)
                    }
                    
                    if !feedback.isCorrect {
                        HStack {
                            Text("Correct answer:")
                                .font(.caption)
                                .foregroundColor(.white.opacity(0.4))
                            Text(feedback.correctAnswer)
                                .font(.caption)
                                .foregroundColor(.electric400)
                        }
                    }
                    
                    Text(feedback.explanation)
                        .font(.caption)
                        .foregroundColor(.white.opacity(0.6))
                        .padding(.top, 4)
                }
                .padding(.leading, 24)
            }
        }
        .padding()
        .background(feedback.isCorrect ? Color.electric500.opacity(0.05) : Color.coral500.opacity(0.05))
        .overlay(
            RoundedRectangle(cornerRadius: 10)
                .stroke(feedback.isCorrect ? Color.electric500.opacity(0.2) : Color.coral500.opacity(0.2), lineWidth: 1)
        )
        .cornerRadius(10)
    }
}

struct ActionsView: View {
    @ObservedObject var viewModel: QuizViewModel
    let curriculumId: String
    let topicKey: String
    
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        VStack(spacing: 12) {
            if let assessment = viewModel.assessment {
                if assessment.passed {
                    // Passed - show next topic or completion
                    if viewModel.isLastTopic {
                        VStack(spacing: 8) {
                            Image(systemName: "trophy.fill")
                                .font(.system(size: 48))
                                .foregroundColor(.yellow)
                            
                            Text("Congratulations!")
                                .font(.title2)
                                .fontWeight(.bold)
                                .foregroundColor(.white)
                            
                            Text("You've completed all topics in this curriculum!")
                                .font(.subheadline)
                                .foregroundColor(.white.opacity(0.6))
                                .multilineTextAlignment(.center)
                        }
                        .padding()
                        
                        Button(action: { dismiss() }) {
                            HStack {
                                Image(systemName: "house")
                                Text("Back to Curriculum")
                            }
                        }
                        .buttonStyle(ElectricButtonStyle())
                    } else if let nextKey = viewModel.nextTopicKey {
                        NavigationLink(destination: LearnView(curriculumId: curriculumId, topicKey: nextKey)) {
                            HStack {
                                Image(systemName: "arrow.right.circle.fill")
                                Text("Next Topic")
                            }
                            .fontWeight(.bold)
                            .foregroundColor(.midnight950)
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(AppGradients.electricButton)
                            .cornerRadius(12)
                            .glow()
                        }
                    }
                } else {
                    // Failed - show retry and review options
                    Button(action: {
                        Task { await viewModel.retryQuiz() }
                    }) {
                        HStack {
                            Image(systemName: "arrow.clockwise")
                            Text("Try Again")
                        }
                        .fontWeight(.bold)
                        .foregroundColor(.midnight950)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.coral400)
                        .cornerRadius(12)
                    }
                    
                    NavigationLink(destination: LearnView(curriculumId: curriculumId, topicKey: topicKey)) {
                        HStack {
                            Image(systemName: "book")
                            Text("Review Lesson")
                        }
                    }
                    .buttonStyle(GlassButtonStyle())
                }
            }
        }
        .padding(.top)
    }
}

#Preview {
    NavigationStack {
        QuizResultsView(
            viewModel: {
                let vm = QuizViewModel(curriculumId: "test", topicKey: "0-0")
                return vm
            }(),
            curriculumId: "test",
            topicKey: "0-0"
        )
    }
}
