import SwiftUI
import Combine

@MainActor
class CurriculumViewModel: ObservableObject {
    let curriculumId: String
    
    @Published var curriculum: Curriculum?
    @Published var progress: LearningProgress?
    @Published var contentStatus: ContentStatus?
    @Published var isLoading = true
    @Published var isPreparingContent = false
    @Published var preparationProgress: Double = 0
    @Published var preparationStatus: String = ""
    @Published var errorMessage: String?
    @Published var isDownloading = false
    @Published var downloadProgress: Double = 0
    @Published var downloadStatus: String = ""
    
    private let apiService = APIService.shared
    private let cacheService = CacheService.shared
    private var curriculumRecord: SavedCurriculumRecord?
    
    init(curriculumId: String) {
        self.curriculumId = curriculumId
    }
    
    var flatTopics: [FlatTopic] {
        curriculum?.flattenTopics() ?? []
    }
    
    var completedCount: Int {
        progress?.completedCount ?? 0
    }
    
    var totalTopics: Int {
        curriculum?.totalTopics ?? 0
    }
    
    var isContentReady: Bool {
        contentStatus?.ready ?? false
    }
    
    var firstIncompleteTopicKey: String? {
        guard let curriculum = curriculum else { return nil }
        return progress?.firstIncompleteTopicKey(in: curriculum) ?? flatTopics.first?.topicKey
    }
    
    func loadCurriculum() async {
        isLoading = true
        errorMessage = nil
        
        do {
            // Try API first
            let record = try await apiService.getCurriculum(curriculumId)
            curriculumRecord = record
            curriculum = record.curriculum
            
            // Load progress
            progress = try await apiService.getLearningProgress(curriculumId)
            
            // Check content status
            contentStatus = try await apiService.getContentStatus(curriculumId)
            
        } catch {
            // Fall back to cached/bundled content
            if let cachedRecord = await cacheService.getCachedCurriculum(curriculumId) {
                curriculum = cachedRecord.curriculum
                progress = await cacheService.getProgress(curriculumId)
                
                // For offline content, assume it's ready if bundled
                contentStatus = ContentStatus(
                    totalTopics: curriculum?.totalTopics ?? 0,
                    lessonsCached: curriculum?.totalTopics ?? 0,
                    quizzesCached: curriculum?.totalTopics ?? 0,
                    missingLessons: [],
                    missingQuizzes: [],
                    ready: true
                )
            } else {
                errorMessage = "Failed to load curriculum: \(error.localizedDescription)"
            }
        }
        
        isLoading = false
    }
    
    func startLearning() async {
        do {
            progress = try await apiService.startLearning(curriculumId)
        } catch {
            // Initialize local progress
            let now = ISO8601DateFormatter().string(from: Date())
            progress = LearningProgress(
                curriculumId: curriculumId,
                topics: [:],
                startedAt: now,
                lastActivity: now
            )
            try? await cacheService.saveProgress(progress!)
        }
    }
    
    func prepareContent() async {
        isPreparingContent = true
        preparationProgress = 0
        preparationStatus = "Starting..."
        
        do {
            try await apiService.prepareCurriculumContent(curriculumId) { [weak self] progress, status in
                Task { @MainActor in
                    self?.preparationProgress = progress
                    self?.preparationStatus = status
                }
            }
            
            // Reload content status
            contentStatus = try await apiService.getContentStatus(curriculumId)
            
        } catch {
            errorMessage = "Failed to prepare content: \(error.localizedDescription)"
        }
        
        isPreparingContent = false
    }
    
    func downloadForOffline() async {
        guard let curriculum = curriculum else { return }
        
        isDownloading = true
        downloadProgress = 0
        downloadStatus = "Starting download..."
        
        do {
            // Use stored record, or construct one from available data
            let record = curriculumRecord ?? SavedCurriculumRecord(
                id: curriculumId,
                createdAt: ISO8601DateFormatter().string(from: Date()),
                curriculum: curriculum
            )
            
            try await cacheService.downloadAllContent(
                record: record,
                apiService: apiService
            ) { [weak self] progress, status in
                Task { @MainActor in
                    self?.downloadProgress = progress
                    self?.downloadStatus = status
                }
            }
        } catch {
            errorMessage = "Download failed: \(error.localizedDescription)"
        }
        
        isDownloading = false
    }
    
    func isTopicCompleted(clusterIndex: Int, topicIndex: Int) -> Bool {
        progress?.isTopicCompleted(clusterIndex: clusterIndex, topicIndex: topicIndex) ?? false
    }
    
    func hasLessonCached(clusterIndex: Int, topicIndex: Int) -> Bool {
        if let status = contentStatus {
            return !status.missingLessons.contains { $0.clusterIndex == clusterIndex && $0.topicIndex == topicIndex }
        }
        return true // Assume available for offline mode
    }
    
    func hasQuizCached(clusterIndex: Int, topicIndex: Int) -> Bool {
        if let status = contentStatus {
            return !status.missingQuizzes.contains { $0.clusterIndex == clusterIndex && $0.topicIndex == topicIndex }
        }
        return true // Assume available for offline mode
    }
}
