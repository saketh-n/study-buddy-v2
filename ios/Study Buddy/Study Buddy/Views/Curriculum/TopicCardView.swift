import SwiftUI

struct TopicCardView: View {
    let topic: Topic
    let clusterIndex: Int
    let topicIndex: Int
    let curriculumId: String
    let isCompleted: Bool
    let hasLesson: Bool
    var hasQuiz: Bool = true
    var isLessonGenerating: Bool = false
    var isQuizGenerating: Bool = false
    
    var topicKey: String {
        TopicKey.make(clusterIndex: clusterIndex, topicIndex: topicIndex)
    }
    
    private var isPending: Bool {
        !hasLesson && !isLessonGenerating
    }
    
    var body: some View {
        NavigationLink(destination: LearnView(curriculumId: curriculumId, topicKey: topicKey)) {
            HStack(spacing: 12) {
                // Numbered badge instead of book icon
                ZStack {
                    RoundedRectangle(cornerRadius: 8)
                        .fill(badgeBackgroundColor)
                        .frame(width: 32, height: 32)
                    
                    if isCompleted {
                        Image(systemName: "checkmark")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundColor(.midnight950)
                    } else {
                        Text("\(topic.order)")
                            .font(.system(size: 14, weight: .bold, design: .monospaced))
                            .foregroundColor(isPending ? .white.opacity(0.3) : .electric400)
                    }
                }
                
                VStack(alignment: .leading, spacing: 4) {
                    // Topic name
                    Text(topic.name)
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .foregroundColor(titleColor)
                        .lineLimit(2)
                        .multilineTextAlignment(.leading)
                    
                    // Description
                    Text(topic.description)
                        .font(.caption)
                        .foregroundColor(isPending ? .white.opacity(0.3) : .white.opacity(0.5))
                        .lineLimit(2)
                        .multilineTextAlignment(.leading)
                    
                    // Content status indicators (not shown for completed topics)
                    if !isCompleted {
                        HStack(spacing: 12) {
                            // Lesson status
                            ContentStatusIndicator(
                                isReady: hasLesson,
                                isGenerating: isLessonGenerating,
                                readyLabel: "Lesson ready",
                                generatingLabel: "Generating lesson...",
                                pendingLabel: "Pending"
                            )
                            
                            // Quiz status
                            ContentStatusIndicator(
                                isReady: hasQuiz,
                                isGenerating: isQuizGenerating,
                                readyLabel: "Quiz ready",
                                generatingLabel: "Generating quiz...",
                                pendingLabel: "Pending"
                            )
                        }
                        .padding(.top, 4)
                    }
                }
                
                Spacer()
                
                // Arrow or lock indicator
                if hasLesson && !isCompleted {
                    Image(systemName: "chevron.right")
                        .font(.caption)
                        .foregroundColor(.white.opacity(0.3))
                } else if isPending {
                    Image(systemName: "lock.fill")
                        .font(.caption)
                        .foregroundColor(.white.opacity(0.2))
                }
            }
            .padding(12)
            .glassBackground()
        }
        .buttonStyle(.plain)
        .disabled(!hasLesson)
        .opacity(isPending ? 0.5 : 1.0)
    }
    
    private var badgeBackgroundColor: Color {
        if isCompleted {
            return .electric500
        } else if isPending {
            return .white.opacity(0.1)
        } else {
            return .electric500.opacity(0.2)
        }
    }
    
    private var titleColor: Color {
        if isCompleted {
            return .electric400
        } else if isPending {
            return .white.opacity(0.4)
        } else {
            return .white.opacity(0.9)
        }
    }
}

// MARK: - Content Status Indicator

struct ContentStatusIndicator: View {
    let isReady: Bool
    let isGenerating: Bool
    let readyLabel: String
    let generatingLabel: String
    let pendingLabel: String
    
    var body: some View {
        HStack(spacing: 4) {
            if isGenerating {
                ProgressView()
                    .scaleEffect(0.5)
                    .frame(width: 12, height: 12)
                Text(generatingLabel)
                    .foregroundColor(.electric400)
            } else if isReady {
                Image(systemName: "book")
                    .font(.caption2)
                    .foregroundColor(.electric400.opacity(0.7))
                Text(readyLabel)
                    .foregroundColor(.electric400.opacity(0.7))
            } else {
                Image(systemName: "clock")
                    .font(.caption2)
                    .foregroundColor(.white.opacity(0.3))
                Text(pendingLabel)
                    .foregroundColor(.white.opacity(0.3))
            }
        }
        .font(.caption2)
    }
}

#Preview {
    VStack(spacing: 12) {
        TopicCardView(
            topic: Topic(name: "Introduction to Swift", description: "Learn the basics of Swift programming", order: 1, prerequisites: []),
            clusterIndex: 0,
            topicIndex: 0,
            curriculumId: "test",
            isCompleted: false,
            hasLesson: true,
            hasQuiz: true
        )
        
        TopicCardView(
            topic: Topic(name: "Completed Topic", description: "This topic has been completed", order: 2, prerequisites: []),
            clusterIndex: 0,
            topicIndex: 1,
            curriculumId: "test",
            isCompleted: true,
            hasLesson: true,
            hasQuiz: true
        )
        
        TopicCardView(
            topic: Topic(name: "Generating Topic", description: "Content is being generated", order: 3, prerequisites: []),
            clusterIndex: 0,
            topicIndex: 2,
            curriculumId: "test",
            isCompleted: false,
            hasLesson: false,
            hasQuiz: false,
            isLessonGenerating: true,
            isQuizGenerating: true
        )
        
        TopicCardView(
            topic: Topic(name: "Pending Topic", description: "Content not yet available", order: 4, prerequisites: []),
            clusterIndex: 0,
            topicIndex: 3,
            curriculumId: "test",
            isCompleted: false,
            hasLesson: false,
            hasQuiz: false
        )
    }
    .padding()
    .appBackground()
}
