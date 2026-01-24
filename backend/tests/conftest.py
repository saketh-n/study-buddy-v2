"""
Shared fixtures for backend tests.
"""
import pytest
import tempfile
import shutil
from pathlib import Path
from unittest.mock import MagicMock, AsyncMock, patch
import sys

# Add the app directory to the path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.models import (
    Topic, Cluster, Curriculum, Lesson, LessonSection,
    Quiz, QuizQuestion, LearningProgress, TopicProgress
)


@pytest.fixture
def sample_topic():
    """Create a sample topic for testing."""
    return Topic(
        name="Binary Search",
        description="An efficient algorithm for finding items in sorted arrays",
        order=1,
        prerequisites=[]
    )


@pytest.fixture
def sample_cluster(sample_topic):
    """Create a sample cluster for testing."""
    return Cluster(
        name="Search Algorithms",
        description="Fundamental searching techniques",
        order=1,
        topics=[sample_topic]
    )


@pytest.fixture
def sample_curriculum(sample_cluster):
    """Create a sample curriculum for testing."""
    return Curriculum(
        subject="Data Structures and Algorithms",
        description="A comprehensive guide to DSA",
        clusters=[sample_cluster]
    )


@pytest.fixture
def sample_lesson():
    """Create a sample lesson for testing."""
    return Lesson(
        topic_name="Binary Search",
        introduction="Binary search is a fundamental algorithm...",
        sections=[
            LessonSection(
                title="How Binary Search Works",
                content="Binary search works by repeatedly dividing the search interval in half...",
                key_points=["O(log n) time complexity", "Requires sorted array"]
            )
        ],
        summary="Binary search is efficient for sorted data.",
        estimated_time_minutes=15
    )


@pytest.fixture
def sample_quiz():
    """Create a sample quiz for testing."""
    return Quiz(
        topic_name="Binary Search",
        questions=[
            QuizQuestion(
                question="What is the time complexity of binary search?",
                options=["O(n)", "O(log n)", "O(n^2)", "O(1)"],
                correct_index=1,
                explanation="Binary search halves the search space each iteration."
            ),
            QuizQuestion(
                question="Binary search requires the array to be:",
                options=["Empty", "Sorted", "Reversed", "Random"],
                correct_index=1,
                explanation="Binary search only works on sorted arrays."
            )
        ],
        passing_score=80
    )


@pytest.fixture
def temp_storage_dir(monkeypatch):
    """Create a temporary directory for storage tests."""
    temp_dir = tempfile.mkdtemp()
    temp_path = Path(temp_dir)
    
    # Patch the storage module paths
    monkeypatch.setattr("app.storage.STORAGE_DIR", temp_path)
    monkeypatch.setattr("app.storage.STORAGE_FILE", temp_path / "curriculums.json")
    monkeypatch.setattr("app.storage.PROGRESS_FILE", temp_path / "progress.json")
    
    yield temp_path
    
    # Cleanup
    shutil.rmtree(temp_dir, ignore_errors=True)


@pytest.fixture
def temp_cache_dir(monkeypatch):
    """Create a temporary directory for content cache tests."""
    temp_dir = tempfile.mkdtemp()
    temp_path = Path(temp_dir)
    
    # Patch the content_cache module path
    monkeypatch.setattr("app.content_cache.CACHE_DIR", temp_path)
    
    yield temp_path
    
    # Cleanup
    shutil.rmtree(temp_dir, ignore_errors=True)


@pytest.fixture
def mock_anthropic_client():
    """Create a mock Anthropic client for testing."""
    mock_client = MagicMock()
    mock_response = MagicMock()
    mock_response.content = [MagicMock(text='{"test": "response"}')]
    mock_client.messages.create.return_value = mock_response
    return mock_client


@pytest.fixture
def mock_llm_lesson_response():
    """Mock LLM response for lesson generation."""
    return '''{
        "topic_name": "Binary Search",
        "introduction": "Binary search is a powerful algorithm...",
        "sections": [
            {
                "title": "Understanding the Problem",
                "content": "When searching through sorted data...",
                "key_points": ["Efficiency matters", "Sorted data required"]
            }
        ],
        "summary": "Binary search provides efficient searching.",
        "estimated_time_minutes": 15
    }'''


@pytest.fixture
def mock_llm_quiz_response():
    """Mock LLM response for quiz generation."""
    return '''{
        "topic_name": "Binary Search",
        "questions": [
            {
                "question": "What is binary search?",
                "options": ["A", "B", "C", "D"],
                "correct_index": 0,
                "explanation": "Explanation here"
            }
        ]
    }'''


# Configure pytest-asyncio
pytest_plugins = ('pytest_asyncio',)
