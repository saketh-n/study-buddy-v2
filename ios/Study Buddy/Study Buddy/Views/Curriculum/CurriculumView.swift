import SwiftUI

struct CurriculumView: View {
    let curriculumId: String
    @StateObject private var viewModel: CurriculumViewModel
    @StateObject private var networkMonitor = NetworkMonitor.shared
    @Environment(\.dismiss) private var dismiss
    
    init(curriculumId: String) {
        self.curriculumId = curriculumId
        _viewModel = StateObject(wrappedValue: CurriculumViewModel(curriculumId: curriculumId))
    }
    
    var body: some View {
        Group {
            if viewModel.isLoading {
                LoadingView(message: "Loading curriculum...")
                    .appBackground()
            } else if let curriculum = viewModel.curriculum {
                ScrollView {
                    VStack(alignment: .leading, spacing: 24) {
                        // Back button
                        Button(action: { dismiss() }) {
                            HStack(spacing: 8) {
                                Image(systemName: "chevron.left")
                                    .font(.body.weight(.medium))
                                Text("Back to Home")
                            }
                            .foregroundColor(.white.opacity(0.5))
                        }
                        .padding(.top, 8)
                        
                        // Ready to Learn card
                        ReadyToLearnCard(
                            viewModel: viewModel,
                            curriculumId: curriculumId,
                            isOnline: networkMonitor.isConnected
                        )
                        
                        // Curriculum Header
                        CurriculumHeaderView(
                            curriculum: curriculum,
                            completedCount: viewModel.completedCount,
                            totalTopics: viewModel.totalTopics
                        )
                        
                        // Offline indicator
                        if !networkMonitor.isConnected {
                            OfflineIndicator()
                        }
                        
                        // Download for offline button (iOS-specific feature)
                        if networkMonitor.isConnected {
                            DownloadSectionView(viewModel: viewModel)
                        }
                        
                        // Click any topic hint
                        HStack(spacing: 8) {
                            Image(systemName: "sparkles")
                                .font(.caption)
                                .foregroundColor(.white.opacity(0.3))
                            Text("Click any topic to start learning")
                                .font(.caption)
                                .foregroundColor(.white.opacity(0.3))
                        }
                        .padding(.top, 8)
                        
                        // Clusters with timeline
                        ClustersWithTimeline(
                            curriculum: curriculum,
                            curriculumId: curriculumId,
                            viewModel: viewModel
                        )
                        
                        // Footer
                        Text("Start from the top and work your way down for the best learning experience")
                            .font(.caption)
                            .foregroundColor(.white.opacity(0.3))
                            .multilineTextAlignment(.center)
                            .frame(maxWidth: .infinity)
                            .padding(.top, 24)
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
                        Task { await viewModel.loadCurriculum() }
                    }
                    .buttonStyle(GlassButtonStyle())
                }
                .padding()
                .appBackground()
            }
        }
        .navigationBarHidden(true)
        .task {
            await viewModel.loadCurriculum()
        }
        .refreshable {
            await viewModel.loadCurriculum()
        }
    }
}

// MARK: - Ready to Learn Card

struct ReadyToLearnCard: View {
    @ObservedObject var viewModel: CurriculumViewModel
    let curriculumId: String
    let isOnline: Bool
    
    private var progressPercent: Int {
        guard viewModel.totalTopics > 0 else { return 0 }
        return Int((Double(viewModel.completedCount) / Double(viewModel.totalTopics)) * 100)
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                VStack(alignment: .leading, spacing: 8) {
                    Text(viewModel.isPreparingContent ? "Preparing Your Lessons..." : "Ready to Learn?")
                        .font(.title3)
                        .fontWeight(.bold)
                        .foregroundColor(.white)
                    
                    // Progress bar if started
                    if viewModel.completedCount > 0 {
                        HStack(spacing: 12) {
                            GeometryReader { geometry in
                                ZStack(alignment: .leading) {
                                    RoundedRectangle(cornerRadius: 2)
                                        .fill(Color.white.opacity(0.1))
                                        .frame(height: 6)
                                    
                                    RoundedRectangle(cornerRadius: 2)
                                        .fill(AppGradients.progressBar)
                                        .frame(width: geometry.size.width * CGFloat(progressPercent) / 100, height: 6)
                                }
                            }
                            .frame(width: 100, height: 6)
                            
                            Text("\(progressPercent)%")
                                .font(.caption)
                                .foregroundColor(.white.opacity(0.6))
                            
                            Text("\(viewModel.completedCount)/\(viewModel.totalTopics) completed")
                                .font(.caption)
                                .foregroundColor(.white.opacity(0.4))
                        }
                    }
                    
                    // Content status
                    if viewModel.isContentReady {
                        HStack(spacing: 6) {
                            Image(systemName: "checkmark")
                                .font(.caption2)
                            Text("All content ready")
                        }
                        .font(.caption)
                        .foregroundColor(.electric400)
                    } else if viewModel.isPreparingContent {
                        HStack(spacing: 6) {
                            ProgressView()
                                .scaleEffect(0.6)
                                .tint(.electric400)
                            if let status = viewModel.contentStatus {
                                Text("Generating content... \(status.lessonsCached + status.quizzesCached)/\(status.totalTopics * 2)")
                            }
                        }
                        .font(.caption)
                        .foregroundColor(.electric400)
                    }
                }
                
                Spacer()
                
                // Start Learning button
                if let firstKey = viewModel.firstIncompleteTopicKey {
                    NavigationLink(destination: LearnView(
                        curriculumId: curriculumId,
                        topicKey: firstKey
                    )) {
                        HStack(spacing: 8) {
                            Image(systemName: "book")
                                .font(.body)
                            Text(viewModel.completedCount > 0 ? "Continue" : "Start Learning")
                                .fontWeight(.bold)
                        }
                        .foregroundColor(.midnight950)
                        .padding(.horizontal, 20)
                        .padding(.vertical, 16)
                        .background(
                            viewModel.isContentReady || !isOnline
                                ? AnyShapeStyle(AppGradients.electricButton)
                                : AnyShapeStyle(Color.white.opacity(0.1))
                        )
                        .cornerRadius(12)
                        .glow(color: viewModel.isContentReady ? .electric400 : .clear)
                    }
                    .disabled(!viewModel.isContentReady && isOnline)
                }
            }
        }
        .padding(20)
        .glassBackground(isStrong: true)
    }
}

// MARK: - Curriculum Header

struct CurriculumHeaderView: View {
    let curriculum: Curriculum
    let completedCount: Int
    let totalTopics: Int
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Title with gradient
            Text(curriculum.subject)
                .font(.system(size: 32, weight: .bold, design: .rounded))
                .gradientText()
            
            // Description
            Text(curriculum.description)
                .font(.body)
                .foregroundColor(.white.opacity(0.6))
                .lineSpacing(4)
            
            // Stats with colored dots
            HStack(spacing: 20) {
                HStack(spacing: 6) {
                    ColoredDot(color: .electric400)
                    Text("\(curriculum.clusters.count)")
                        .fontWeight(.semibold)
                        .foregroundColor(.white.opacity(0.8))
                    Text("clusters")
                        .foregroundColor(.white.opacity(0.5))
                }
                
                HStack(spacing: 6) {
                    ColoredDot(color: .coral400)
                    Text("\(totalTopics)")
                        .fontWeight(.semibold)
                        .foregroundColor(.white.opacity(0.8))
                    Text("topics")
                        .foregroundColor(.white.opacity(0.5))
                }
            }
            .font(.subheadline)
        }
    }
}

// MARK: - Clusters with Timeline

struct ClustersWithTimeline: View {
    let curriculum: Curriculum
    let curriculumId: String
    @ObservedObject var viewModel: CurriculumViewModel
    
    var body: some View {
        ZStack(alignment: .topLeading) {
            // Vertical timeline line
            Rectangle()
                .fill(AppGradients.timeline)
                .frame(width: 1)
                .padding(.leading, 24)
            
            // Clusters
            VStack(spacing: 16) {
                ForEach(Array(curriculum.clusters.sorted { $0.order < $1.order }.enumerated()), id: \.element.id) { idx, cluster in
                    let clusterIndex = curriculum.clusters.firstIndex(where: { $0.name == cluster.name }) ?? idx
                    
                    ClusterSectionView(
                        cluster: cluster,
                        clusterIndex: clusterIndex,
                        clusterOrder: cluster.order,
                        curriculumId: curriculumId,
                        viewModel: viewModel
                    )
                }
            }
            .padding(.leading, 48) // Space for timeline
        }
    }
}

// MARK: - Content Preparation View

struct ContentPreparationView: View {
    @ObservedObject var viewModel: CurriculumViewModel
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "sparkles")
                    .foregroundColor(.electric400)
                Text("Content Generation")
                    .font(.headline)
                    .foregroundColor(.white)
            }
            
            if viewModel.isPreparingContent {
                ProgressBarView(
                    progress: viewModel.preparationProgress,
                    status: viewModel.preparationStatus,
                    color: .electric400
                )
            } else {
                Text("Some lessons and quizzes need to be generated before you can start.")
                    .font(.subheadline)
                    .foregroundColor(.white.opacity(0.6))
                
                if let status = viewModel.contentStatus {
                    Text("\(status.lessonsCached)/\(status.totalTopics) lessons, \(status.quizzesCached)/\(status.totalTopics) quizzes ready")
                        .font(.caption)
                        .foregroundColor(.white.opacity(0.4))
                }
                
                Button(action: {
                    Task { await viewModel.prepareContent() }
                }) {
                    HStack {
                        Image(systemName: "wand.and.stars")
                        Text("Generate Content")
                    }
                }
                .buttonStyle(ElectricButtonStyle())
            }
        }
        .padding()
        .glassBackground()
    }
}

// MARK: - Download Section

struct DownloadSectionView: View {
    @ObservedObject var viewModel: CurriculumViewModel
    
    var isDownloaded: Bool {
        CacheService.shared.isDownloaded(viewModel.curriculumId)
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: isDownloaded ? "checkmark.circle.fill" : "arrow.down.circle")
                    .foregroundColor(isDownloaded ? .electric400 : .electric400)
                Text(isDownloaded ? "Downloaded for Offline" : "Download for Offline")
                    .font(.headline)
                    .foregroundColor(.white)
            }
            
            if viewModel.isDownloading {
                ProgressBarView(
                    progress: viewModel.downloadProgress,
                    status: viewModel.downloadStatus,
                    color: .electric400
                )
            } else if !isDownloaded {
                Text("Download all content to use this curriculum offline.")
                    .font(.subheadline)
                    .foregroundColor(.white.opacity(0.6))
                
                Button(action: {
                    Task { await viewModel.downloadForOffline() }
                }) {
                    HStack {
                        Image(systemName: "arrow.down.circle")
                        Text("Download")
                    }
                }
                .buttonStyle(ElectricButtonStyle())
            }
        }
        .padding()
        .glassBackground()
    }
}

// MARK: - Cluster Section

struct ClusterSectionView: View {
    let cluster: Cluster
    let clusterIndex: Int
    let clusterOrder: Int
    let curriculumId: String
    @ObservedObject var viewModel: CurriculumViewModel
    @State private var isExpanded = true
    
    private var completedInCluster: Int {
        cluster.topics.filter { topic in
            let topicIndex = cluster.topics.firstIndex(where: { $0.name == topic.name }) ?? 0
            return viewModel.isTopicCompleted(clusterIndex: clusterIndex, topicIndex: topicIndex)
        }.count
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Timeline dot
            HStack(alignment: .top, spacing: 0) {
                // Dot positioned on the timeline
                Circle()
                    .fill(Color.electric400)
                    .frame(width: 12, height: 12)
                    .shadow(color: .electric400.opacity(0.5), radius: 4)
                    .offset(x: -42)
                
                Spacer().frame(width: 0)
            }
            .frame(height: 0)
            .offset(y: 24)
            
            // Cluster card
            VStack(alignment: .leading, spacing: 0) {
                // Header
                Button(action: { withAnimation { isExpanded.toggle() } }) {
                    HStack(spacing: 16) {
                        // Numbered badge
                        NumberBadge(number: clusterOrder, size: 48, useGradient: true)
                        
                        VStack(alignment: .leading, spacing: 4) {
                            Text(cluster.name)
                                .font(.headline)
                                .fontWeight(.bold)
                                .foregroundColor(.white.opacity(0.95))
                            
                            Text(cluster.description)
                                .font(.caption)
                                .foregroundColor(.white.opacity(0.5))
                                .lineLimit(2)
                        }
                        
                        Spacer()
                        
                        if completedInCluster > 0 {
                            HStack(spacing: 4) {
                                Image(systemName: "checkmark")
                                    .font(.caption2)
                                Text("\(completedInCluster)/\(cluster.topics.count)")
                            }
                            .font(.caption)
                            .foregroundColor(.electric400)
                        }
                        
                        Image(systemName: isExpanded ? "chevron.down" : "chevron.right")
                            .font(.caption)
                            .foregroundColor(.white.opacity(0.3))
                    }
                    .padding()
                }
                .buttonStyle(.plain)
                
                // Divider
                if isExpanded {
                    Rectangle()
                        .fill(Color.white.opacity(0.06))
                        .frame(height: 1)
                }
                
                // Topics
                if isExpanded {
                    VStack(spacing: 8) {
                        ForEach(Array(cluster.topics.sorted { $0.order < $1.order }.enumerated()), id: \.element.id) { topicIdx, topic in
                            let actualTopicIndex = cluster.topics.firstIndex(where: { $0.name == topic.name }) ?? topicIdx
                            TopicCardView(
                                topic: topic,
                                clusterIndex: clusterIndex,
                                topicIndex: actualTopicIndex,
                                curriculumId: curriculumId,
                                isCompleted: viewModel.isTopicCompleted(clusterIndex: clusterIndex, topicIndex: actualTopicIndex),
                                hasLesson: viewModel.hasLessonCached(clusterIndex: clusterIndex, topicIndex: actualTopicIndex),
                                hasQuiz: viewModel.hasQuizCached(clusterIndex: clusterIndex, topicIndex: actualTopicIndex)
                            )
                        }
                    }
                    .padding()
                }
            }
            .glassBackground(isStrong: true)
        }
    }
}

// MARK: - Offline Indicator

struct OfflineIndicator: View {
    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: "wifi.slash")
                .font(.caption)
            Text("You're offline. Using cached content.")
                .font(.caption)
        }
        .foregroundColor(.coral400)
        .padding(12)
        .frame(maxWidth: .infinity)
        .glassBackground()
    }
}

// MARK: - Learning Progress Bar

struct LearningProgressBar: View {
    let completed: Int
    let total: Int
    
    private var progressPercent: CGFloat {
        guard total > 0 else { return 0 }
        return CGFloat(completed) / CGFloat(total)
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            GeometryReader { geometry in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 4)
                        .fill(Color.white.opacity(0.1))
                        .frame(height: 8)
                    
                    RoundedRectangle(cornerRadius: 4)
                        .fill(AppGradients.progressBar)
                        .frame(width: geometry.size.width * progressPercent, height: 8)
                }
            }
            .frame(height: 8)
            
            HStack {
                Text("\(completed) of \(total) topics completed")
                    .font(.caption)
                    .foregroundColor(.white.opacity(0.5))
                
                Spacer()
                
                Text("\(Int(progressPercent * 100))%")
                    .font(.caption)
                    .fontWeight(.semibold)
                    .foregroundColor(.electric400)
            }
        }
    }
}

#Preview {
    NavigationStack {
        CurriculumView(curriculumId: "064c2aa6")
    }
}
