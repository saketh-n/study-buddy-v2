"""
Tests for Pydantic models.
"""
import pytest
from pydantic import ValidationError

from app.models import (
    Topic, Cluster, Curriculum, ParseRequest, ParseResponse,
    LessonSection, Lesson, QuizQuestion, Quiz,
    LessonRequest, QuizRequest, QuizSubmission, QuizResult,
    TopicProgress, LearningProgress, ChatMessage, TutorRequest
)


class TestTopicModel:
    """Tests for the Topic model."""
    
    def test_valid_topic(self):
        """Test creating a valid topic."""
        topic = Topic(
            name="Arrays",
            description="Introduction to arrays",
            order=1,
            prerequisites=[]
        )
        assert topic.name == "Arrays"
        assert topic.description == "Introduction to arrays"
        assert topic.order == 1
        assert topic.prerequisites == []
    
    def test_topic_with_prerequisites(self):
        """Test topic with prerequisites."""
        topic = Topic(
            name="Dynamic Programming",
            description="Advanced problem-solving technique",
            order=5,
            prerequisites=["Recursion", "Arrays"]
        )
        assert len(topic.prerequisites) == 2
        assert "Recursion" in topic.prerequisites
    
    def test_topic_default_prerequisites(self):
        """Test that prerequisites defaults to empty list."""
        topic = Topic(
            name="Basics",
            description="Basic concepts",
            order=1
        )
        assert topic.prerequisites == []
    
    def test_topic_missing_required_field(self):
        """Test that missing required fields raise validation error."""
        with pytest.raises(ValidationError):
            Topic(name="Test", order=1)  # Missing description
    
    def test_topic_invalid_order_type(self):
        """Test that invalid order type raises validation error."""
        with pytest.raises(ValidationError):
            Topic(
                name="Test",
                description="Test description",
                order="not a number"
            )


class TestClusterModel:
    """Tests for the Cluster model."""
    
    def test_valid_cluster(self, sample_topic):
        """Test creating a valid cluster."""
        cluster = Cluster(
            name="Fundamentals",
            description="Core concepts",
            order=1,
            topics=[sample_topic]
        )
        assert cluster.name == "Fundamentals"
        assert len(cluster.topics) == 1
        assert cluster.topics[0].name == "Binary Search"
    
    def test_cluster_multiple_topics(self):
        """Test cluster with multiple topics."""
        topics = [
            Topic(name="Topic 1", description="Desc 1", order=1),
            Topic(name="Topic 2", description="Desc 2", order=2),
            Topic(name="Topic 3", description="Desc 3", order=3),
        ]
        cluster = Cluster(
            name="Multi-Topic Cluster",
            description="Has many topics",
            order=1,
            topics=topics
        )
        assert len(cluster.topics) == 3
    
    def test_cluster_empty_topics(self):
        """Test cluster with empty topics list."""
        cluster = Cluster(
            name="Empty Cluster",
            description="No topics yet",
            order=1,
            topics=[]
        )
        assert cluster.topics == []


class TestCurriculumModel:
    """Tests for the Curriculum model."""
    
    def test_valid_curriculum(self, sample_cluster):
        """Test creating a valid curriculum."""
        curriculum = Curriculum(
            subject="Computer Science",
            description="Intro to CS",
            clusters=[sample_cluster]
        )
        assert curriculum.subject == "Computer Science"
        assert len(curriculum.clusters) == 1
    
    def test_curriculum_multiple_clusters(self, sample_topic):
        """Test curriculum with multiple clusters."""
        clusters = [
            Cluster(name="Cluster 1", description="Desc 1", order=1, topics=[sample_topic]),
            Cluster(name="Cluster 2", description="Desc 2", order=2, topics=[sample_topic]),
        ]
        curriculum = Curriculum(
            subject="Advanced Topics",
            description="Advanced curriculum",
            clusters=clusters
        )
        assert len(curriculum.clusters) == 2


class TestLessonModels:
    """Tests for Lesson-related models."""
    
    def test_lesson_section(self):
        """Test LessonSection model."""
        section = LessonSection(
            title="Introduction",
            content="This is the content",
            key_points=["Point 1", "Point 2"]
        )
        assert section.title == "Introduction"
        assert len(section.key_points) == 2
    
    def test_lesson_section_empty_key_points(self):
        """Test LessonSection with default empty key_points."""
        section = LessonSection(
            title="Simple Section",
            content="Content here"
        )
        assert section.key_points == []
    
    def test_valid_lesson(self):
        """Test creating a valid Lesson."""
        lesson = Lesson(
            topic_name="Test Topic",
            introduction="Intro text",
            sections=[
                LessonSection(title="Section 1", content="Content 1")
            ],
            summary="Summary text",
            estimated_time_minutes=20
        )
        assert lesson.topic_name == "Test Topic"
        assert lesson.estimated_time_minutes == 20
    
    def test_lesson_request(self):
        """Test LessonRequest model."""
        request = LessonRequest(
            curriculum_id="abc123",
            cluster_index=0,
            topic_index=1
        )
        assert request.curriculum_id == "abc123"
        assert request.cluster_index == 0
        assert request.topic_index == 1


class TestQuizModels:
    """Tests for Quiz-related models."""
    
    def test_quiz_question(self):
        """Test QuizQuestion model."""
        question = QuizQuestion(
            question="What is 2+2?",
            options=["3", "4", "5", "6"],
            correct_index=1,
            explanation="Basic math"
        )
        assert question.question == "What is 2+2?"
        assert len(question.options) == 4
        assert question.correct_index == 1
    
    def test_quiz(self):
        """Test Quiz model."""
        quiz = Quiz(
            topic_name="Math Basics",
            questions=[
                QuizQuestion(
                    question="Q1",
                    options=["A", "B", "C", "D"],
                    correct_index=0,
                    explanation="Explanation"
                )
            ],
            passing_score=70
        )
        assert quiz.topic_name == "Math Basics"
        assert quiz.passing_score == 70
    
    def test_quiz_default_passing_score(self):
        """Test Quiz default passing score."""
        quiz = Quiz(
            topic_name="Test",
            questions=[]
        )
        assert quiz.passing_score == 80
    
    def test_quiz_request(self):
        """Test QuizRequest model."""
        request = QuizRequest(
            curriculum_id="xyz789",
            cluster_index=1,
            topic_index=2
        )
        assert request.curriculum_id == "xyz789"
    
    def test_quiz_submission(self):
        """Test QuizSubmission model."""
        submission = QuizSubmission(
            curriculum_id="abc123",
            cluster_index=0,
            topic_index=0,
            answers=[1, 2, 0, 3, 1]
        )
        assert len(submission.answers) == 5
    
    def test_quiz_result(self):
        """Test QuizResult model."""
        result = QuizResult(
            score=80,
            passed=True,
            correct_count=4,
            total_questions=5,
            feedback=["Good job!", "Review this concept"]
        )
        assert result.passed is True
        assert result.score == 80


class TestProgressModels:
    """Tests for progress-related models."""
    
    def test_topic_progress_defaults(self):
        """Test TopicProgress default values."""
        progress = TopicProgress()
        assert progress.completed is False
        assert progress.quiz_score is None
        assert progress.completed_at is None
    
    def test_topic_progress_completed(self):
        """Test completed TopicProgress."""
        progress = TopicProgress(
            completed=True,
            quiz_score=95,
            completed_at="2024-01-15T10:30:00"
        )
        assert progress.completed is True
        assert progress.quiz_score == 95
    
    def test_learning_progress(self):
        """Test LearningProgress model."""
        progress = LearningProgress(
            curriculum_id="abc123",
            topics={
                "0-0": TopicProgress(completed=True, quiz_score=90),
                "0-1": TopicProgress(completed=False)
            },
            started_at="2024-01-01T00:00:00",
            last_activity="2024-01-15T10:30:00"
        )
        assert progress.curriculum_id == "abc123"
        assert len(progress.topics) == 2


class TestChatModels:
    """Tests for chat-related models."""
    
    def test_chat_message(self):
        """Test ChatMessage model."""
        message = ChatMessage(
            role="user",
            content="Hello, can you explain this?"
        )
        assert message.role == "user"
        assert "explain" in message.content
    
    def test_tutor_request(self):
        """Test TutorRequest model."""
        request = TutorRequest(
            curriculum_id="abc123",
            cluster_index=0,
            topic_index=0,
            message="Help me understand this concept"
        )
        assert request.curriculum_id == "abc123"
        assert request.highlighted_context == ""
    
    def test_tutor_request_with_context(self):
        """Test TutorRequest with highlighted context."""
        request = TutorRequest(
            curriculum_id="abc123",
            cluster_index=0,
            topic_index=0,
            message="What does this mean?",
            highlighted_context="Binary search divides the array in half"
        )
        assert request.highlighted_context == "Binary search divides the array in half"


class TestParseModels:
    """Tests for parse-related models."""
    
    def test_parse_request(self):
        """Test ParseRequest model."""
        request = ParseRequest(raw_text="Learn Python programming")
        assert request.raw_text == "Learn Python programming"
    
    def test_parse_response_success(self, sample_curriculum):
        """Test successful ParseResponse."""
        response = ParseResponse(
            curriculum=sample_curriculum,
            success=True
        )
        assert response.success is True
        assert response.curriculum is not None
        assert response.error is None
    
    def test_parse_response_error(self):
        """Test error ParseResponse."""
        response = ParseResponse(
            curriculum=None,
            success=False,
            error="Failed to parse curriculum"
        )
        assert response.success is False
        assert response.error == "Failed to parse curriculum"
