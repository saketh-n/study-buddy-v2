import Foundation

/// API Service for communicating with the Study Buddy backend
actor APIService {
    static let shared = APIService()
    
    /// Base URL for the API
    var baseURL: String {
        #if DEBUG
        // Local testing - use LAN IP
        return "http://192.168.50.81:8000"
        #else
        // Production - will be updated when deployed
        return "https://api.studybuddy.com"
        #endif
    }
    
    private let session: URLSession
    private let decoder: JSONDecoder
    private let encoder: JSONEncoder
    
    private init() {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 60
        config.timeoutIntervalForResource = 300
        self.session = URLSession(configuration: config)
        self.decoder = JSONDecoder()
        self.encoder = JSONEncoder()
    }
    
    // MARK: - Helper Methods
    
    private func makeURL(_ path: String) -> URL {
        URL(string: "\(baseURL)\(path)")!
    }
    
    private func makeRequest(_ url: URL, method: String = "GET", body: Data? = nil) -> URLRequest {
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = body
        return request
    }
    
    private func fetch<T: Decodable>(_ request: URLRequest) async throws -> T {
        let (data, response) = try await session.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        
        guard (200...299).contains(httpResponse.statusCode) else {
            throw APIError.httpError(statusCode: httpResponse.statusCode, data: data)
        }
        
        return try decoder.decode(T.self, from: data)
    }
    
    // MARK: - Status
    
    /// Check API status
    func getApiStatus() async throws -> ApiStatus {
        let request = makeRequest(makeURL("/api/status"))
        return try await fetch(request)
    }
    
    // MARK: - Curriculums
    
    /// List all curriculums
    func listCurriculums() async throws -> [CurriculumSummary] {
        let request = makeRequest(makeURL("/api/curriculums"))
        let response: CurriculumsResponse = try await fetch(request)
        return response.curriculums
    }
    
    /// Get a specific curriculum
    func getCurriculum(_ id: String) async throws -> SavedCurriculumRecord {
        let request = makeRequest(makeURL("/api/curriculums/\(id)"))
        return try await fetch(request)
    }
    
    /// Delete a curriculum
    func deleteCurriculum(_ id: String) async throws {
        let request = makeRequest(makeURL("/api/curriculums/\(id)"), method: "DELETE")
        let _: DeleteResponse = try await fetch(request)
    }
    
    // MARK: - Curriculum Parsing (SSE)
    
    /// Parse raw text into a curriculum using SSE streaming
    func parseCurriculumStream(
        rawText: String,
        onProgress: @escaping (Double, String) -> Void
    ) async throws -> String {
        let url = makeURL("/api/parse/stream")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("text/event-stream", forHTTPHeaderField: "Accept")
        
        let body = ParseRequest(rawText: rawText)
        request.httpBody = try encoder.encode(body)
        
        return try await SSEService.shared.stream(request: request) { event in
            if let data = event.data,
               let jsonData = data.data(using: .utf8),
               let progressEvent = try? self.decoder.decode(ParseProgressEvent.self, from: jsonData) {
                
                let progress = Double(progressEvent.progress ?? 0) / 100.0
                let message = progressEvent.message ?? ""
                
                Task { @MainActor in
                    onProgress(progress, message)
                }
                
                if progressEvent.status == "complete", let savedId = progressEvent.savedId {
                    return savedId
                }
                
                if progressEvent.status == "error" {
                    throw APIError.serverError(message: progressEvent.message ?? "Unknown error")
                }
            }
            return nil
        }
    }
    
    // MARK: - Learning Progress
    
    /// Get learning progress for a curriculum
    func getLearningProgress(_ curriculumId: String) async throws -> LearningProgress {
        let request = makeRequest(makeURL("/api/curriculums/\(curriculumId)/progress"))
        return try await fetch(request)
    }
    
    /// Start learning a curriculum
    func startLearning(_ curriculumId: String) async throws -> LearningProgress {
        let request = makeRequest(makeURL("/api/curriculums/\(curriculumId)/progress/start"), method: "POST")
        return try await fetch(request)
    }
    
    // MARK: - Content Status
    
    /// Get content status for a curriculum
    func getContentStatus(_ curriculumId: String) async throws -> ContentStatus {
        let request = makeRequest(makeURL("/api/curriculums/\(curriculumId)/content-status"))
        return try await fetch(request)
    }
    
    /// Prepare curriculum content (generate missing lessons/quizzes)
    func prepareCurriculumContent(
        _ curriculumId: String,
        onProgress: @escaping (Double, String) -> Void
    ) async throws {
        let url = makeURL("/api/curriculums/\(curriculumId)/prepare")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("text/event-stream", forHTTPHeaderField: "Accept")
        
        try await SSEService.shared.streamVoid(request: request) { event in
            if let data = event.data,
               let jsonData = data.data(using: .utf8),
               let json = try? JSONSerialization.jsonObject(with: jsonData) as? [String: Any] {
                
                let type = json["type"] as? String ?? ""
                let completed = json["completed"] as? Int ?? 0
                let total = json["total"] as? Int ?? 1
                
                let progress = total > 0 ? Double(completed) / Double(total) : 0
                var message = ""
                
                switch type {
                case "start":
                    message = "Starting content generation..."
                case "batch_start":
                    if let items = json["items"] as? [[String: Any]],
                       let firstItem = items.first,
                       let topicName = firstItem["topic_name"] as? String {
                        message = "Generating: \(topicName)"
                    }
                case "batch_complete":
                    message = "Generated \(completed) of \(total)"
                case "complete":
                    message = "Content ready!"
                default:
                    break
                }
                
                Task { @MainActor in
                    onProgress(progress, message)
                }
                
                if type == "complete" {
                    return true
                }
            }
            return nil
        }
    }
    
    // MARK: - Lessons
    
    /// Generate a lesson for a topic
    func generateLesson(curriculumId: String, clusterIndex: Int, topicIndex: Int) async throws -> Lesson {
        let url = makeURL("/api/lesson")
        let body = LessonRequest(curriculumId: curriculumId, clusterIndex: clusterIndex, topicIndex: topicIndex)
        let request = makeRequest(url, method: "POST", body: try encoder.encode(body))
        return try await fetch(request)
    }
    
    // MARK: - Quizzes
    
    /// Generate a quiz for a topic (returns cached if available)
    func generateQuiz(curriculumId: String, clusterIndex: Int, topicIndex: Int) async throws -> Quiz {
        let url = makeURL("/api/quiz")
        let body = QuizRequest(curriculumId: curriculumId, clusterIndex: clusterIndex, topicIndex: topicIndex)
        let request = makeRequest(url, method: "POST", body: try encoder.encode(body))
        return try await fetch(request)
    }
    
    /// Generate a new quiz (forces new generation)
    func generateNewQuiz(curriculumId: String, clusterIndex: Int, topicIndex: Int) async throws -> Quiz {
        let url = makeURL("/api/quiz/new")
        let body = QuizRequest(curriculumId: curriculumId, clusterIndex: clusterIndex, topicIndex: topicIndex)
        let request = makeRequest(url, method: "POST", body: try encoder.encode(body))
        return try await fetch(request)
    }
    
    /// Get a specific quiz version
    func getQuiz(curriculumId: String, clusterIndex: Int, topicIndex: Int, version: Int) async throws -> Quiz {
        let url = makeURL("/api/quiz/\(curriculumId)/\(clusterIndex)/\(topicIndex)/\(version)")
        let request = makeRequest(url)
        return try await fetch(request)
    }
    
    /// Submit quiz answers
    func submitQuiz(
        curriculumId: String,
        clusterIndex: Int,
        topicIndex: Int,
        answers: [Int],
        useAiGrading: Bool
    ) async throws -> QuizAssessment {
        let url = makeURL("/api/quiz/submit")
        let body = QuizSubmission(
            curriculumId: curriculumId,
            clusterIndex: clusterIndex,
            topicIndex: topicIndex,
            answers: answers,
            useAiGrading: useAiGrading
        )
        let request = makeRequest(url, method: "POST", body: try encoder.encode(body))
        return try await fetch(request)
    }
    
    /// Get quiz history for a topic
    func getQuizHistory(curriculumId: String, clusterIndex: Int, topicIndex: Int) async throws -> QuizHistoryResponse {
        let url = makeURL("/api/history/quiz/\(curriculumId)/\(clusterIndex)/\(topicIndex)")
        let request = makeRequest(url)
        return try await fetch(request)
    }
    
    /// Get assessments for a topic
    func getAssessments(curriculumId: String, clusterIndex: Int, topicIndex: Int) async throws -> AssessmentsResponse {
        let url = makeURL("/api/assessments/\(curriculumId)/\(clusterIndex)/\(topicIndex)")
        let request = makeRequest(url)
        return try await fetch(request)
    }
}

// MARK: - Request/Response Types

struct ParseRequest: Codable {
    let rawText: String
    
    enum CodingKeys: String, CodingKey {
        case rawText = "raw_text"
    }
}

struct DeleteResponse: Codable {
    let success: Bool
    let message: String
}

struct AssessmentsResponse: Codable {
    let assessments: [QuizAssessment]
}

// MARK: - API Errors

enum APIError: LocalizedError {
    case invalidResponse
    case httpError(statusCode: Int, data: Data)
    case serverError(message: String)
    case networkUnavailable
    
    var errorDescription: String? {
        switch self {
        case .invalidResponse:
            return "Invalid response from server"
        case .httpError(let statusCode, let data):
            if let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
               let detail = json["detail"] as? String {
                return detail
            }
            return "Server error (HTTP \(statusCode))"
        case .serverError(let message):
            return message
        case .networkUnavailable:
            return "Network unavailable. Using offline content."
        }
    }
}
