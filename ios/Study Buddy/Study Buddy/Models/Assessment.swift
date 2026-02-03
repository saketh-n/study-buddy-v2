import Foundation

// MARK: - QuestionFeedback

struct QuestionFeedback: Codable, Identifiable, Equatable {
    let questionNum: Int
    let isCorrect: Bool
    let studentChoice: String
    let correctAnswer: String
    let analysis: String
    let explanation: String
    
    var id: Int { questionNum }
    
    enum CodingKeys: String, CodingKey {
        case questionNum = "question_num"
        case isCorrect = "is_correct"
        case studentChoice = "student_choice"
        case correctAnswer = "correct_answer"
        case analysis
        case explanation
    }
}

// MARK: - AssessmentSummary

struct AssessmentSummary: Codable, Equatable {
    let misconceptions: [String]
    let focusAreas: [String]
    let encouragement: String
    let recommendation: String
    
    enum CodingKeys: String, CodingKey {
        case misconceptions
        case focusAreas = "focus_areas"
        case encouragement
        case recommendation
    }
}

// MARK: - QuizAssessment

struct QuizAssessment: Codable, Identifiable, Equatable {
    let score: Int
    let passed: Bool
    let correctCount: Int
    let totalQuestions: Int
    let quizVersion: Int
    let questionFeedback: [QuestionFeedback]
    let summary: AssessmentSummary
    let fallbackMode: Bool?
    
    var id: String { "assessment-v\(quizVersion)-\(score)" }
    
    enum CodingKeys: String, CodingKey {
        case score
        case passed
        case correctCount = "correct_count"
        case totalQuestions = "total_questions"
        case quizVersion = "quiz_version"
        case questionFeedback = "question_feedback"
        case summary
        case fallbackMode = "fallback_mode"
    }
    
    /// Whether AI grading was used
    var usedAiGrading: Bool {
        !(fallbackMode ?? false)
    }
    
    /// Formatted score string
    var formattedScore: String {
        "\(score)%"
    }
    
    /// Score fraction string
    var scoreFraction: String {
        "\(correctCount)/\(totalQuestions)"
    }
}

// MARK: - API Status

struct ApiStatus: Codable {
    let hasApiKey: Bool
    
    enum CodingKeys: String, CodingKey {
        case hasApiKey = "has_api_key"
    }
}
