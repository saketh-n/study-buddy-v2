import Foundation

// MARK: - QuizQuestion

struct QuizQuestion: Codable, Identifiable, Equatable {
    let question: String
    let options: [String]
    let correctIndex: Int
    let explanation: String
    
    var id: String { question }
    
    enum CodingKeys: String, CodingKey {
        case question
        case options
        case correctIndex = "correct_index"
        case explanation
    }
}

// MARK: - Quiz

struct Quiz: Codable, Identifiable, Equatable {
    let topicName: String
    let questions: [QuizQuestion]
    let passingScore: Int
    var version: Int
    
    var id: String { "\(topicName)-v\(version)" }
    
    enum CodingKeys: String, CodingKey {
        case topicName = "topic_name"
        case questions
        case passingScore = "passing_score"
        case version
    }
    
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        topicName = try container.decode(String.self, forKey: .topicName)
        questions = try container.decode([QuizQuestion].self, forKey: .questions)
        passingScore = try container.decodeIfPresent(Int.self, forKey: .passingScore) ?? 80
        version = try container.decodeIfPresent(Int.self, forKey: .version) ?? 0
    }
    
    init(topicName: String, questions: [QuizQuestion], passingScore: Int = 80, version: Int = 0) {
        self.topicName = topicName
        self.questions = questions
        self.passingScore = passingScore
        self.version = version
    }
}

// MARK: - API Request

struct QuizRequest: Codable {
    let curriculumId: String
    let clusterIndex: Int
    let topicIndex: Int
    
    enum CodingKeys: String, CodingKey {
        case curriculumId = "curriculum_id"
        case clusterIndex = "cluster_index"
        case topicIndex = "topic_index"
    }
}

struct QuizSubmission: Codable {
    let curriculumId: String
    let clusterIndex: Int
    let topicIndex: Int
    let answers: [Int]
    let useAiGrading: Bool
    
    enum CodingKeys: String, CodingKey {
        case curriculumId = "curriculum_id"
        case clusterIndex = "cluster_index"
        case topicIndex = "topic_index"
        case answers
        case useAiGrading = "use_ai_grading"
    }
}

// MARK: - Quiz History

struct QuizHistoryItem: Codable, Identifiable {
    let version: Int
    let quiz: Quiz
    let assessments: [QuizAssessment]
    
    var id: Int { version }
}

struct QuizHistoryResponse: Codable {
    let totalQuizzes: Int
    let history: [QuizHistoryItem]
    
    enum CodingKeys: String, CodingKey {
        case totalQuizzes = "total_quizzes"
        case history
    }
}
