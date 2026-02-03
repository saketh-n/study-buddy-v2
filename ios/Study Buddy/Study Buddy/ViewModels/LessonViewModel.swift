import SwiftUI
import Combine

@MainActor
class LessonViewModel: ObservableObject {
    let curriculumId: String
    let topicKey: String
    
    @Published var curriculum: Curriculum?
    @Published var lesson: Lesson?
    @Published var quizHistory: QuizHistoryResponse?
    @Published var progress: LearningProgress?
    @Published var isLoading = true
    @Published var errorMessage: String?
    @Published var selectedTab = 0
    
    private let apiService = APIService.shared
    private let cacheService = CacheService.shared
    
    var clusterIndex: Int {
        TopicKey.parse(topicKey)?.clusterIndex ?? 0
    }
    
    var topicIndex: Int {
        TopicKey.parse(topicKey)?.topicIndex ?? 0
    }
    
    var flatTopics: [FlatTopic] {
        curriculum?.flattenTopics() ?? []
    }
    
    var currentFlatTopic: FlatTopic? {
        flatTopics.first { $0.topicKey == topicKey }
    }
    
    var currentTopic: Topic? {
        currentFlatTopic?.topic
    }
    
    var currentCluster: Cluster? {
        guard let curriculum = curriculum else { return nil }
        return curriculum.clusters[safe: clusterIndex]
    }
    
    var nextTopicKey: String? {
        guard let current = currentFlatTopic else { return nil }
        return flatTopics.first { $0.globalIndex == current.globalIndex + 1 }?.topicKey
    }
    
    var previousTopicKey: String? {
        guard let current = currentFlatTopic else { return nil }
        return flatTopics.first { $0.globalIndex == current.globalIndex - 1 }?.topicKey
    }
    
    var isCompleted: Bool {
        progress?.isTopicCompleted(clusterIndex: clusterIndex, topicIndex: topicIndex) ?? false
    }
    
    init(curriculumId: String, topicKey: String) {
        self.curriculumId = curriculumId
        self.topicKey = topicKey
    }
    
    func loadContent() async {
        isLoading = true
        errorMessage = nil
        
        do {
            // Load curriculum
            let record = try await apiService.getCurriculum(curriculumId)
            curriculum = record.curriculum
            
            // Load progress
            progress = try await apiService.getLearningProgress(curriculumId)
            
            // Load lesson
            lesson = try await apiService.generateLesson(
                curriculumId: curriculumId,
                clusterIndex: clusterIndex,
                topicIndex: topicIndex
            )
            
            // Load quiz history
            quizHistory = try await apiService.getQuizHistory(
                curriculumId: curriculumId,
                clusterIndex: clusterIndex,
                topicIndex: topicIndex
            )
            
        } catch {
            // Fall back to cached content
            if let cachedRecord = await cacheService.getCachedCurriculum(curriculumId) {
                curriculum = cachedRecord.curriculum
            }
            
            progress = await cacheService.getProgress(curriculumId)
            
            if let cachedLesson = await cacheService.getCachedLesson(
                curriculumId: curriculumId,
                clusterIndex: clusterIndex,
                topicIndex: topicIndex
            ) {
                lesson = cachedLesson
            } else {
                errorMessage = "Failed to load lesson: \(error.localizedDescription)"
            }
        }
        
        isLoading = false
    }
    
    func loadTopicContent(topicKey: String) async {
        guard let parsed = TopicKey.parse(topicKey) else { return }
        
        isLoading = true
        
        do {
            lesson = try await apiService.generateLesson(
                curriculumId: curriculumId,
                clusterIndex: parsed.clusterIndex,
                topicIndex: parsed.topicIndex
            )
            
            quizHistory = try await apiService.getQuizHistory(
                curriculumId: curriculumId,
                clusterIndex: parsed.clusterIndex,
                topicIndex: parsed.topicIndex
            )
        } catch {
            // Fall back to cached
            lesson = await cacheService.getCachedLesson(
                curriculumId: curriculumId,
                clusterIndex: parsed.clusterIndex,
                topicIndex: parsed.topicIndex
            )
        }
        
        isLoading = false
    }
}

// MARK: - Array Extension for Safe Access

extension Array {
    subscript(safe index: Index) -> Element? {
        indices.contains(index) ? self[index] : nil
    }
}
