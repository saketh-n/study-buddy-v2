import SwiftUI

struct LearnView: View {
    let curriculumId: String
    let topicKey: String
    
    @StateObject private var viewModel: LessonViewModel
    @State private var showSidebar = false
    @Environment(\.dismiss) private var dismiss
    
    init(curriculumId: String, topicKey: String) {
        self.curriculumId = curriculumId
        self.topicKey = topicKey
        _viewModel = StateObject(wrappedValue: LessonViewModel(curriculumId: curriculumId, topicKey: topicKey))
    }
    
    var body: some View {
        content
        .navigationBarHidden(true)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button(action: { showSidebar = true }) {
                    Image(systemName: "list.bullet")
                        .foregroundColor(.white)
                }
            }
        }
        .sheet(isPresented: $showSidebar) {
            TopicSidebarView(
                flatTopics: viewModel.flatTopics,
                currentTopicKey: topicKey,
                progress: viewModel.progress,
                curriculumId: curriculumId,
                onSelect: { _ in showSidebar = false }
            )
        }
        .task {
            await viewModel.loadContent()
        }
    }

    @ViewBuilder
    private var content: some View {
        if viewModel.isLoading {
                LoadingView(message: "Loading your lesson...")
                    .appBackground()
            } else if let lesson = viewModel.lesson {
                ScrollView {
                    VStack(alignment: .leading, spacing: 24) {
                        // Header with back button
                        Button(action: { dismiss() }) {
                            HStack(spacing: 8) {
                                Image(systemName: "chevron.left")
                                    .font(.body.weight(.medium))
                                Text("Exit Learning")
                            }
                            .foregroundColor(.white.opacity(0.5))
                        }
                        
                        // Topic header
                        if let topic = viewModel.currentFlatTopic {
                            VStack(alignment: .leading, spacing: 8) {
                                HStack(spacing: 8) {
                                    Text(topic.clusterName)
                                        .foregroundColor(.white.opacity(0.4))
                                    
                                    Text("•")
                                        .foregroundColor(.white.opacity(0.4))
                                    
                                    Text("Topic \(topic.globalIndex + 1) of \(viewModel.flatTopics.count)")
                                        .foregroundColor(.white.opacity(0.4))
                                    
                                    if viewModel.isCompleted {
                                        Text("•")
                                            .foregroundColor(.white.opacity(0.4))
                                        
                                        HStack(spacing: 4) {
                                            Image(systemName: "checkmark")
                                                .font(.caption2)
                                            Text("Completed")
                                        }
                                        .foregroundColor(.electric400)
                                    }
                                }
                                .font(.caption)
                                
                                Text(topic.topic.name)
                                    .font(.system(size: 28, weight: .bold, design: .rounded))
                                    .foregroundColor(.white)
                            }
                        }
                        
                        // Tab buttons
                        HStack(spacing: 8) {
                            TabButton(
                                title: "Lesson",
                                isSelected: viewModel.selectedTab == 0,
                                action: { viewModel.selectedTab = 0 }
                            )
                            
                            TabButton(
                                title: "Quiz History",
                                icon: "doc.text",
                                isSelected: viewModel.selectedTab == 1,
                                action: { viewModel.selectedTab = 1 }
                            )
                        }
                        
                        if viewModel.selectedTab == 0 {
                            LessonContentView(
                                lesson: lesson,
                                curriculumId: curriculumId,
                                topicKey: topicKey,
                                isCompleted: viewModel.isCompleted
                            )
                        } else {
                            QuizHistoryView(
                                quizHistory: viewModel.quizHistory,
                                curriculumId: curriculumId,
                                topicKey: topicKey
                            )
                        }
                    }
                    .padding()
                }
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
                        Task { await viewModel.loadContent() }
                    }
                    .buttonStyle(GlassButtonStyle())
                }
                .padding()
                .appBackground()
            } else {
                EmptyView().appBackground()
            }
    }
}

// MARK: - Tab Button

struct TabButton: View {
    let title: String
    var icon: String? = nil
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            HStack(spacing: 6) {
                if let icon = icon {
                    Image(systemName: icon)
                        .font(.caption)
                }
                Text(title)
                    .font(.subheadline)
                    .fontWeight(.medium)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 10)
            .background(
                isSelected
                    ? AnyShapeStyle(AppGradients.electricButton)
                    : AnyShapeStyle(Color.white.opacity(0.03))
            )
            .foregroundColor(isSelected ? .midnight950 : .white.opacity(0.6))
            .cornerRadius(8)
            .overlay(
                RoundedRectangle(cornerRadius: 8)
                    .stroke(Color.white.opacity(isSelected ? 0 : 0.08), lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
    }
}

#Preview {
    NavigationStack {
        LearnView(curriculumId: "064c2aa6", topicKey: "0-0")
    }
}
