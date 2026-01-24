"""
Tests for storage and content_cache modules.
"""
import pytest
import json
from pathlib import Path
from datetime import datetime
from unittest.mock import patch

from app.models import Curriculum, Cluster, Topic, Lesson, LessonSection, Quiz, QuizQuestion
from app import storage
from app import content_cache


class TestStorageModule:
    """Tests for the storage module (curriculums and progress)."""
    
    def test_ensure_storage_exists(self, temp_storage_dir):
        """Test that storage directories are created."""
        storage._ensure_storage_exists()
        assert temp_storage_dir.exists()
        assert (temp_storage_dir / "curriculums.json").exists()
        assert (temp_storage_dir / "progress.json").exists()
    
    def test_save_curriculum(self, temp_storage_dir, sample_curriculum):
        """Test saving a curriculum."""
        curriculum_id = storage.save_curriculum(sample_curriculum)
        
        assert curriculum_id is not None
        assert len(curriculum_id) == 8  # UUID first 8 chars
        
        # Verify it was saved
        all_curriculums = storage._load_all()
        assert len(all_curriculums) == 1
        assert all_curriculums[0]["id"] == curriculum_id
        assert all_curriculums[0]["curriculum"]["subject"] == "Data Structures and Algorithms"
    
    def test_get_curriculum(self, temp_storage_dir, sample_curriculum):
        """Test retrieving a curriculum by ID."""
        curriculum_id = storage.save_curriculum(sample_curriculum)
        
        record = storage.get_curriculum(curriculum_id)
        assert record is not None
        assert record["id"] == curriculum_id
        assert record["curriculum"]["subject"] == "Data Structures and Algorithms"
    
    def test_get_curriculum_not_found(self, temp_storage_dir):
        """Test retrieving a non-existent curriculum."""
        record = storage.get_curriculum("nonexistent")
        assert record is None
    
    def test_list_curriculums(self, temp_storage_dir, sample_curriculum):
        """Test listing all curriculums."""
        # Save multiple curriculums
        id1 = storage.save_curriculum(sample_curriculum)
        
        curriculum2 = Curriculum(
            subject="Machine Learning",
            description="ML basics",
            clusters=[
                Cluster(
                    name="Supervised Learning",
                    description="Supervised methods",
                    order=1,
                    topics=[
                        Topic(name="Linear Regression", description="Regression", order=1),
                        Topic(name="Classification", description="Classification", order=2)
                    ]
                )
            ]
        )
        id2 = storage.save_curriculum(curriculum2)
        
        summaries = storage.list_curriculums()
        assert len(summaries) == 2
        
        # Check first curriculum (most recent, so id2)
        assert summaries[0]["id"] == id2
        assert summaries[0]["subject"] == "Machine Learning"
        assert summaries[0]["topic_count"] == 2
        
        # Check second curriculum
        assert summaries[1]["id"] == id1
        assert summaries[1]["subject"] == "Data Structures and Algorithms"
    
    def test_delete_curriculum(self, temp_storage_dir, sample_curriculum):
        """Test deleting a curriculum."""
        curriculum_id = storage.save_curriculum(sample_curriculum)
        
        # Verify it exists
        assert storage.get_curriculum(curriculum_id) is not None
        
        # Delete it
        success = storage.delete_curriculum(curriculum_id)
        assert success is True
        
        # Verify it's gone
        assert storage.get_curriculum(curriculum_id) is None
    
    def test_delete_curriculum_not_found(self, temp_storage_dir):
        """Test deleting a non-existent curriculum."""
        success = storage.delete_curriculum("nonexistent")
        assert success is False
    
    def test_init_learning_progress(self, temp_storage_dir, sample_curriculum):
        """Test initializing learning progress."""
        curriculum_id = storage.save_curriculum(sample_curriculum)
        
        progress = storage.init_learning_progress(curriculum_id)
        
        assert progress["curriculum_id"] == curriculum_id
        assert progress["topics"] == {}
        assert "started_at" in progress
        assert "last_activity" in progress
    
    def test_get_learning_progress(self, temp_storage_dir, sample_curriculum):
        """Test retrieving learning progress."""
        curriculum_id = storage.save_curriculum(sample_curriculum)
        
        # No progress initially
        progress = storage.get_learning_progress(curriculum_id)
        assert progress is None
        
        # Initialize progress
        storage.init_learning_progress(curriculum_id)
        
        # Now should exist
        progress = storage.get_learning_progress(curriculum_id)
        assert progress is not None
        assert progress["curriculum_id"] == curriculum_id
    
    def test_update_topic_progress(self, temp_storage_dir, sample_curriculum):
        """Test updating topic progress."""
        curriculum_id = storage.save_curriculum(sample_curriculum)
        storage.init_learning_progress(curriculum_id)
        
        # Update progress
        progress = storage.update_topic_progress(
            curriculum_id,
            cluster_index=0,
            topic_index=0,
            completed=True,
            quiz_score=85
        )
        
        topic_key = "0-0"
        assert topic_key in progress["topics"]
        assert progress["topics"][topic_key]["completed"] is True
        assert progress["topics"][topic_key]["quiz_score"] == 85
        assert progress["topics"][topic_key]["completed_at"] is not None
    
    def test_update_topic_progress_creates_if_missing(self, temp_storage_dir, sample_curriculum):
        """Test that update_topic_progress creates progress if it doesn't exist."""
        curriculum_id = storage.save_curriculum(sample_curriculum)
        
        # Don't initialize progress first
        progress = storage.update_topic_progress(
            curriculum_id,
            cluster_index=0,
            topic_index=0,
            completed=True,
            quiz_score=90
        )
        
        assert progress is not None
        assert "0-0" in progress["topics"]
    
    def test_list_curriculums_with_progress(self, temp_storage_dir, sample_curriculum):
        """Test that list_curriculums includes completed topics count."""
        curriculum_id = storage.save_curriculum(sample_curriculum)
        storage.init_learning_progress(curriculum_id)
        storage.update_topic_progress(curriculum_id, 0, 0, completed=True, quiz_score=100)
        
        summaries = storage.list_curriculums()
        assert len(summaries) == 1
        assert summaries[0]["completed_topics"] == 1


class TestContentCacheModule:
    """Tests for the content_cache module."""
    
    @pytest.fixture
    def temp_content_dir(self, monkeypatch, tmp_path):
        """Create a temporary content directory."""
        content_dir = tmp_path / "content"
        content_dir.mkdir()
        monkeypatch.setattr("app.content_cache.CONTENT_DIR", content_dir)
        return content_dir
    
    def test_save_and_get_lesson(self, temp_content_dir, sample_lesson):
        """Test saving and retrieving a lesson."""
        curriculum_id = "test123"
        
        # Save lesson
        content_cache.save_lesson(curriculum_id, 0, 0, sample_lesson)
        
        # Verify file exists
        lesson_path = temp_content_dir / curriculum_id / "lessons" / "0-0.json"
        assert lesson_path.exists()
        
        # Retrieve lesson
        cached_lesson = content_cache.get_cached_lesson(curriculum_id, 0, 0)
        assert cached_lesson is not None
        assert cached_lesson.topic_name == "Binary Search"
    
    def test_get_cached_lesson_not_found(self, temp_content_dir):
        """Test getting a non-existent lesson."""
        lesson = content_cache.get_cached_lesson("nonexistent", 0, 0)
        assert lesson is None
    
    def test_save_and_get_quiz(self, temp_content_dir, sample_quiz):
        """Test saving and retrieving a quiz."""
        curriculum_id = "test123"
        
        # Save quiz
        version = content_cache.save_quiz(curriculum_id, 0, 0, sample_quiz)
        assert version == 0
        
        # Verify file exists
        quiz_path = temp_content_dir / curriculum_id / "quizzes" / "0-0" / "quiz_0.json"
        assert quiz_path.exists()
        
        # Retrieve quiz
        cached_quiz = content_cache.get_cached_quiz(curriculum_id, 0, 0)
        assert cached_quiz is not None
        assert cached_quiz.topic_name == "Binary Search"
        assert len(cached_quiz.questions) == 2
    
    def test_save_multiple_quizzes(self, temp_content_dir, sample_quiz):
        """Test saving multiple quiz versions."""
        curriculum_id = "test123"
        
        # Save first quiz
        version1 = content_cache.save_quiz(curriculum_id, 0, 0, sample_quiz)
        assert version1 == 0
        
        # Save second quiz
        version2 = content_cache.save_quiz(curriculum_id, 0, 0, sample_quiz)
        assert version2 == 1
        
        # Check count
        count = content_cache.get_quiz_count(curriculum_id, 0, 0)
        assert count == 2
    
    def test_get_quiz_by_version(self, temp_content_dir, sample_quiz):
        """Test retrieving specific quiz version."""
        curriculum_id = "test123"
        
        content_cache.save_quiz(curriculum_id, 0, 0, sample_quiz)
        content_cache.save_quiz(curriculum_id, 0, 0, sample_quiz)
        
        # Get specific version
        quiz_v0 = content_cache.get_cached_quiz(curriculum_id, 0, 0, version=0)
        assert quiz_v0 is not None
        
        quiz_v1 = content_cache.get_cached_quiz(curriculum_id, 0, 0, version=1)
        assert quiz_v1 is not None
        
        # Latest version
        latest = content_cache.get_cached_quiz(curriculum_id, 0, 0, version=-1)
        assert latest is not None
    
    def test_get_quiz_count_empty(self, temp_content_dir):
        """Test quiz count when none exist."""
        count = content_cache.get_quiz_count("nonexistent", 0, 0)
        assert count == 0
    
    def test_save_and_get_assessment(self, temp_content_dir):
        """Test saving and retrieving assessments."""
        curriculum_id = "test123"
        assessment = {
            "score": 80,
            "passed": True,
            "quiz_version": 0,
            "question_feedback": []
        }
        
        # Save assessment
        content_cache.save_assessment(curriculum_id, 0, 0, quiz_version=0, assessment=assessment)
        
        # Verify directory exists
        assessment_dir = temp_content_dir / curriculum_id / "assessments" / "0-0"
        assert assessment_dir.exists()
        assert len(list(assessment_dir.glob("quiz_*.json"))) == 1
        
        # Get assessments
        assessments = content_cache.get_assessments(curriculum_id, 0, 0)
        assert len(assessments) == 1
        assert assessments[0]["score"] == 80
    
    def test_get_assessments_empty(self, temp_content_dir):
        """Test getting assessments when none exist."""
        assessments = content_cache.get_assessments("nonexistent", 0, 0)
        assert assessments == []
    
    def test_chat_history(self, temp_content_dir):
        """Test saving and retrieving chat history."""
        curriculum_id = "test123"
        
        # Initially empty
        history = content_cache.get_chat_history(curriculum_id, 0, 0)
        assert history == []
        
        # Append messages
        history = content_cache.append_chat_message(
            curriculum_id, 0, 0,
            {"role": "user", "content": "Hello!"}
        )
        assert len(history) == 1
        
        history = content_cache.append_chat_message(
            curriculum_id, 0, 0,
            {"role": "assistant", "content": "Hi there!"}
        )
        assert len(history) == 2
        
        # Retrieve history
        history = content_cache.get_chat_history(curriculum_id, 0, 0)
        assert len(history) == 2
        assert history[0]["role"] == "user"
        assert history[1]["role"] == "assistant"
    
    def test_save_chat_history_directly(self, temp_content_dir):
        """Test saving chat history directly."""
        curriculum_id = "test123"
        messages = [
            {"role": "user", "content": "Question"},
            {"role": "assistant", "content": "Answer"}
        ]
        
        content_cache.save_chat_history(curriculum_id, 0, 0, messages)
        
        history = content_cache.get_chat_history(curriculum_id, 0, 0)
        assert len(history) == 2
    
    def test_delete_curriculum_content(self, temp_content_dir, sample_lesson, sample_quiz):
        """Test deleting all content for a curriculum."""
        curriculum_id = "test123"
        
        # Create some content
        content_cache.save_lesson(curriculum_id, 0, 0, sample_lesson)
        content_cache.save_quiz(curriculum_id, 0, 0, sample_quiz)
        content_cache.append_chat_message(
            curriculum_id, 0, 0,
            {"role": "user", "content": "test"}
        )
        
        # Verify content exists
        curriculum_dir = temp_content_dir / curriculum_id
        assert curriculum_dir.exists()
        
        # Delete content
        content_cache.delete_curriculum_content(curriculum_id)
        
        # Verify deleted
        assert not curriculum_dir.exists()
    
    def test_delete_curriculum_content_nonexistent(self, temp_content_dir):
        """Test deleting content for non-existent curriculum (should not raise)."""
        # Should not raise any errors
        content_cache.delete_curriculum_content("nonexistent")


class TestStorageFileOperations:
    """Tests for file operation edge cases."""
    
    def test_load_all_empty_file(self, temp_storage_dir):
        """Test loading from an empty file."""
        storage._ensure_storage_exists()
        (temp_storage_dir / "curriculums.json").write_text("[]")
        
        curriculums = storage._load_all()
        assert curriculums == []
    
    def test_load_all_corrupted_file(self, temp_storage_dir):
        """Test loading from a corrupted file."""
        storage._ensure_storage_exists()
        (temp_storage_dir / "curriculums.json").write_text("not valid json")
        
        curriculums = storage._load_all()
        assert curriculums == []
    
    def test_load_progress_corrupted_file(self, temp_storage_dir):
        """Test loading progress from a corrupted file."""
        storage._ensure_storage_exists()
        (temp_storage_dir / "progress.json").write_text("invalid json")
        
        progress = storage._load_progress()
        assert progress == {}
