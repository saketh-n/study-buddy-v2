import SwiftUI

struct TopicSidebarView: View {
    let flatTopics: [FlatTopic]
    let currentTopicKey: String
    let progress: LearningProgress?
    let curriculumId: String
    let onSelect: (String) -> Void
    
    @Environment(\.dismiss) private var dismiss
    
    private var groupedTopics: [(String, [FlatTopic])] {
        Dictionary(grouping: flatTopics, by: { $0.clusterName })
            .sorted { lhs, rhs in
                let lhsOrder = flatTopics.first { $0.clusterName == lhs.key }?.clusterIndex ?? 0
                let rhsOrder = flatTopics.first { $0.clusterName == rhs.key }?.clusterIndex ?? 0
                return lhsOrder < rhsOrder
            }
    }
    
    private var completedCount: Int {
        progress?.completedCount ?? 0
    }
    
    var body: some View {
        NavigationStack {
            List {
                // Progress section
                Section {
                    LearningProgressBar(completed: completedCount, total: flatTopics.count)
                        .padding(.vertical, 8)
                }
                
                // Topics by cluster
                ForEach(groupedTopics, id: \.0) { clusterName, topics in
                    Section(header: Text(clusterName)) {
                        ForEach(topics) { flatTopic in
                            SidebarTopicRow(
                                flatTopic: flatTopic,
                                isCurrentTopic: flatTopic.topicKey == currentTopicKey,
                                isCompleted: progress?.isTopicCompleted(
                                    clusterIndex: flatTopic.clusterIndex,
                                    topicIndex: flatTopic.topicIndex
                                ) ?? false,
                                curriculumId: curriculumId,
                                onSelect: {
                                    onSelect(flatTopic.topicKey)
                                    dismiss()
                                }
                            )
                        }
                    }
                }
            }
            .listStyle(.insetGrouped)
            .navigationTitle("Topics")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
        }
    }
}

struct SidebarTopicRow: View {
    let flatTopic: FlatTopic
    let isCurrentTopic: Bool
    let isCompleted: Bool
    let curriculumId: String
    let onSelect: () -> Void
    
    var body: some View {
        NavigationLink(destination: LearnView(curriculumId: curriculumId, topicKey: flatTopic.topicKey)) {
            HStack(spacing: 12) {
                // Status indicator
                Image(systemName: isCompleted ? "checkmark.circle.fill" : "circle")
                    .foregroundColor(isCompleted ? .green : .gray)
                    .font(.subheadline)
                
                VStack(alignment: .leading, spacing: 2) {
                    Text(flatTopic.topic.name)
                        .font(.subheadline)
                        .fontWeight(isCurrentTopic ? .semibold : .regular)
                        .foregroundColor(isCurrentTopic ? .blue : .primary)
                        .lineLimit(2)
                }
                
                Spacer()
                
                if isCurrentTopic {
                    Image(systemName: "arrow.right.circle.fill")
                        .foregroundColor(.blue)
                        .font(.caption)
                }
            }
        }
        .simultaneousGesture(TapGesture().onEnded { _ in
            onSelect()
        })
    }
}

#Preview {
    TopicSidebarView(
        flatTopics: [
            FlatTopic(
                topic: Topic(name: "Introduction", description: "Getting started", order: 0, prerequisites: []),
                clusterIndex: 0,
                topicIndex: 0,
                clusterName: "Basics",
                globalIndex: 0,
                topicKey: "0-0"
            ),
            FlatTopic(
                topic: Topic(name: "Variables", description: "Learn about variables", order: 1, prerequisites: []),
                clusterIndex: 0,
                topicIndex: 1,
                clusterName: "Basics",
                globalIndex: 1,
                topicKey: "0-1"
            ),
            FlatTopic(
                topic: Topic(name: "Functions", description: "Creating functions", order: 0, prerequisites: []),
                clusterIndex: 1,
                topicIndex: 0,
                clusterName: "Advanced",
                globalIndex: 2,
                topicKey: "1-0"
            )
        ],
        currentTopicKey: "0-1",
        progress: nil,
        curriculumId: "test",
        onSelect: { _ in }
    )
}
