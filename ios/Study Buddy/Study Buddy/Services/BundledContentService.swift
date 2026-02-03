import Foundation

/// Service for accessing bundled content that ships with the app
class BundledContentService {
    static let shared = BundledContentService()
    
    private let fileManager = FileManager.default
    
    /// URL to the bundled content directory
    var bundledContentDirectory: URL? {
        Bundle.main.url(forResource: "BundledContent", withExtension: nil)
    }
    
    private init() {}
    
    // MARK: - Curriculums
    
    /// Load all bundled curriculums
    func loadBundledCurriculums() -> [String: SavedCurriculumRecord]? {
        guard let contentDir = bundledContentDirectory else { return nil }
        
        let curriculumsPath = contentDir.appendingPathComponent("curriculums.json")
        
        guard let data = try? Data(contentsOf: curriculumsPath),
              let records = try? JSONDecoder().decode([String: SavedCurriculumRecord].self, from: data) else {
            return nil
        }
        
        return records
    }
    
    /// List bundled curriculums as summaries
    func listBundledCurriculums() -> [CurriculumSummary] {
        guard let records = loadBundledCurriculums() else { return [] }
        
        return records.values.map { record in
            CurriculumSummary(
                id: record.id,
                createdAt: record.createdAt,
                subject: record.curriculum.subject,
                description: record.curriculum.description,
                clusterCount: record.curriculum.clusters.count,
                topicCount: record.curriculum.totalTopics,
                completedTopics: 0,
                isDownloaded: true // Bundled content is always "downloaded"
            )
        }.sorted { $0.createdAt > $1.createdAt }
    }
    
    /// Get a specific bundled curriculum
    func getBundledCurriculum(_ id: String) -> SavedCurriculumRecord? {
        loadBundledCurriculums()?[id]
    }
    
    // MARK: - Lessons
    
    /// Get a bundled lesson
    func getBundledLesson(curriculumId: String, clusterIndex: Int, topicIndex: Int) -> Lesson? {
        guard let contentDir = bundledContentDirectory else { return nil }
        
        let lessonPath = contentDir
            .appendingPathComponent("content", isDirectory: true)
            .appendingPathComponent(curriculumId, isDirectory: true)
            .appendingPathComponent("lessons", isDirectory: true)
            .appendingPathComponent("\(clusterIndex)-\(topicIndex).json")
        
        guard let data = try? Data(contentsOf: lessonPath),
              let lesson = try? JSONDecoder().decode(Lesson.self, from: data) else {
            return nil
        }
        
        return lesson
    }
    
    // MARK: - Quizzes
    
    /// Get a bundled quiz
    func getBundledQuiz(curriculumId: String, clusterIndex: Int, topicIndex: Int, version: Int? = nil) -> Quiz? {
        guard let contentDir = bundledContentDirectory else { return nil }
        
        let quizDir = contentDir
            .appendingPathComponent("content", isDirectory: true)
            .appendingPathComponent(curriculumId, isDirectory: true)
            .appendingPathComponent("quizzes", isDirectory: true)
            .appendingPathComponent("\(clusterIndex)-\(topicIndex)", isDirectory: true)
        
        let targetVersion: Int
        if let v = version {
            targetVersion = v
        } else {
            // Get latest version
            let count = getBundledQuizCount(curriculumId: curriculumId, clusterIndex: clusterIndex, topicIndex: topicIndex)
            guard count > 0 else { return nil }
            targetVersion = count - 1
        }
        
        let quizPath = quizDir.appendingPathComponent("quiz_\(targetVersion).json")
        
        guard let data = try? Data(contentsOf: quizPath),
              var quiz = try? JSONDecoder().decode(Quiz.self, from: data) else {
            return nil
        }
        
        quiz.version = targetVersion
        return quiz
    }
    
    /// Get number of bundled quiz versions
    func getBundledQuizCount(curriculumId: String, clusterIndex: Int, topicIndex: Int) -> Int {
        guard let contentDir = bundledContentDirectory else { return 0 }
        
        let quizDir = contentDir
            .appendingPathComponent("content", isDirectory: true)
            .appendingPathComponent(curriculumId, isDirectory: true)
            .appendingPathComponent("quizzes", isDirectory: true)
            .appendingPathComponent("\(clusterIndex)-\(topicIndex)", isDirectory: true)
        
        guard let contents = try? fileManager.contentsOfDirectory(at: quizDir, includingPropertiesForKeys: nil) else {
            return 0
        }
        
        return contents.filter { $0.lastPathComponent.hasPrefix("quiz_") && $0.pathExtension == "json" }.count
    }
    
    // MARK: - Content Status
    
    /// Check if all content is available for a curriculum
    func isContentAvailable(curriculumId: String, curriculum: Curriculum) -> Bool {
        let flatTopics = curriculum.flattenTopics()
        
        for flatTopic in flatTopics {
            // Check lesson
            if getBundledLesson(curriculumId: curriculumId, clusterIndex: flatTopic.clusterIndex, topicIndex: flatTopic.topicIndex) == nil {
                return false
            }
            
            // Check quiz
            if getBundledQuizCount(curriculumId: curriculumId, clusterIndex: flatTopic.clusterIndex, topicIndex: flatTopic.topicIndex) == 0 {
                return false
            }
        }
        
        return true
    }
}
