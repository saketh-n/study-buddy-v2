"""
Cache for lesson plans, quizzes, and assessments per curriculum.

Storage structure:
backend/data/content/<curriculum_id>/
├── lessons/
│   └── <cluster_idx>-<topic_idx>.json
├── quizzes/
│   └── <cluster_idx>-<topic_idx>/
│       ├── quiz_0.json  (original quiz)
│       ├── quiz_1.json  (retry quiz)
│       └── ...
└── assessments/
    └── <cluster_idx>-<topic_idx>/
        └── <quiz_version>_<timestamp>.json
"""

import json
import logging
from pathlib import Path
from typing import Optional
from datetime import datetime
from .models import Lesson, Quiz

logger = logging.getLogger(__name__)

STORAGE_DIR = Path(__file__).parent.parent / "data"
CONTENT_DIR = STORAGE_DIR / "content"


def _get_curriculum_dir(curriculum_id: str) -> Path:
    """Get the content directory for a specific curriculum."""
    return CONTENT_DIR / curriculum_id


def _get_lesson_path(curriculum_id: str, cluster_index: int, topic_index: int) -> Path:
    """Get the path to a cached lesson file."""
    return _get_curriculum_dir(curriculum_id) / "lessons" / f"{cluster_index}-{topic_index}.json"


def _get_quiz_dir(curriculum_id: str, cluster_index: int, topic_index: int) -> Path:
    """Get the directory for quizzes for a topic."""
    return _get_curriculum_dir(curriculum_id) / "quizzes" / f"{cluster_index}-{topic_index}"


def _get_assessment_dir(curriculum_id: str, cluster_index: int, topic_index: int) -> Path:
    """Get the directory for quiz assessments."""
    return _get_curriculum_dir(curriculum_id) / "assessments" / f"{cluster_index}-{topic_index}"


# ============ Lessons ============

def get_cached_lesson(curriculum_id: str, cluster_index: int, topic_index: int) -> Optional[Lesson]:
    """Retrieve a cached lesson if it exists."""
    path = _get_lesson_path(curriculum_id, cluster_index, topic_index)
    
    if path.exists():
        try:
            data = json.loads(path.read_text())
            logger.info(f"📦 Loaded cached lesson: {curriculum_id}/{cluster_index}-{topic_index}")
            return Lesson(**data)
        except (json.JSONDecodeError, Exception) as e:
            logger.warning(f"Failed to load cached lesson: {e}")
    
    return None


def save_lesson(curriculum_id: str, cluster_index: int, topic_index: int, lesson: Lesson) -> None:
    """Save a lesson to the cache."""
    path = _get_lesson_path(curriculum_id, cluster_index, topic_index)
    path.parent.mkdir(parents=True, exist_ok=True)
    
    path.write_text(json.dumps(lesson.model_dump(), indent=2))
    logger.info(f"💾 Cached lesson: {curriculum_id}/{cluster_index}-{topic_index}")


# ============ Quizzes ============

def get_quiz_count(curriculum_id: str, cluster_index: int, topic_index: int) -> int:
    """Get the number of quizzes generated for a topic."""
    quiz_dir = _get_quiz_dir(curriculum_id, cluster_index, topic_index)
    if not quiz_dir.exists():
        return 0
    return len(list(quiz_dir.glob("quiz_*.json")))


def get_cached_quiz(curriculum_id: str, cluster_index: int, topic_index: int, version: int = -1) -> Optional[Quiz]:
    """
    Retrieve a cached quiz. 
    version=-1 returns the latest quiz, otherwise returns the specific version.
    """
    quiz_dir = _get_quiz_dir(curriculum_id, cluster_index, topic_index)
    
    if not quiz_dir.exists():
        return None
    
    if version == -1:
        # Get latest quiz
        quiz_files = sorted(quiz_dir.glob("quiz_*.json"))
        if not quiz_files:
            return None
        path = quiz_files[-1]
    else:
        path = quiz_dir / f"quiz_{version}.json"
        if not path.exists():
            return None
    
    try:
        data = json.loads(path.read_text())
        logger.info(f"📦 Loaded cached quiz: {path.stem}")
        return Quiz(**data)
    except (json.JSONDecodeError, Exception) as e:
        logger.warning(f"Failed to load cached quiz: {e}")
    
    return None


def save_quiz(curriculum_id: str, cluster_index: int, topic_index: int, quiz: Quiz) -> int:
    """Save a quiz to the cache. Returns the version number."""
    quiz_dir = _get_quiz_dir(curriculum_id, cluster_index, topic_index)
    quiz_dir.mkdir(parents=True, exist_ok=True)
    
    version = get_quiz_count(curriculum_id, cluster_index, topic_index)
    path = quiz_dir / f"quiz_{version}.json"
    
    path.write_text(json.dumps(quiz.model_dump(), indent=2))
    logger.info(f"💾 Cached quiz v{version}: {curriculum_id}/{cluster_index}-{topic_index}")
    
    return version


# ============ Assessments ============

def save_assessment(
    curriculum_id: str, 
    cluster_index: int, 
    topic_index: int,
    quiz_version: int,
    assessment: dict
) -> None:
    """Save a quiz assessment."""
    assessment_dir = _get_assessment_dir(curriculum_id, cluster_index, topic_index)
    assessment_dir.mkdir(parents=True, exist_ok=True)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    path = assessment_dir / f"quiz_{quiz_version}_{timestamp}.json"
    
    path.write_text(json.dumps(assessment, indent=2))
    logger.info(f"💾 Saved assessment for quiz v{quiz_version}")


def get_assessments(curriculum_id: str, cluster_index: int, topic_index: int) -> list[dict]:
    """Get all assessments for a topic, newest first."""
    assessment_dir = _get_assessment_dir(curriculum_id, cluster_index, topic_index)
    
    if not assessment_dir.exists():
        return []
    
    assessments = []
    for path in sorted(assessment_dir.glob("quiz_*.json"), reverse=True):
        try:
            data = json.loads(path.read_text())
            # Ensure quiz_version is present (extract from filename if not in data)
            # Filename format: quiz_{version}_{timestamp}.json
            if "quiz_version" not in data:
                filename = path.stem  # e.g., "quiz_0_20241205_120000"
                parts = filename.split("_")
                if len(parts) >= 2 and parts[0] == "quiz":
                    try:
                        data["quiz_version"] = int(parts[1])
                    except ValueError:
                        data["quiz_version"] = 0
            assessments.append(data)
        except:
            pass
    
    return assessments


# ============ Cleanup ============

def delete_curriculum_content(curriculum_id: str) -> None:
    """Delete all cached content for a curriculum."""
    import shutil
    
    curriculum_dir = _get_curriculum_dir(curriculum_id)
    if curriculum_dir.exists():
        shutil.rmtree(curriculum_dir)
        logger.info(f"🗑️ Deleted cached content for: {curriculum_id}")
