"""
Tests for the learning module with mocked LLM calls.
"""
import pytest
import json
from unittest.mock import patch, MagicMock, AsyncMock

from app import learning
from app.models import Lesson, Quiz, QuizQuestion


class TestParseJsonResponse:
    """Tests for the _parse_json_response helper function."""
    
    def test_parse_valid_json(self):
        """Test parsing valid JSON."""
        text = '{"key": "value", "number": 42}'
        result = learning._parse_json_response(text)
        assert result == {"key": "value", "number": 42}
    
    def test_parse_json_in_code_block(self):
        """Test parsing JSON wrapped in code block."""
        text = '''```json
{"topic_name": "Test", "questions": []}
```'''
        result = learning._parse_json_response(text)
        assert result == {"topic_name": "Test", "questions": []}
    
    def test_parse_json_in_code_block_no_language(self):
        """Test parsing JSON in code block without language specifier."""
        text = '''```
{"data": "test"}
```'''
        result = learning._parse_json_response(text)
        assert result == {"data": "test"}
    
    def test_parse_json_with_surrounding_text(self):
        """Test parsing JSON when surrounded by text."""
        text = '''Here is the response:
        ```json
        {"result": true}
        ```
        That's all!'''
        result = learning._parse_json_response(text)
        assert result == {"result": True}
    
    def test_parse_invalid_json_raises(self):
        """Test that invalid JSON raises ValueError."""
        text = "This is not JSON at all"
        with pytest.raises(ValueError, match="Failed to parse JSON"):
            learning._parse_json_response(text)


class TestGenerateLesson:
    """Tests for lesson generation."""
    
    @pytest.fixture
    def mock_curriculum_record(self, sample_curriculum):
        """Create a mock curriculum record."""
        return {
            "id": "test123",
            "curriculum": sample_curriculum.model_dump(),
            "created_at": "2024-01-01T00:00:00"
        }
    
    @pytest.mark.asyncio
    @patch("app.learning._call_llm")
    @patch("app.storage.get_curriculum")
    @patch("app.content_cache.get_cached_lesson")
    @patch("app.content_cache.save_lesson")
    async def test_generate_lesson_new(
        self, mock_save, mock_get_cached, mock_get_curriculum, mock_llm,
        mock_curriculum_record, mock_llm_lesson_response
    ):
        """Test generating a new lesson when not cached."""
        mock_get_cached.return_value = None
        mock_get_curriculum.return_value = mock_curriculum_record
        mock_llm.return_value = mock_llm_lesson_response
        
        lesson = await learning.generate_lesson("test123", 0, 0)
        
        assert lesson.topic_name == "Binary Search"
        assert len(lesson.sections) > 0
        mock_save.assert_called_once()
    
    @pytest.mark.asyncio
    @patch("app.content_cache.get_cached_lesson")
    async def test_generate_lesson_cached(self, mock_get_cached, sample_lesson):
        """Test that cached lesson is returned without LLM call."""
        mock_get_cached.return_value = sample_lesson
        
        lesson = await learning.generate_lesson("test123", 0, 0)
        
        assert lesson.topic_name == "Binary Search"
        mock_get_cached.assert_called_once()
    
    @pytest.mark.asyncio
    @patch("app.storage.get_curriculum")
    @patch("app.content_cache.get_cached_lesson")
    async def test_generate_lesson_curriculum_not_found(
        self, mock_get_cached, mock_get_curriculum
    ):
        """Test error when curriculum not found."""
        mock_get_cached.return_value = None
        mock_get_curriculum.return_value = None
        
        with pytest.raises(ValueError, match="Curriculum not found"):
            await learning.generate_lesson("nonexistent", 0, 0)


class TestGenerateQuiz:
    """Tests for quiz generation."""
    
    @pytest.fixture
    def mock_curriculum_record(self, sample_curriculum):
        """Create a mock curriculum record."""
        return {
            "id": "test123",
            "curriculum": sample_curriculum.model_dump(),
            "created_at": "2024-01-01T00:00:00"
        }
    
    @pytest.mark.asyncio
    @patch("app.learning._call_llm")
    @patch("app.storage.get_curriculum")
    @patch("app.content_cache.get_cached_quiz")
    @patch("app.content_cache.get_quiz_count")
    @patch("app.content_cache.save_quiz")
    async def test_generate_quiz_new(
        self, mock_save, mock_count, mock_get_cached, mock_get_curriculum, mock_llm,
        mock_curriculum_record, mock_llm_quiz_response
    ):
        """Test generating a new quiz when not cached."""
        mock_get_cached.return_value = None
        mock_get_curriculum.return_value = mock_curriculum_record
        mock_count.return_value = 0
        mock_llm.return_value = mock_llm_quiz_response
        mock_save.return_value = 0
        
        quiz, version = await learning.generate_quiz("test123", 0, 0)
        
        assert quiz.topic_name == "Binary Search"
        assert version == 0
        mock_save.assert_called_once()
    
    @pytest.mark.asyncio
    @patch("app.content_cache.get_cached_quiz")
    @patch("app.content_cache.get_quiz_count")
    async def test_generate_quiz_cached(
        self, mock_count, mock_get_cached, sample_quiz
    ):
        """Test that cached quiz is returned without LLM call."""
        mock_get_cached.return_value = sample_quiz
        mock_count.return_value = 1
        
        quiz, version = await learning.generate_quiz("test123", 0, 0)
        
        assert quiz.topic_name == "Binary Search"
        assert version == 0  # Count - 1
    
    @pytest.mark.asyncio
    @patch("app.learning._call_llm")
    @patch("app.storage.get_curriculum")
    @patch("app.content_cache.get_cached_quiz")
    @patch("app.content_cache.get_quiz_count")
    @patch("app.content_cache.save_quiz")
    async def test_generate_quiz_force_new(
        self, mock_save, mock_count, mock_get_cached, mock_get_curriculum, mock_llm,
        mock_curriculum_record, mock_llm_quiz_response
    ):
        """Test force generating a new quiz even when cached."""
        mock_get_cached.return_value = None  # Won't be called with force_new
        mock_get_curriculum.return_value = mock_curriculum_record
        mock_count.return_value = 1  # Already has one quiz
        mock_llm.return_value = mock_llm_quiz_response
        mock_save.return_value = 1
        
        quiz, version = await learning.generate_quiz("test123", 0, 0, force_new=True)
        
        assert quiz.topic_name == "Binary Search"
        assert version == 1
    
    @pytest.mark.asyncio
    @patch("app.storage.get_curriculum")
    @patch("app.content_cache.get_cached_quiz")
    async def test_generate_quiz_curriculum_not_found(
        self, mock_get_cached, mock_get_curriculum
    ):
        """Test error when curriculum not found."""
        mock_get_cached.return_value = None
        mock_get_curriculum.return_value = None
        
        with pytest.raises(ValueError, match="Curriculum not found"):
            await learning.generate_quiz("nonexistent", 0, 0)


class TestAssessQuizAnswers:
    """Tests for quiz assessment."""
    
    @pytest.fixture
    def mock_curriculum_record(self, sample_curriculum):
        """Create a mock curriculum record."""
        return {
            "id": "test123",
            "curriculum": sample_curriculum.model_dump(),
            "created_at": "2024-01-01T00:00:00"
        }
    
    @pytest.mark.asyncio
    @patch("app.learning._call_llm")
    @patch("app.storage.get_curriculum")
    @patch("app.content_cache.save_assessment")
    async def test_assess_quiz_answers(
        self, mock_save_assessment, mock_get_curriculum, mock_llm,
        mock_curriculum_record, sample_quiz
    ):
        """Test assessing quiz answers."""
        mock_get_curriculum.return_value = mock_curriculum_record
        mock_llm.return_value = json.dumps({
            "question_feedback": [
                {
                    "question_num": 1,
                    "is_correct": True,
                    "student_choice": "O(log n)",
                    "correct_answer": "O(log n)",
                    "analysis": "Good understanding",
                    "explanation": "Correct!"
                },
                {
                    "question_num": 2,
                    "is_correct": True,
                    "student_choice": "Sorted",
                    "correct_answer": "Sorted",
                    "analysis": "Good understanding",
                    "explanation": "Correct!"
                }
            ],
            "summary": {
                "misconceptions": [],
                "focus_areas": [],
                "encouragement": "Great job!",
                "recommendation": "Move on to the next topic"
            }
        })
        
        assessment = await learning.assess_quiz_answers(
            "test123", 0, 0, sample_quiz, 0, [1, 1]  # Both correct
        )
        
        assert assessment["score"] == 100
        assert assessment["passed"] is True
        assert assessment["correct_count"] == 2
        mock_save_assessment.assert_called_once()
    
    @pytest.mark.asyncio
    @patch("app.storage.get_curriculum")
    async def test_assess_quiz_curriculum_not_found(
        self, mock_get_curriculum, sample_quiz
    ):
        """Test error when curriculum not found."""
        mock_get_curriculum.return_value = None
        
        with pytest.raises(ValueError, match="Curriculum not found"):
            await learning.assess_quiz_answers(
                "nonexistent", 0, 0, sample_quiz, 0, [0, 0]
            )


class TestChatWithTutor:
    """Tests for the AI tutor chat functionality."""
    
    @pytest.fixture
    def mock_curriculum_record(self, sample_curriculum):
        """Create a mock curriculum record."""
        return {
            "id": "test123",
            "curriculum": sample_curriculum.model_dump(),
            "created_at": "2024-01-01T00:00:00"
        }
    
    @pytest.mark.asyncio
    @patch("app.learning._call_llm")
    @patch("app.storage.get_curriculum")
    @patch("app.content_cache.get_chat_history")
    @patch("app.content_cache.append_chat_message")
    async def test_chat_with_tutor(
        self, mock_append, mock_get_history, mock_get_curriculum, mock_llm,
        mock_curriculum_record
    ):
        """Test chatting with the tutor."""
        mock_get_curriculum.return_value = mock_curriculum_record
        mock_get_history.return_value = []
        mock_llm.return_value = "Here's my helpful response!"
        mock_append.side_effect = [
            [{"role": "user", "content": "Hello"}],
            [
                {"role": "user", "content": "Hello"},
                {"role": "assistant", "content": "Here's my helpful response!"}
            ]
        ]
        
        response, history = await learning.chat_with_tutor(
            "test123", 0, 0, "Hello"
        )
        
        assert response == "Here's my helpful response!"
        assert len(history) == 2
    
    @pytest.mark.asyncio
    @patch("app.learning._call_llm")
    @patch("app.storage.get_curriculum")
    @patch("app.content_cache.get_chat_history")
    @patch("app.content_cache.append_chat_message")
    async def test_chat_with_tutor_with_context(
        self, mock_append, mock_get_history, mock_get_curriculum, mock_llm,
        mock_curriculum_record
    ):
        """Test chatting with highlighted context."""
        mock_get_curriculum.return_value = mock_curriculum_record
        mock_get_history.return_value = []
        mock_llm.return_value = "Let me explain that highlighted part..."
        mock_append.side_effect = [
            [{"role": "user", "content": "What does this mean?"}],
            [
                {"role": "user", "content": "What does this mean?"},
                {"role": "assistant", "content": "Let me explain that highlighted part..."}
            ]
        ]
        
        response, history = await learning.chat_with_tutor(
            "test123", 0, 0,
            "What does this mean?",
            highlighted_context="Binary search divides in half"
        )
        
        assert "explain" in response.lower()
    
    @pytest.mark.asyncio
    @patch("app.storage.get_curriculum")
    async def test_chat_with_tutor_curriculum_not_found(
        self, mock_get_curriculum
    ):
        """Test error when curriculum not found."""
        mock_get_curriculum.return_value = None
        
        with pytest.raises(ValueError, match="Curriculum not found"):
            await learning.chat_with_tutor(
                "nonexistent", 0, 0, "Hello"
            )


class TestGetChatHistory:
    """Tests for getting chat history."""
    
    @patch("app.content_cache.get_chat_history")
    def test_get_chat_history(self, mock_get_history):
        """Test getting chat history."""
        mock_get_history.return_value = [
            {"role": "user", "content": "Hello"},
            {"role": "assistant", "content": "Hi there!"}
        ]
        
        history = learning.get_chat_history("test123", 0, 0)
        
        assert len(history) == 2
        assert history[0]["role"] == "user"
    
    @patch("app.content_cache.get_chat_history")
    def test_get_chat_history_empty(self, mock_get_history):
        """Test getting empty chat history."""
        mock_get_history.return_value = []
        
        history = learning.get_chat_history("test123", 0, 0)
        
        assert history == []


class TestLLMCalls:
    """Tests for the LLM call wrapper functions."""
    
    @pytest.mark.asyncio
    @patch("app.learning.client")
    async def test_call_llm_async(self, mock_client):
        """Test the async LLM call wrapper."""
        mock_response = MagicMock()
        mock_response.content = [MagicMock(text='{"result": "success"}')]
        mock_client.messages.create.return_value = mock_response
        
        result = await learning._call_llm([{"role": "user", "content": "test"}])
        
        assert result == '{"result": "success"}'
    
    @patch("app.learning.client")
    def test_call_llm_sync(self, mock_client):
        """Test the sync LLM call function."""
        mock_response = MagicMock()
        mock_response.content = [MagicMock(text='{"test": true}')]
        mock_client.messages.create.return_value = mock_response
        
        result = learning._call_llm_sync(
            [{"role": "user", "content": "test"}],
            system="You are a helpful assistant"
        )
        
        assert result == '{"test": true}'
        mock_client.messages.create.assert_called_once()
