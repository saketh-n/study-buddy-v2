import Foundation

/// Service for caching curriculum content locally
actor CacheService {
    static let shared = CacheService()
    
    private let fileManager = FileManager.default
    private let bundledContentService = BundledContentService.shared
    
    /// Base directory for cached content
    private var cacheDirectory: URL {
        let documentsDirectory = fileManager.urls(for: .documentDirectory, in: .userDomainMask)[0]
        return documentsDirectory.appendingPathComponent("StudyBuddyCache", isDirectory: true)
    }
    
    /// Directory for curriculum data
    private var curriculumsDirectory: URL {
        cacheDirectory.appendingPathComponent("curriculums", isDirectory: true)
    }
    
    /// Directory for content (lessons, quizzes)
    private var contentDirectory: URL {
        cacheDirectory.appendingPathComponent("content", isDirectory: true)
    }
    
    /// Path to curriculums.json
    private var curriculumsFilePath: URL {
        curriculumsDirectory.appendingPathComponent("curriculums.json")
    }
    
    /// Path to progress.json
    private var progressFilePath: URL {
        curriculumsDirectory.appendingPathComponent("progress.json")
    }
    
    /// Path to downloaded curriculum IDs
    private var downloadedIdsPath: URL {
        curriculumsDirectory.appendingPathComponent("downloaded_ids.json")
    }
    
    private init() {
        Task {
            await ensureDirectoriesExist()
            await copyBundledContentIfNeeded()
        }
    }
    
    // MARK: - Directory Setup
    
    private func ensureDirectoriesExist() {
        try? fileManager.createDirectory(at: cacheDirectory, withIntermediateDirectories: true)
        try? fileManager.createDirectory(at: curriculumsDirectory, withIntermediateDirectories: true)
        try? fileManager.createDirectory(at: contentDirectory, withIntermediateDirectories: true)
    }
    
    private func copyBundledContentIfNeeded() async {
        // Check if we've already copied bundled content
        let markerPath = cacheDirectory.appendingPathComponent(".bundled_content_copied")
        if fileManager.fileExists(atPath: markerPath.path) {
            return
        }
        
        // Copy bundled curriculums
        if let bundledCurriculums = bundledContentService.loadBundledCurriculums() {
            try? saveCurriculumsToCache(bundledCurriculums)
            
            // Mark bundled curriculum IDs as downloaded
            let bundledIds = bundledCurriculums.keys.map { $0 }
            try? saveDownloadedIds(Set(bundledIds))
        }
        
        // Copy bundled content
        if let bundledContentURL = bundledContentService.bundledContentDirectory {
            let bundledContent = bundledContentURL.appendingPathComponent("content", isDirectory: true)
            if fileManager.fileExists(atPath: bundledContent.path) {
                try? fileManager.copyItem(at: bundledContent, to: contentDirectory)
            }
        }
        
        // Mark as copied
        fileManager.createFile(atPath: markerPath.path, contents: nil)
    }
    
    // MARK: - Curriculum Storage
    
    /// List all cached curriculums
    func listCachedCurriculums() -> [CurriculumSummary] {
        guard let data = try? Data(contentsOf: curriculumsFilePath),
              let records = try? JSONDecoder().decode([String: SavedCurriculumRecord].self, from: data) else {
            // Fall back to bundled content
            return bundledContentService.listBundledCurriculums()
        }
        
        let downloadedIds = loadDownloadedIds()
        
        return records.values.map { record in
            var summary = CurriculumSummary(
                id: record.id,
                createdAt: record.createdAt,
                subject: record.curriculum.subject,
                description: record.curriculum.description,
                clusterCount: record.curriculum.clusters.count,
                topicCount: record.curriculum.totalTopics,
                completedTopics: 0,
                isDownloaded: downloadedIds.contains(record.id)
            )
            return summary
        }.sorted { $0.createdAt > $1.createdAt }
    }
    
    /// Get a specific curriculum
    func getCachedCurriculum(_ id: String) -> SavedCurriculumRecord? {
        guard let data = try? Data(contentsOf: curriculumsFilePath),
              let records = try? JSONDecoder().decode([String: SavedCurriculumRecord].self, from: data) else {
            return bundledContentService.getBundledCurriculum(id)
        }
        return records[id] ?? bundledContentService.getBundledCurriculum(id)
    }
    
    /// Save a curriculum to cache
    func saveCurriculum(_ record: SavedCurriculumRecord) throws {
        var records = loadCurriculumsFromCache()
        records[record.id] = record
        try saveCurriculumsToCache(records)
    }
    
    /// Delete a curriculum from cache
    func deleteCachedCurriculum(_ id: String) throws {
        var records = loadCurriculumsFromCache()
        records.removeValue(forKey: id)
        try saveCurriculumsToCache(records)
        
        // Also delete content
        let contentDir = contentDirectory.appendingPathComponent(id, isDirectory: true)
        try? fileManager.removeItem(at: contentDir)
        
        // Remove from downloaded IDs
        var downloadedIds = loadDownloadedIds()
        downloadedIds.remove(id)
        try? saveDownloadedIds(downloadedIds)
    }
    
    private func loadCurriculumsFromCache() -> [String: SavedCurriculumRecord] {
        guard let data = try? Data(contentsOf: curriculumsFilePath),
              let records = try? JSONDecoder().decode([String: SavedCurriculumRecord].self, from: data) else {
            return [:]
        }
        return records
    }
    
    private func saveCurriculumsToCache(_ records: [String: SavedCurriculumRecord]) throws {
        let data = try JSONEncoder().encode(records)
        try data.write(to: curriculumsFilePath)
    }
    
    // MARK: - Downloaded IDs
    
    nonisolated private func loadDownloadedIds() -> Set<String> {
        let documentsDirectory = fileManager.urls(for: .documentDirectory, in: .userDomainMask)[0]
        let path = documentsDirectory
            .appendingPathComponent("StudyBuddyCache", isDirectory: true)
            .appendingPathComponent("curriculums", isDirectory: true)
            .appendingPathComponent("downloaded_ids.json")
        
        guard let data = try? Data(contentsOf: path),
              let ids = try? JSONDecoder().decode(Set<String>.self, from: data) else {
            return []
        }
        return ids
    }
    
    private func saveDownloadedIds(_ ids: Set<String>) throws {
        let data = try JSONEncoder().encode(ids)
        try data.write(to: downloadedIdsPath)
    }
    
    /// Mark a curriculum as downloaded
    func markAsDownloaded(_ id: String) throws {
        var ids = loadDownloadedIds()
        ids.insert(id)
        try saveDownloadedIds(ids)
    }
    
    /// Check if a curriculum is downloaded
    nonisolated func isDownloaded(_ id: String) -> Bool {
        loadDownloadedIds().contains(id)
    }
    
    // MARK: - Progress Storage
    
    /// Get learning progress for a curriculum
    func getProgress(_ curriculumId: String) -> LearningProgress? {
        guard let data = try? Data(contentsOf: progressFilePath),
              let allProgress = try? JSONDecoder().decode([String: LearningProgress].self, from: data) else {
            return nil
        }
        return allProgress[curriculumId]
    }
    
    /// Save learning progress
    func saveProgress(_ progress: LearningProgress) throws {
        var allProgress = loadAllProgress()
        allProgress[progress.curriculumId] = progress
        let data = try JSONEncoder().encode(allProgress)
        try data.write(to: progressFilePath)
    }
    
    private func loadAllProgress() -> [String: LearningProgress] {
        guard let data = try? Data(contentsOf: progressFilePath),
              let allProgress = try? JSONDecoder().decode([String: LearningProgress].self, from: data) else {
            return [:]
        }
        return allProgress
    }
    
    // MARK: - Lesson Storage
    
    /// Get cached lesson
    func getCachedLesson(curriculumId: String, clusterIndex: Int, topicIndex: Int) -> Lesson? {
        let path = lessonPath(curriculumId: curriculumId, clusterIndex: clusterIndex, topicIndex: topicIndex)
        
        // Try local cache first
        if let data = try? Data(contentsOf: path),
           let lesson = try? JSONDecoder().decode(Lesson.self, from: data) {
            return lesson
        }
        
        // Fall back to bundled content
        return bundledContentService.getBundledLesson(curriculumId: curriculumId, clusterIndex: clusterIndex, topicIndex: topicIndex)
    }
    
    /// Save lesson to cache
    func saveLesson(_ lesson: Lesson, curriculumId: String, clusterIndex: Int, topicIndex: Int) throws {
        let dir = contentDirectory
            .appendingPathComponent(curriculumId, isDirectory: true)
            .appendingPathComponent("lessons", isDirectory: true)
        
        try fileManager.createDirectory(at: dir, withIntermediateDirectories: true)
        
        let path = dir.appendingPathComponent("\(clusterIndex)-\(topicIndex).json")
        let data = try JSONEncoder().encode(lesson)
        try data.write(to: path)
    }
    
    private func lessonPath(curriculumId: String, clusterIndex: Int, topicIndex: Int) -> URL {
        contentDirectory
            .appendingPathComponent(curriculumId, isDirectory: true)
            .appendingPathComponent("lessons", isDirectory: true)
            .appendingPathComponent("\(clusterIndex)-\(topicIndex).json")
    }
    
    // MARK: - Quiz Storage
    
    /// Get cached quiz (latest version)
    func getCachedQuiz(curriculumId: String, clusterIndex: Int, topicIndex: Int, version: Int? = nil) -> Quiz? {
        let dir = quizDirectory(curriculumId: curriculumId, clusterIndex: clusterIndex, topicIndex: topicIndex)
        
        let targetVersion: Int
        if let v = version {
            targetVersion = v
        } else {
            // Get latest version
            let count = getQuizCount(curriculumId: curriculumId, clusterIndex: clusterIndex, topicIndex: topicIndex)
            if count == 0 {
                // Try bundled content
                return bundledContentService.getBundledQuiz(curriculumId: curriculumId, clusterIndex: clusterIndex, topicIndex: topicIndex)
            }
            targetVersion = count - 1
        }
        
        let path = dir.appendingPathComponent("quiz_\(targetVersion).json")
        
        if let data = try? Data(contentsOf: path),
           var quiz = try? JSONDecoder().decode(Quiz.self, from: data) {
            quiz.version = targetVersion
            return quiz
        }
        
        // Fall back to bundled content
        return bundledContentService.getBundledQuiz(curriculumId: curriculumId, clusterIndex: clusterIndex, topicIndex: topicIndex, version: version)
    }
    
    /// Get number of quiz versions
    func getQuizCount(curriculumId: String, clusterIndex: Int, topicIndex: Int) -> Int {
        let dir = quizDirectory(curriculumId: curriculumId, clusterIndex: clusterIndex, topicIndex: topicIndex)
        
        guard let contents = try? fileManager.contentsOfDirectory(at: dir, includingPropertiesForKeys: nil) else {
            // Check bundled content
            return bundledContentService.getBundledQuizCount(curriculumId: curriculumId, clusterIndex: clusterIndex, topicIndex: topicIndex)
        }
        
        let localCount = contents.filter { $0.lastPathComponent.hasPrefix("quiz_") && $0.pathExtension == "json" }.count
        let bundledCount = bundledContentService.getBundledQuizCount(curriculumId: curriculumId, clusterIndex: clusterIndex, topicIndex: topicIndex)
        
        return max(localCount, bundledCount)
    }
    
    /// Save quiz to cache
    func saveQuiz(_ quiz: Quiz, curriculumId: String, clusterIndex: Int, topicIndex: Int) throws -> Int {
        let dir = quizDirectory(curriculumId: curriculumId, clusterIndex: clusterIndex, topicIndex: topicIndex)
        try fileManager.createDirectory(at: dir, withIntermediateDirectories: true)
        
        let version = getQuizCount(curriculumId: curriculumId, clusterIndex: clusterIndex, topicIndex: topicIndex)
        let path = dir.appendingPathComponent("quiz_\(version).json")
        
        var quizToSave = quiz
        quizToSave.version = version
        
        let data = try JSONEncoder().encode(quizToSave)
        try data.write(to: path)
        
        return version
    }
    
    private func quizDirectory(curriculumId: String, clusterIndex: Int, topicIndex: Int) -> URL {
        contentDirectory
            .appendingPathComponent(curriculumId, isDirectory: true)
            .appendingPathComponent("quizzes", isDirectory: true)
            .appendingPathComponent("\(clusterIndex)-\(topicIndex)", isDirectory: true)
    }
    
    // MARK: - Assessment Storage
    
    /// Get assessments for a topic
    func getAssessments(curriculumId: String, clusterIndex: Int, topicIndex: Int) -> [QuizAssessment] {
        let path = assessmentsPath(curriculumId: curriculumId, clusterIndex: clusterIndex, topicIndex: topicIndex)
        
        guard let data = try? Data(contentsOf: path),
              let assessments = try? JSONDecoder().decode([QuizAssessment].self, from: data) else {
            return []
        }
        return assessments
    }
    
    /// Save assessment
    func saveAssessment(_ assessment: QuizAssessment, curriculumId: String, clusterIndex: Int, topicIndex: Int) throws {
        var assessments = getAssessments(curriculumId: curriculumId, clusterIndex: clusterIndex, topicIndex: topicIndex)
        assessments.append(assessment)
        
        let dir = quizDirectory(curriculumId: curriculumId, clusterIndex: clusterIndex, topicIndex: topicIndex)
        try fileManager.createDirectory(at: dir, withIntermediateDirectories: true)
        
        let path = assessmentsPath(curriculumId: curriculumId, clusterIndex: clusterIndex, topicIndex: topicIndex)
        let data = try JSONEncoder().encode(assessments)
        try data.write(to: path)
    }
    
    private func assessmentsPath(curriculumId: String, clusterIndex: Int, topicIndex: Int) -> URL {
        quizDirectory(curriculumId: curriculumId, clusterIndex: clusterIndex, topicIndex: topicIndex)
            .appendingPathComponent("assessments.json")
    }
    
    // MARK: - Download All Content
    
    /// Download all content for a curriculum (for offline use)
    func downloadAllContent(
        record: SavedCurriculumRecord,
        apiService: APIService,
        onProgress: @escaping (Double, String) -> Void
    ) async throws {
        let curriculumId = record.id
        let curriculum = record.curriculum
        
        // Save curriculum record to curriculums.json
        try saveCurriculum(record)
        
        // Fetch and save progress to progress.json
        let progress: LearningProgress
        do {
            progress = try await apiService.getLearningProgress(curriculumId)
        } catch {
            // No existing progress — create an empty entry
            let now = ISO8601DateFormatter().string(from: Date())
            progress = LearningProgress(
                curriculumId: curriculumId,
                topics: [:],
                startedAt: now,
                lastActivity: now
            )
        }
        try saveProgress(progress)
        
        let flatTopics = curriculum.flattenTopics()
        let totalItems = flatTopics.count * 2 // lessons + quizzes
        var completed = 0
        
        for flatTopic in flatTopics {
            // Download lesson
            onProgress(Double(completed) / Double(totalItems), "Downloading lesson: \(flatTopic.topic.name)")
            
            if getCachedLesson(curriculumId: curriculumId, clusterIndex: flatTopic.clusterIndex, topicIndex: flatTopic.topicIndex) == nil {
                let lesson = try await apiService.generateLesson(
                    curriculumId: curriculumId,
                    clusterIndex: flatTopic.clusterIndex,
                    topicIndex: flatTopic.topicIndex
                )
                try saveLesson(lesson, curriculumId: curriculumId, clusterIndex: flatTopic.clusterIndex, topicIndex: flatTopic.topicIndex)
            }
            completed += 1
            
            // Download quiz
            onProgress(Double(completed) / Double(totalItems), "Downloading quiz: \(flatTopic.topic.name)")
            
            if getQuizCount(curriculumId: curriculumId, clusterIndex: flatTopic.clusterIndex, topicIndex: flatTopic.topicIndex) == 0 {
                let quiz = try await apiService.generateQuiz(
                    curriculumId: curriculumId,
                    clusterIndex: flatTopic.clusterIndex,
                    topicIndex: flatTopic.topicIndex
                )
                _ = try saveQuiz(quiz, curriculumId: curriculumId, clusterIndex: flatTopic.clusterIndex, topicIndex: flatTopic.topicIndex)
            }
            completed += 1
        }
        
        // Mark as downloaded
        try markAsDownloaded(curriculumId)
        
        onProgress(1.0, "Download complete!")
    }
}
