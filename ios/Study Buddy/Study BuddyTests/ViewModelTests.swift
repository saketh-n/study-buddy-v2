import XCTest
@testable import Study_Buddy

final class ViewModelTests: XCTestCase {
    
    // MARK: - HomeViewModel Tests
    
    @MainActor
    func testHomeViewModelInitialState() {
        let viewModel = HomeViewModel()
        
        XCTAssertTrue(viewModel.curriculums.isEmpty)
        XCTAssertFalse(viewModel.isLoading)
        XCTAssertNil(viewModel.errorMessage)
        XCTAssertTrue(viewModel.rawText.isEmpty)
        XCTAssertFalse(viewModel.isCreating)
        XCTAssertEqual(viewModel.creationProgress, 0)
    }
    
    // MARK: - CurriculumViewModel Tests
    
    @MainActor
    func testCurriculumViewModelInitialState() {
        let viewModel = CurriculumViewModel(curriculumId: "test123")
        
        XCTAssertEqual(viewModel.curriculumId, "test123")
        XCTAssertNil(viewModel.curriculum)
        XCTAssertNil(viewModel.progress)
        XCTAssertTrue(viewModel.isLoading)
        XCTAssertFalse(viewModel.isPreparingContent)
    }
    
    @MainActor
    func testCurriculumViewModelFlatTopics() {
        let viewModel = CurriculumViewModel(curriculumId: "test")
        
        // Without curriculum, should return empty
        XCTAssertTrue(viewModel.flatTopics.isEmpty)
    }
    
    @MainActor
    func testCurriculumViewModelCompletedCount() {
        let viewModel = CurriculumViewModel(curriculumId: "test")
        
        // Without progress, should return 0
        XCTAssertEqual(viewModel.completedCount, 0)
    }
    
    // MARK: - LessonViewModel Tests
    
    @MainActor
    func testLessonViewModelInitialState() {
        let viewModel = LessonViewModel(curriculumId: "test", topicKey: "0-1")
        
        XCTAssertEqual(viewModel.curriculumId, "test")
        XCTAssertEqual(viewModel.topicKey, "0-1")
        XCTAssertEqual(viewModel.clusterIndex, 0)
        XCTAssertEqual(viewModel.topicIndex, 1)
        XCTAssertTrue(viewModel.isLoading)
    }
    
    @MainActor
    func testLessonViewModelParsesTopicKey() {
        let viewModel = LessonViewModel(curriculumId: "test", topicKey: "2-3")
        
        XCTAssertEqual(viewModel.clusterIndex, 2)
        XCTAssertEqual(viewModel.topicIndex, 3)
    }
    
    @MainActor
    func testLessonViewModelNavigation() {
        let viewModel = LessonViewModel(curriculumId: "test", topicKey: "0-0")
        
        // Without curriculum, navigation should return nil
        XCTAssertNil(viewModel.nextTopicKey)
        XCTAssertNil(viewModel.previousTopicKey)
        XCTAssertNil(viewModel.currentFlatTopic)
    }
    
    // MARK: - QuizViewModel Tests
    
    @MainActor
    func testQuizViewModelInitialState() {
        let viewModel = QuizViewModel(curriculumId: "test", topicKey: "1-2")
        
        XCTAssertEqual(viewModel.curriculumId, "test")
        XCTAssertEqual(viewModel.topicKey, "1-2")
        XCTAssertEqual(viewModel.clusterIndex, 1)
        XCTAssertEqual(viewModel.topicIndex, 2)
        XCTAssertFalse(viewModel.forceNew)
        XCTAssertNil(viewModel.reviewVersion)
        XCTAssertFalse(viewModel.isReviewMode)
    }
    
    @MainActor
    func testQuizViewModelReviewMode() {
        let viewModel = QuizViewModel(curriculumId: "test", topicKey: "0-0", reviewVersion: 1)
        
        XCTAssertTrue(viewModel.isReviewMode)
        XCTAssertEqual(viewModel.reviewVersion, 1)
    }
    
    @MainActor
    func testQuizViewModelForceNew() {
        let viewModel = QuizViewModel(curriculumId: "test", topicKey: "0-0", forceNew: true)
        
        XCTAssertTrue(viewModel.forceNew)
        XCTAssertFalse(viewModel.isReviewMode)
    }
    
    @MainActor
    func testQuizViewModelAllAnswered() {
        let viewModel = QuizViewModel(curriculumId: "test", topicKey: "0-0")
        
        // Without quiz, should return false
        XCTAssertFalse(viewModel.allAnswered)
    }
    
    @MainActor
    func testQuizViewModelAnsweredCount() {
        let viewModel = QuizViewModel(curriculumId: "test", topicKey: "0-0")
        
        // Empty answers
        XCTAssertEqual(viewModel.answeredCount, 0)
    }
    
    @MainActor
    func testQuizViewModelSelectAnswer() {
        let viewModel = QuizViewModel(curriculumId: "test", topicKey: "0-0")
        
        // Set up mock quiz with 3 questions
        viewModel.answers = [-1, -1, -1]
        
        viewModel.selectAnswer(questionIndex: 1, optionIndex: 2)
        
        XCTAssertEqual(viewModel.answers[1], 2)
        XCTAssertEqual(viewModel.answeredCount, 1)
    }
    
    @MainActor
    func testQuizViewModelSelectAnswerInReviewMode() {
        let viewModel = QuizViewModel(curriculumId: "test", topicKey: "0-0", reviewVersion: 0)
        viewModel.answers = [-1, -1, -1]
        
        // Should not change answer in review mode
        viewModel.selectAnswer(questionIndex: 0, optionIndex: 1)
        
        XCTAssertEqual(viewModel.answers[0], -1)
    }
}
