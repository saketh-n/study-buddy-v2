"""
Tests for FastAPI API endpoints.
"""
import pytest
import json
from pathlib import Path
from unittest.mock import patch, MagicMock, AsyncMock
from fastapi.testclient import TestClient

from app.main import app
from app.models import Curriculum, Cluster, Topic, Lesson, LessonSection, Quiz, QuizQuestion


@pytest.fixture
def client(temp_storage_dir, monkeypatch, tmp_path):
    """Create a test client with mocked storage."""
    # Also mock content cache directory
    content_dir = tmp_path / "content"
    content_dir.mkdir()
    monkeypatch.setattr("app.content_cache.CONTENT_DIR", content_dir)
    
    return TestClient(app)


@pytest.fixture
def saved_curriculum(temp_storage_dir, sample_curriculum):
    """Save a curriculum and return its ID."""
    from app import storage
    return storage.save_curriculum(sample_curriculum)


class TestRootEndpoints:
    """Tests for root and health check endpoints."""
    
    def test_root(self, client):
        """Test root endpoint."""
        response = client.get("/")
        assert response.status_code == 200
        assert response.json() == {"message": "Study Buddy API is running"}
    
    def test_health_check(self, client):
        """Test health check endpoint."""
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json() == {"status": "healthy"}
    
    @patch.dict("os.environ", {"ANTHROPIC_API_KEY": "test-key-123"})
    def test_get_api_status_with_key(self, client):
        """Test API status endpoint when API key is present."""
        response = client.get("/api/status")
        assert response.status_code == 200
        assert response.json() == {"has_api_key": True}
    
    @patch.dict("os.environ", {}, clear=True)
    def test_get_api_status_without_key(self, client):
        """Test API status endpoint when API key is absent."""
        response = client.get("/api/status")
        assert response.status_code == 200
        assert response.json() == {"has_api_key": False}


class TestCurriculumEndpoints:
    """Tests for curriculum CRUD endpoints."""
    
    def test_list_curriculums_empty(self, client):
        """Test listing curriculums when none exist."""
        response = client.get("/api/curriculums")
        assert response.status_code == 200
        data = response.json()
        assert data["curriculums"] == []
    
    def test_list_curriculums(self, client, saved_curriculum):
        """Test listing curriculums."""
        response = client.get("/api/curriculums")
        assert response.status_code == 200
        data = response.json()
        assert len(data["curriculums"]) == 1
        assert data["curriculums"][0]["id"] == saved_curriculum
        assert data["curriculums"][0]["subject"] == "Data Structures and Algorithms"
    
    def test_get_curriculum(self, client, saved_curriculum):
        """Test getting a specific curriculum."""
        response = client.get(f"/api/curriculums/{saved_curriculum}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == saved_curriculum
        assert data["curriculum"]["subject"] == "Data Structures and Algorithms"
    
    def test_get_curriculum_not_found(self, client):
        """Test getting a non-existent curriculum."""
        response = client.get("/api/curriculums/nonexistent")
        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()
    
    def test_delete_curriculum(self, client, saved_curriculum):
        """Test deleting a curriculum."""
        response = client.delete(f"/api/curriculums/{saved_curriculum}")
        assert response.status_code == 200
        assert response.json()["success"] is True
        
        # Verify it's deleted
        response = client.get(f"/api/curriculums/{saved_curriculum}")
        assert response.status_code == 404
    
    def test_delete_curriculum_not_found(self, client):
        """Test deleting a non-existent curriculum."""
        response = client.delete("/api/curriculums/nonexistent")
        assert response.status_code == 404


class TestProgressEndpoints:
    """Tests for learning progress endpoints."""
    
    def test_get_progress_initializes_if_missing(self, client, saved_curriculum):
        """Test that getting progress initializes it if missing."""
        response = client.get(f"/api/curriculums/{saved_curriculum}/progress")
        assert response.status_code == 200
        data = response.json()
        assert data["curriculum_id"] == saved_curriculum
        assert data["topics"] == {}
    
    def test_start_learning(self, client, saved_curriculum):
        """Test starting to learn a curriculum."""
        response = client.post(f"/api/curriculums/{saved_curriculum}/progress/start")
        assert response.status_code == 200
        data = response.json()
        assert data["curriculum_id"] == saved_curriculum
        assert "started_at" in data
    
    def test_start_learning_not_found(self, client):
        """Test starting to learn a non-existent curriculum."""
        response = client.post("/api/curriculums/nonexistent/progress/start")
        assert response.status_code == 404


class TestContentStatusEndpoints:
    """Tests for content status endpoints."""
    
    def test_get_content_status(self, client, saved_curriculum):
        """Test getting content status."""
        response = client.get(f"/api/curriculums/{saved_curriculum}/content-status")
        assert response.status_code == 200
        data = response.json()
        assert "total_topics" in data
        assert "lessons_cached" in data
        assert "quizzes_cached" in data
        assert "ready" in data
        assert data["total_topics"] == 1  # One topic in sample curriculum
        assert data["lessons_cached"] == 0  # Nothing cached yet
    
    def test_get_content_status_not_found(self, client):
        """Test getting content status for non-existent curriculum."""
        response = client.get("/api/curriculums/nonexistent/content-status")
        assert response.status_code == 404


class TestLessonEndpoints:
    """Tests for lesson endpoints."""
    
    def test_generate_lesson_not_found(self, client):
        """Test generating a lesson for non-existent curriculum."""
        response = client.post(
            "/api/lesson",
            json={
                "curriculum_id": "nonexistent",
                "cluster_index": 0,
                "topic_index": 0
            }
        )
        assert response.status_code == 404
    
    @patch("app.learning.generate_lesson")
    def test_generate_lesson(self, mock_generate, client, saved_curriculum, sample_lesson):
        """Test generating a lesson."""
        mock_generate.return_value = sample_lesson
        
        response = client.post(
            "/api/lesson",
            json={
                "curriculum_id": saved_curriculum,
                "cluster_index": 0,
                "topic_index": 0
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["topic_name"] == "Binary Search"


class TestQuizEndpoints:
    """Tests for quiz endpoints."""
    
    def test_generate_quiz_not_found(self, client):
        """Test generating a quiz for non-existent curriculum."""
        response = client.post(
            "/api/quiz",
            json={
                "curriculum_id": "nonexistent",
                "cluster_index": 0,
                "topic_index": 0
            }
        )
        assert response.status_code == 404
    
    @patch("app.learning.generate_quiz")
    def test_generate_quiz(self, mock_generate, client, saved_curriculum, sample_quiz):
        """Test generating a quiz."""
        mock_generate.return_value = (sample_quiz, 0)
        
        response = client.post(
            "/api/quiz",
            json={
                "curriculum_id": saved_curriculum,
                "cluster_index": 0,
                "topic_index": 0
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["topic_name"] == "Binary Search"
        assert "version" in data
    
    @patch("app.learning.generate_quiz")
    def test_generate_new_quiz(self, mock_generate, client, saved_curriculum, sample_quiz):
        """Test force generating a new quiz."""
        mock_generate.return_value = (sample_quiz, 1)
        
        response = client.post(
            "/api/quiz/new",
            json={
                "curriculum_id": saved_curriculum,
                "cluster_index": 0,
                "topic_index": 0
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["version"] == 1
    
    def test_get_quiz_by_version_not_found(self, client, saved_curriculum):
        """Test getting a quiz version that doesn't exist."""
        response = client.get(
            f"/api/quiz/{saved_curriculum}/0/0/0"
        )
        assert response.status_code == 404
    
    @patch("app.content_cache.get_cached_quiz")
    def test_get_quiz_by_version(self, mock_get_quiz, client, saved_curriculum, sample_quiz):
        """Test getting a specific quiz version."""
        mock_get_quiz.return_value = sample_quiz
        
        response = client.get(
            f"/api/quiz/{saved_curriculum}/0/0/0"
        )
        assert response.status_code == 200
        data = response.json()
        assert data["topic_name"] == "Binary Search"
    
    def test_get_quiz_history_empty(self, client, saved_curriculum):
        """Test getting quiz history when no quizzes exist."""
        response = client.get(
            f"/api/history/quiz/{saved_curriculum}/0/0"
        )
        assert response.status_code == 200, response.text
        data = response.json()
        assert data["total_quizzes"] == 0
        assert data["history"] == []


class TestQuizSubmission:
    """Tests for quiz submission endpoints."""
    
    @patch("app.content_cache.get_cached_quiz")
    def test_submit_quiz_not_found(self, mock_get_quiz, client, saved_curriculum):
        """Test submitting to a non-existent quiz."""
        mock_get_quiz.return_value = None
        
        response = client.post(
            "/api/quiz/submit",
            json={
                "curriculum_id": saved_curriculum,
                "cluster_index": 0,
                "topic_index": 0,
                "answers": [0, 1, 0, 1, 0]
            }
        )
        assert response.status_code == 404
    
    @patch("app.content_cache.save_assessment")
    @patch("app.content_cache.get_quiz_count")
    @patch("app.content_cache.get_cached_quiz")
    @patch("app.learning.assess_quiz_answers")
    def test_submit_quiz_success(
        self, mock_assess, mock_get_quiz, mock_count, mock_save,
        client, saved_curriculum, sample_quiz
    ):
        """Test successful quiz submission."""
        mock_get_quiz.return_value = sample_quiz
        mock_count.return_value = 1
        mock_assess.return_value = {
            "score": 100,
            "passed": True,
            "correct_count": 2,
            "total_questions": 2,
            "quiz_version": 0,
            "question_feedback": [],
            "summary": {}
        }
        
        response = client.post(
            "/api/quiz/submit",
            json={
                "curriculum_id": saved_curriculum,
                "cluster_index": 0,
                "topic_index": 0,
                "answers": [1, 1],  # Both correct
                "use_ai_grading": True
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["score"] == 100
        assert data["passed"] is True
        # Verify AI grading was attempted
        mock_assess.assert_called_once()
    
    @patch("app.content_cache.save_assessment")
    @patch("app.content_cache.get_quiz_count")
    @patch("app.content_cache.get_cached_quiz")
    def test_submit_quiz_without_ai_grading(
        self, mock_get_quiz, mock_count, mock_save,
        client, saved_curriculum, sample_quiz
    ):
        """Test quiz submission without AI grading (uses fallback directly)."""
        mock_get_quiz.return_value = sample_quiz
        mock_count.return_value = 1
        
        response = client.post(
            "/api/quiz/submit",
            json={
                "curriculum_id": saved_curriculum,
                "cluster_index": 0,
                "topic_index": 0,
                "answers": [1, 1],  # Both correct
                "use_ai_grading": False
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["score"] == 100
        assert data["passed"] is True
        assert data["fallback_mode"] is True
    
    @patch("app.content_cache.save_assessment")
    @patch("app.content_cache.get_quiz_count")
    @patch("app.content_cache.get_cached_quiz")
    @patch("app.learning.assess_quiz_answers")
    def test_submit_quiz_with_ai_grading_fallback_on_error(
        self, mock_assess, mock_get_quiz, mock_count, mock_save,
        client, saved_curriculum, sample_quiz
    ):
        """Test quiz submission with AI grading that falls back on error."""
        mock_get_quiz.return_value = sample_quiz
        mock_count.return_value = 1
        mock_assess.side_effect = Exception("API error")
        
        response = client.post(
            "/api/quiz/submit",
            json={
                "curriculum_id": saved_curriculum,
                "cluster_index": 0,
                "topic_index": 0,
                "answers": [1, 1],  # Both correct
                "use_ai_grading": True
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["score"] == 100
        assert data["passed"] is True
        assert data["fallback_mode"] is True
        # Verify AI grading was attempted before fallback
        mock_assess.assert_called_once()


class TestAssessmentEndpoints:
    """Tests for assessment endpoints."""
    
    def test_get_assessments_empty(self, client, saved_curriculum):
        """Test getting assessments when none exist."""
        response = client.get(
            f"/api/assessments/{saved_curriculum}/0/0"
        )
        assert response.status_code == 200
        data = response.json()
        assert data["assessments"] == []


class TestParseStreamEndpoint:
    """Tests for the curriculum parsing stream endpoint."""
    
    def test_parse_empty_text(self, client):
        """Test parsing with empty text."""
        response = client.post(
            "/api/parse/stream",
            json={"raw_text": ""}
        )
        assert response.status_code == 400
    
    def test_parse_whitespace_text(self, client):
        """Test parsing with only whitespace."""
        response = client.post(
            "/api/parse/stream",
            json={"raw_text": "   "}
        )
        assert response.status_code == 400
