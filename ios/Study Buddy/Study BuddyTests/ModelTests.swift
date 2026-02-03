import XCTest
@testable import Study_Buddy

final class ModelTests: XCTestCase {
    
    // MARK: - TopicKey Tests
    
    func testTopicKeyMake() {
        let key = TopicKey.make(clusterIndex: 2, topicIndex: 3)
        XCTAssertEqual(key, "2-3")
    }
    
    func testTopicKeyParse() {
        let result = TopicKey.parse("2-3")
        XCTAssertNotNil(result)
        XCTAssertEqual(result?.clusterIndex, 2)
        XCTAssertEqual(result?.topicIndex, 3)
    }
    
    func testTopicKeyParseInvalid() {
        XCTAssertNil(TopicKey.parse("invalid"))
        XCTAssertNil(TopicKey.parse(""))
        XCTAssertNil(TopicKey.parse("1-2-3"))
    }
    
    // MARK: - Topic Tests
    
    func testTopicDecoding() throws {
        let json = """
        {
            "name": "Introduction",
            "description": "Getting started",
            "order": 0,
            "prerequisites": ["basics"]
        }
        """
        
        let topic = try JSONDecoder().decode(Topic.self, from: json.data(using: .utf8)!)
        
        XCTAssertEqual(topic.name, "Introduction")
        XCTAssertEqual(topic.description, "Getting started")
        XCTAssertEqual(topic.order, 0)
        XCTAssertEqual(topic.prerequisites, ["basics"])
    }
    
    func testTopicEncoding() throws {
        let topic = Topic(name: "Test", description: "Description", order: 1, prerequisites: [])
        
        let data = try JSONEncoder().encode(topic)
        let decoded = try JSONDecoder().decode(Topic.self, from: data)
        
        XCTAssertEqual(topic, decoded)
    }
    
    // MARK: - Cluster Tests
    
    func testClusterDecoding() throws {
        let json = """
        {
            "name": "Basics",
            "description": "Basic concepts",
            "order": 0,
            "topics": []
        }
        """
        
        let cluster = try JSONDecoder().decode(Cluster.self, from: json.data(using: .utf8)!)
        
        XCTAssertEqual(cluster.name, "Basics")
        XCTAssertEqual(cluster.description, "Basic concepts")
        XCTAssertEqual(cluster.order, 0)
        XCTAssertTrue(cluster.topics.isEmpty)
    }
    
    // MARK: - Curriculum Tests
    
    func testCurriculumFlattenTopics() {
        let curriculum = Curriculum(
            subject: "Swift",
            description: "Learn Swift",
            clusters: [
                Cluster(
                    name: "Basics",
                    description: "Basic concepts",
                    order: 0,
                    topics: [
                        Topic(name: "Variables", description: "Learn variables", order: 0, prerequisites: []),
                        Topic(name: "Constants", description: "Learn constants", order: 1, prerequisites: [])
                    ]
                ),
                Cluster(
                    name: "Advanced",
                    description: "Advanced concepts",
                    order: 1,
                    topics: [
                        Topic(name: "Closures", description: "Learn closures", order: 0, prerequisites: [])
                    ]
                )
            ]
        )
        
        let flatTopics = curriculum.flattenTopics()
        
        XCTAssertEqual(flatTopics.count, 3)
        XCTAssertEqual(flatTopics[0].topic.name, "Variables")
        XCTAssertEqual(flatTopics[0].topicKey, "0-0")
        XCTAssertEqual(flatTopics[0].globalIndex, 0)
        XCTAssertEqual(flatTopics[1].topic.name, "Constants")
        XCTAssertEqual(flatTopics[1].topicKey, "0-1")
        XCTAssertEqual(flatTopics[2].topic.name, "Closures")
        XCTAssertEqual(flatTopics[2].topicKey, "1-0")
    }
    
    func testCurriculumTotalTopics() {
        let curriculum = Curriculum(
            subject: "Test",
            description: "Test",
            clusters: [
                Cluster(name: "C1", description: "", order: 0, topics: [
                    Topic(name: "T1", description: "", order: 0, prerequisites: []),
                    Topic(name: "T2", description: "", order: 1, prerequisites: [])
                ]),
                Cluster(name: "C2", description: "", order: 1, topics: [
                    Topic(name: "T3", description: "", order: 0, prerequisites: [])
                ])
            ]
        )
        
        XCTAssertEqual(curriculum.totalTopics, 3)
    }
    
    // MARK: - Lesson Tests
    
    func testLessonDecoding() throws {
        let json = """
        {
            "topic_name": "Introduction",
            "introduction": "Welcome",
            "sections": [
                {
                    "title": "Section 1",
                    "content": "Content here",
                    "key_points": ["Point 1", "Point 2"]
                }
            ],
            "summary": "In summary...",
            "estimated_time_minutes": 15
        }
        """
        
        let lesson = try JSONDecoder().decode(Lesson.self, from: json.data(using: .utf8)!)
        
        XCTAssertEqual(lesson.topicName, "Introduction")
        XCTAssertEqual(lesson.introduction, "Welcome")
        XCTAssertEqual(lesson.sections.count, 1)
        XCTAssertEqual(lesson.sections[0].keyPoints.count, 2)
        XCTAssertEqual(lesson.summary, "In summary...")
        XCTAssertEqual(lesson.estimatedTimeMinutes, 15)
    }
    
    func testLessonFormattedTime() {
        let shortLesson = Lesson(
            topicName: "Test",
            introduction: "",
            sections: [],
            summary: "",
            estimatedTimeMinutes: 30
        )
        XCTAssertEqual(shortLesson.formattedTime, "30 min")
        
        let hourLesson = Lesson(
            topicName: "Test",
            introduction: "",
            sections: [],
            summary: "",
            estimatedTimeMinutes: 60
        )
        XCTAssertEqual(hourLesson.formattedTime, "1 hr")
        
        let longLesson = Lesson(
            topicName: "Test",
            introduction: "",
            sections: [],
            summary: "",
            estimatedTimeMinutes: 90
        )
        XCTAssertEqual(longLesson.formattedTime, "1 hr 30 min")
    }
    
    // MARK: - Quiz Tests
    
    func testQuizDecoding() throws {
        let json = """
        {
            "topic_name": "Variables",
            "questions": [
                {
                    "question": "What is var?",
                    "options": ["Variable", "Constant", "Function", "Class"],
                    "correct_index": 0,
                    "explanation": "var declares a variable"
                }
            ],
            "passing_score": 80,
            "version": 0
        }
        """
        
        let quiz = try JSONDecoder().decode(Quiz.self, from: json.data(using: .utf8)!)
        
        XCTAssertEqual(quiz.topicName, "Variables")
        XCTAssertEqual(quiz.questions.count, 1)
        XCTAssertEqual(quiz.questions[0].correctIndex, 0)
        XCTAssertEqual(quiz.passingScore, 80)
        XCTAssertEqual(quiz.version, 0)
    }
    
    func testQuizDefaultPassingScore() throws {
        let json = """
        {
            "topic_name": "Test",
            "questions": []
        }
        """
        
        let quiz = try JSONDecoder().decode(Quiz.self, from: json.data(using: .utf8)!)
        XCTAssertEqual(quiz.passingScore, 80)
    }
    
    // MARK: - LearningProgress Tests
    
    func testLearningProgressDecoding() throws {
        let json = """
        {
            "curriculum_id": "abc123",
            "topics": {
                "0-0": {
                    "completed": true,
                    "quiz_score": 85,
                    "completed_at": "2024-01-01T00:00:00Z"
                },
                "0-1": {
                    "completed": false,
                    "quiz_score": null,
                    "completed_at": null
                }
            },
            "started_at": "2024-01-01T00:00:00Z",
            "last_activity": "2024-01-02T00:00:00Z"
        }
        """
        
        let progress = try JSONDecoder().decode(LearningProgress.self, from: json.data(using: .utf8)!)
        
        XCTAssertEqual(progress.curriculumId, "abc123")
        XCTAssertTrue(progress.isTopicCompleted(clusterIndex: 0, topicIndex: 0))
        XCTAssertFalse(progress.isTopicCompleted(clusterIndex: 0, topicIndex: 1))
        XCTAssertEqual(progress.getQuizScore(clusterIndex: 0, topicIndex: 0), 85)
        XCTAssertNil(progress.getQuizScore(clusterIndex: 0, topicIndex: 1))
        XCTAssertEqual(progress.completedCount, 1)
    }
    
    // MARK: - QuizAssessment Tests
    
    func testQuizAssessmentDecoding() throws {
        let json = """
        {
            "score": 80,
            "passed": true,
            "correct_count": 4,
            "total_questions": 5,
            "quiz_version": 0,
            "question_feedback": [],
            "summary": {
                "misconceptions": [],
                "focus_areas": [],
                "encouragement": "Great job!",
                "recommendation": "Continue"
            }
        }
        """
        
        let assessment = try JSONDecoder().decode(QuizAssessment.self, from: json.data(using: .utf8)!)
        
        XCTAssertEqual(assessment.score, 80)
        XCTAssertTrue(assessment.passed)
        XCTAssertEqual(assessment.correctCount, 4)
        XCTAssertEqual(assessment.formattedScore, "80%")
        XCTAssertEqual(assessment.scoreFraction, "4/5")
        XCTAssertTrue(assessment.usedAiGrading)
    }
    
    func testQuizAssessmentFallbackMode() throws {
        let json = """
        {
            "score": 60,
            "passed": false,
            "correct_count": 3,
            "total_questions": 5,
            "quiz_version": 0,
            "question_feedback": [],
            "summary": {
                "misconceptions": [],
                "focus_areas": [],
                "encouragement": "",
                "recommendation": ""
            },
            "fallback_mode": true
        }
        """
        
        let assessment = try JSONDecoder().decode(QuizAssessment.self, from: json.data(using: .utf8)!)
        
        XCTAssertFalse(assessment.usedAiGrading)
    }
    
    // MARK: - CurriculumSummary Tests
    
    func testCurriculumSummaryDecoding() throws {
        let json = """
        {
            "id": "abc123",
            "created_at": "2024-01-01T00:00:00Z",
            "subject": "Swift Programming",
            "description": "Learn Swift",
            "cluster_count": 3,
            "topic_count": 10,
            "completed_topics": 5
        }
        """
        
        let summary = try JSONDecoder().decode(CurriculumSummary.self, from: json.data(using: .utf8)!)
        
        XCTAssertEqual(summary.id, "abc123")
        XCTAssertEqual(summary.subject, "Swift Programming")
        XCTAssertEqual(summary.clusterCount, 3)
        XCTAssertEqual(summary.topicCount, 10)
        XCTAssertEqual(summary.completedTopics, 5)
        XCTAssertFalse(summary.isDownloaded)
    }
}
