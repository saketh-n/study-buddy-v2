import SwiftUI
import Combine

@MainActor
class QuizViewModel: ObservableObject {
    let curriculumId: String
    let topicKey: String
    let forceNew: Bool
    let reviewVersion: Int?
    
    @Published var quiz: Quiz?
    @Published var curriculum: Curriculum?
    @Published var answers: [Int] = []
    @Published var assessment: QuizAssessment?
    @Published var isLoading = true
    @Published var isSubmitting = false
    @Published var useAiGrading = false
    @Published var hasApiKey = false
    @Published var errorMessage: String?
    
    private let apiService = APIService.shared
    private let cacheService = CacheService.shared
    
    var clusterIndex: Int {
        TopicKey.parse(topicKey)?.clusterIndex ?? 0
    }
    
    var topicIndex: Int {
        TopicKey.parse(topicKey)?.topicIndex ?? 0
    }
    
    var isReviewMode: Bool {
        reviewVersion != nil
    }
    
    var allAnswered: Bool {
        guard let quiz = quiz else { return false }
        return answers.count == quiz.questions.count && !answers.contains(-1)
    }
    
    var answeredCount: Int {
        answers.filter { $0 >= 0 }.count
    }
    
    var flatTopics: [FlatTopic] {
        curriculum?.flattenTopics() ?? []
    }
    
    var currentFlatTopic: FlatTopic? {
        flatTopics.first { $0.topicKey == topicKey }
    }
    
    var nextTopicKey: String? {
        guard let current = currentFlatTopic else { return nil }
        return flatTopics.first { $0.globalIndex == current.globalIndex + 1 }?.topicKey
    }
    
    var isLastTopic: Bool {
        nextTopicKey == nil
    }
    
    init(curriculumId: String, topicKey: String, forceNew: Bool = false, reviewVersion: Int? = nil) {
        self.curriculumId = curriculumId
        self.topicKey = topicKey
        self.forceNew = forceNew
        self.reviewVersion = reviewVersion
    }
    
    func loadQuiz() async {
        isLoading = true
        errorMessage = nil
        
        do {
            // Check API status
            let status = try await apiService.getApiStatus()
            hasApiKey = status.hasApiKey
            // Note: useAiGrading stays false by default, user must enable it
            
            // Load curriculum
            let record = try await apiService.getCurriculum(curriculumId)
            curriculum = record.curriculum
            
            // Load quiz
            if let version = reviewVersion {
                // Review mode - load specific version
                quiz = try await apiService.getQuiz(
                    curriculumId: curriculumId,
                    clusterIndex: clusterIndex,
                    topicIndex: topicIndex,
                    version: version
                )
                
                // Load assessment for review
                let assessments = try await apiService.getAssessments(
                    curriculumId: curriculumId,
                    clusterIndex: clusterIndex,
                    topicIndex: topicIndex
                )
                assessment = assessments.assessments.first { $0.quizVersion == version }
                
                // Set answers from assessment
                if let feedback = assessment?.questionFeedback, let quiz = quiz {
                    answers = feedback.map { fb in
                        quiz.questions[fb.questionNum - 1].options.firstIndex(of: fb.studentChoice) ?? -1
                    }
                }
            } else if forceNew {
                quiz = try await apiService.generateNewQuiz(
                    curriculumId: curriculumId,
                    clusterIndex: clusterIndex,
                    topicIndex: topicIndex
                )
                initializeAnswers()
            } else {
                quiz = try await apiService.generateQuiz(
                    curriculumId: curriculumId,
                    clusterIndex: clusterIndex,
                    topicIndex: topicIndex
                )
                initializeAnswers()
            }
            
        } catch {
            // Fall back to cached quiz
            if let cachedRecord = await cacheService.getCachedCurriculum(curriculumId) {
                curriculum = cachedRecord.curriculum
            }
            
            if let version = reviewVersion {
                quiz = await cacheService.getCachedQuiz(
                    curriculumId: curriculumId,
                    clusterIndex: clusterIndex,
                    topicIndex: topicIndex,
                    version: version
                )
            } else {
                quiz = await cacheService.getCachedQuiz(
                    curriculumId: curriculumId,
                    clusterIndex: clusterIndex,
                    topicIndex: topicIndex
                )
            }
            
            if quiz != nil {
                initializeAnswers()
                hasApiKey = false
                useAiGrading = false
            } else {
                errorMessage = "Failed to load quiz: \(error.localizedDescription)"
            }
        }
        
        isLoading = false
    }
    
    private func initializeAnswers() {
        guard let quiz = quiz else { return }
        answers = Array(repeating: -1, count: quiz.questions.count)
    }
    
    func selectAnswer(questionIndex: Int, optionIndex: Int) {
        guard !isReviewMode else { return }
        guard questionIndex < answers.count else { return }
        answers[questionIndex] = optionIndex
    }
    
    func submitQuiz() async {
        guard allAnswered else { return }
        
        isSubmitting = true
        errorMessage = nil
        
        do {
            assessment = try await apiService.submitQuiz(
                curriculumId: curriculumId,
                clusterIndex: clusterIndex,
                topicIndex: topicIndex,
                answers: answers,
                useAiGrading: useAiGrading
            )
            
            // Cache the assessment locally
            if let assessment = assessment {
                try? await cacheService.saveAssessment(
                    assessment,
                    curriculumId: curriculumId,
                    clusterIndex: clusterIndex,
                    topicIndex: topicIndex
                )
            }
        } catch {
            errorMessage = "Failed to submit quiz: \(error.localizedDescription)"
        }
        
        isSubmitting = false
    }
    
    func retryQuiz() async {
        assessment = nil
        answers = Array(repeating: -1, count: quiz?.questions.count ?? 0)
        
        // Load a new quiz
        isLoading = true
        do {
            quiz = try await apiService.generateNewQuiz(
                curriculumId: curriculumId,
                clusterIndex: clusterIndex,
                topicIndex: topicIndex
            )
            initializeAnswers()
        } catch {
            // Use existing quiz
        }
        isLoading = false
    }
}
