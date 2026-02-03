import SwiftUI

struct LessonContentView: View {
    let lesson: Lesson
    let curriculumId: String
    let topicKey: String
    let isCompleted: Bool
    
    var clusterIndex: Int {
        TopicKey.parse(topicKey)?.clusterIndex ?? 0
    }
    
    var topicIndex: Int {
        TopicKey.parse(topicKey)?.topicIndex ?? 0
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 24) {
            // Time estimate
            HStack(spacing: 8) {
                Image(systemName: "clock")
                    .font(.caption)
                Text("~\(lesson.estimatedTimeMinutes) min read")
            }
            .font(.caption)
            .foregroundColor(.white.opacity(0.4))
            
            // Introduction
            Text(lesson.introduction)
                .font(.body)
                .foregroundColor(.white.opacity(0.8))
                .lineSpacing(6)
                .padding()
                .glassBackground(isStrong: true)
            
            // Sections
            ForEach(Array(lesson.sections.enumerated()), id: \.element.id) { index, section in
                LessonSectionView(section: section, number: index + 1)
            }
            
            // Summary
            VStack(alignment: .leading, spacing: 12) {
                HStack(spacing: 8) {
                    Image(systemName: "checkmark.circle")
                        .foregroundColor(.electric400)
                    Text("Summary")
                        .font(.headline)
                        .fontWeight(.bold)
                        .foregroundColor(.white)
                }
                
                Text(lesson.summary)
                    .font(.body)
                    .foregroundColor(.white.opacity(0.7))
                    .lineSpacing(4)
            }
            .padding()
            .glassBackground(isStrong: true)
            .overlay(
                Rectangle()
                    .fill(Color.electric500)
                    .frame(width: 4),
                alignment: .leading
            )
            .clipShape(RoundedRectangle(cornerRadius: 16))
            
            // Take Quiz CTA
            VStack(spacing: 16) {
                Text(isCompleted ? "Review Your Knowledge" : "Ready to Test Your Knowledge?")
                    .font(.title3)
                    .fontWeight(.bold)
                    .foregroundColor(.white)
                
                Text(isCompleted 
                     ? "You've already mastered this topic. Take another quiz to reinforce your learning!"
                     : "Take a short quiz to demonstrate mastery and unlock the next topic.")
                    .font(.subheadline)
                    .foregroundColor(.white.opacity(0.5))
                    .multilineTextAlignment(.center)
                
                HStack(spacing: 16) {
                    NavigationLink(destination: QuizView(curriculumId: curriculumId, topicKey: topicKey)) {
                        HStack(spacing: 8) {
                            Image(systemName: "questionmark.circle")
                            Text("Take Quiz")
                        }
                        .fontWeight(.bold)
                    }
                    .buttonStyle(ElectricButtonStyle())
                    
                    if isCompleted {
                        Button(action: {}) {
                            Text("View Past Quizzes")
                                .fontWeight(.semibold)
                        }
                        .buttonStyle(GlassButtonStyle())
                    }
                }
            }
            .frame(maxWidth: .infinity)
            .padding(24)
            .glassBackground(isStrong: true)
            .padding(.top, 16)
        }
    }
}

struct LessonSectionView: View {
    let section: LessonSection
    let number: Int
    
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            // Section header
            HStack(alignment: .center, spacing: 12) {
                NumberBadge(number: number, size: 32)
                
                Text(section.title)
                    .font(.title3)
                    .fontWeight(.bold)
                    .foregroundColor(.white)
            }
            
            // Content
            Text(section.content)
                .font(.body)
                .foregroundColor(.white.opacity(0.7))
                .lineSpacing(6)
            
            // Key points
            if !section.keyPoints.isEmpty {
                VStack(alignment: .leading, spacing: 12) {
                    Text("KEY POINTS")
                        .font(.caption)
                        .fontWeight(.semibold)
                        .foregroundColor(.electric400)
                        .tracking(1)
                    
                    ForEach(section.keyPoints, id: \.self) { point in
                        HStack(alignment: .top, spacing: 8) {
                            Image(systemName: "checkmark")
                                .font(.caption)
                                .foregroundColor(.electric400)
                                .frame(width: 16, height: 16)
                            
                            Text(point)
                                .font(.subheadline)
                                .foregroundColor(.white.opacity(0.7))
                        }
                    }
                }
                .padding()
                .background(Color.electric500.opacity(0.1))
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(Color.electric500.opacity(0.2), lineWidth: 1)
                )
                .cornerRadius(12)
            }
        }
        .padding(.leading, 44) // Align with section title
    }
}

#Preview {
    ScrollView {
        LessonContentView(
            lesson: Lesson(
                topicName: "Introduction to Swift",
                introduction: "Swift is a powerful programming language designed by Apple for iOS, macOS, and more. It combines safety with performance and modern features.",
                sections: [
                    LessonSection(
                        title: "Getting Started",
                        content: "Swift is easy to learn and has a clean syntax that makes code readable. It was introduced in 2014 and has quickly become the preferred language for Apple platform development.",
                        keyPoints: ["Clean syntax", "Type safety", "Fast performance"]
                    ),
                    LessonSection(
                        title: "Variables and Constants",
                        content: "Use var for variables and let for constants. Swift's type inference makes code cleaner while maintaining type safety.",
                        keyPoints: ["var for mutable values", "let for immutable values"]
                    )
                ],
                summary: "Swift is a modern language that combines safety with performance, making it ideal for building apps across Apple's ecosystem.",
                estimatedTimeMinutes: 15
            ),
            curriculumId: "test",
            topicKey: "0-0",
            isCompleted: false
        )
        .padding()
    }
    .appBackground()
}
