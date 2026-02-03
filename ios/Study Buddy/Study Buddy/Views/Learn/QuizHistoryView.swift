import SwiftUI

struct QuizHistoryView: View {
    let quizHistory: QuizHistoryResponse?
    let curriculumId: String
    let topicKey: String
    
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            if let history = quizHistory, !history.history.isEmpty {
                ForEach(history.history) { item in
                    QuizHistoryItemView(
                        item: item,
                        curriculumId: curriculumId,
                        topicKey: topicKey
                    )
                }
                
                // Take New Quiz button
                NavigationLink(destination: QuizView(curriculumId: curriculumId, topicKey: topicKey, forceNew: true)) {
                    HStack {
                        Image(systemName: "plus.circle.fill")
                        Text("Take New Quiz")
                    }
                    .fontWeight(.bold)
                }
                .buttonStyle(ElectricButtonStyle())
            } else {
                VStack(spacing: 16) {
                    Image(systemName: "doc.text.magnifyingglass")
                        .font(.system(size: 40))
                        .foregroundColor(.white.opacity(0.3))
                    
                    Text("No quiz history yet")
                        .font(.headline)
                        .foregroundColor(.white)
                    
                    Text("Take a quiz to see your history here")
                        .font(.subheadline)
                        .foregroundColor(.white.opacity(0.5))
                    
                    NavigationLink(destination: QuizView(curriculumId: curriculumId, topicKey: topicKey)) {
                        HStack {
                            Image(systemName: "questionmark.circle.fill")
                            Text("Take Quiz")
                        }
                        .fontWeight(.bold)
                    }
                    .buttonStyle(ElectricButtonStyle())
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 48)
            }
        }
    }
}

struct QuizHistoryItemView: View {
    let item: QuizHistoryItem
    let curriculumId: String
    let topicKey: String
    @State private var isExpanded = false
    
    var latestAssessment: QuizAssessment? {
        item.assessments.last
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Button(action: { isExpanded.toggle() }) {
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Quiz Version \(item.version + 1)")
                            .font(.headline)
                            .foregroundColor(.white)
                        
                        Text("\(item.assessments.count) attempt\(item.assessments.count == 1 ? "" : "s")")
                            .font(.caption)
                            .foregroundColor(.white.opacity(0.5))
                    }
                    
                    Spacer()
                    
                    if let assessment = latestAssessment {
                        VStack(alignment: .trailing, spacing: 4) {
                            Text(assessment.formattedScore)
                                .font(.headline)
                                .foregroundColor(assessment.passed ? .electric400 : .coral400)
                            
                            if assessment.passed {
                                HStack(spacing: 4) {
                                    Image(systemName: "checkmark.circle.fill")
                                    Text("Passed")
                                }
                                .font(.caption)
                                .foregroundColor(.electric400)
                            }
                        }
                    }
                    
                    Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                        .font(.caption)
                        .foregroundColor(.white.opacity(0.3))
                }
            }
            .buttonStyle(.plain)
            
            if isExpanded {
                VStack(alignment: .leading, spacing: 8) {
                    ForEach(item.assessments) { assessment in
                        HStack {
                            Text(assessment.scoreFraction)
                                .font(.subheadline)
                                .foregroundColor(.white.opacity(0.7))
                            
                            Spacer()
                            
                            Text(assessment.formattedScore)
                                .font(.subheadline)
                                .fontWeight(.medium)
                                .foregroundColor(assessment.passed ? .electric400 : .coral400)
                            
                            if assessment.usedAiGrading {
                                Image(systemName: "sparkles")
                                    .font(.caption)
                                    .foregroundColor(.electric400)
                            }
                        }
                        .padding(12)
                        .glassBackground()
                    }
                    
                    // Review button
                    NavigationLink(destination: QuizView(
                        curriculumId: curriculumId,
                        topicKey: topicKey,
                        reviewVersion: item.version
                    )) {
                        HStack {
                            Image(systemName: "eye")
                            Text("Review Quiz")
                        }
                        .font(.subheadline)
                        .foregroundColor(.electric400)
                    }
                    .padding(.top, 4)
                }
            }
        }
        .padding()
        .glassBackground(isStrong: true)
    }
}

#Preview {
    QuizHistoryView(
        quizHistory: QuizHistoryResponse(
            totalQuizzes: 2,
            history: [
                QuizHistoryItem(
                    version: 0,
                    quiz: Quiz(topicName: "Test", questions: [], passingScore: 80, version: 0),
                    assessments: [
                        QuizAssessment(
                            score: 60,
                            passed: false,
                            correctCount: 3,
                            totalQuestions: 5,
                            quizVersion: 0,
                            questionFeedback: [],
                            summary: AssessmentSummary(misconceptions: [], focusAreas: [], encouragement: "", recommendation: ""),
                            fallbackMode: false
                        ),
                        QuizAssessment(
                            score: 80,
                            passed: true,
                            correctCount: 4,
                            totalQuestions: 5,
                            quizVersion: 0,
                            questionFeedback: [],
                            summary: AssessmentSummary(misconceptions: [], focusAreas: [], encouragement: "", recommendation: ""),
                            fallbackMode: false
                        )
                    ]
                )
            ]
        ),
        curriculumId: "test",
        topicKey: "0-0"
    )
    .padding()
    .appBackground()
}
