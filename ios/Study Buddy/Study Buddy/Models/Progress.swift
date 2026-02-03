import Foundation

// MARK: - TopicProgress

struct TopicProgress: Codable, Equatable {
    let completed: Bool
    let quizScore: Int?
    let completedAt: String?
    
    enum CodingKeys: String, CodingKey {
        case completed
        case quizScore = "quiz_score"
        case completedAt = "completed_at"
    }
    
    init(completed: Bool = false, quizScore: Int? = nil, completedAt: String? = nil) {
        self.completed = completed
        self.quizScore = quizScore
        self.completedAt = completedAt
    }
}

// MARK: - LearningProgress

struct LearningProgress: Codable, Equatable {
    let curriculumId: String
    var topics: [String: TopicProgress]
    let startedAt: String
    var lastActivity: String
    
    enum CodingKeys: String, CodingKey {
        case curriculumId = "curriculum_id"
        case topics
        case startedAt = "started_at"
        case lastActivity = "last_activity"
    }
    
    /// Check if a topic is completed
    func isTopicCompleted(clusterIndex: Int, topicIndex: Int) -> Bool {
        let key = TopicKey.make(clusterIndex: clusterIndex, topicIndex: topicIndex)
        return topics[key]?.completed ?? false
    }
    
    /// Get quiz score for a topic
    func getQuizScore(clusterIndex: Int, topicIndex: Int) -> Int? {
        let key = TopicKey.make(clusterIndex: clusterIndex, topicIndex: topicIndex)
        return topics[key]?.quizScore
    }
    
    /// Count completed topics
    var completedCount: Int {
        topics.values.filter { $0.completed }.count
    }
    
    /// Find the first incomplete topic key
    func firstIncompleteTopicKey(in curriculum: Curriculum) -> String? {
        let flatTopics = curriculum.flattenTopics()
        return flatTopics.first { !isTopicCompleted(clusterIndex: $0.clusterIndex, topicIndex: $0.topicIndex) }?.topicKey
    }
}

// MARK: - ContentStatus

struct ContentStatus: Codable {
    let totalTopics: Int
    let lessonsCached: Int
    let quizzesCached: Int
    let missingLessons: [MissingContent]
    let missingQuizzes: [MissingContent]
    let ready: Bool
    
    enum CodingKeys: String, CodingKey {
        case totalTopics = "total_topics"
        case lessonsCached = "lessons_cached"
        case quizzesCached = "quizzes_cached"
        case missingLessons = "missing_lessons"
        case missingQuizzes = "missing_quizzes"
        case ready
    }
}

struct MissingContent: Codable, Identifiable {
    let clusterIndex: Int
    let topicIndex: Int
    let topicName: String
    let clusterName: String
    
    var id: String { "\(clusterIndex)-\(topicIndex)" }
    
    enum CodingKeys: String, CodingKey {
        case clusterIndex = "cluster_index"
        case topicIndex = "topic_index"
        case topicName = "topic_name"
        case clusterName = "cluster_name"
    }
}
