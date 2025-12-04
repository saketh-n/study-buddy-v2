import json
import logging
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional
from .models import Curriculum, LearningProgress, TopicProgress

logger = logging.getLogger(__name__)

# Storage file paths
STORAGE_DIR = Path(__file__).parent.parent / "data"
STORAGE_FILE = STORAGE_DIR / "curriculums.json"
PROGRESS_FILE = STORAGE_DIR / "progress.json"


def _ensure_storage_exists():
    """Ensure storage directory and file exist"""
    STORAGE_DIR.mkdir(exist_ok=True)
    if not STORAGE_FILE.exists():
        STORAGE_FILE.write_text("[]")
    if not PROGRESS_FILE.exists():
        PROGRESS_FILE.write_text("{}")


def _load_all() -> list[dict]:
    """Load all curriculums from storage"""
    _ensure_storage_exists()
    try:
        return json.loads(STORAGE_FILE.read_text())
    except (json.JSONDecodeError, FileNotFoundError):
        return []


def _save_all(data: list[dict]):
    """Save all curriculums to storage"""
    _ensure_storage_exists()
    STORAGE_FILE.write_text(json.dumps(data, indent=2))


def _load_progress() -> dict:
    """Load all progress data"""
    _ensure_storage_exists()
    try:
        return json.loads(PROGRESS_FILE.read_text())
    except (json.JSONDecodeError, FileNotFoundError):
        return {}


def _save_progress(data: dict):
    """Save all progress data"""
    _ensure_storage_exists()
    PROGRESS_FILE.write_text(json.dumps(data, indent=2))


def save_curriculum(curriculum: Curriculum) -> str:
    """
    Save a curriculum and return its ID.
    """
    curriculum_id = str(uuid.uuid4())[:8]
    
    record = {
        "id": curriculum_id,
        "created_at": datetime.now().isoformat(),
        "curriculum": curriculum.model_dump()
    }
    
    all_curriculums = _load_all()
    all_curriculums.insert(0, record)  # Add to beginning (newest first)
    _save_all(all_curriculums)
    
    logger.info(f"💾 Saved curriculum '{curriculum.subject}' with ID: {curriculum_id}")
    return curriculum_id


def get_curriculum(curriculum_id: str) -> Optional[dict]:
    """
    Get a curriculum by ID.
    """
    all_curriculums = _load_all()
    for record in all_curriculums:
        if record["id"] == curriculum_id:
            return record
    return None


def list_curriculums() -> list[dict]:
    """
    List all saved curriculums (summary info only).
    """
    all_curriculums = _load_all()
    summaries = []
    
    for record in all_curriculums:
        curriculum = record["curriculum"]
        total_topics = sum(len(c["topics"]) for c in curriculum["clusters"])
        
        # Get progress info
        progress = get_learning_progress(record["id"])
        completed_topics = 0
        if progress:
            completed_topics = sum(1 for t in progress.get("topics", {}).values() if t.get("completed"))
        
        summaries.append({
            "id": record["id"],
            "created_at": record["created_at"],
            "subject": curriculum["subject"],
            "description": curriculum["description"],
            "cluster_count": len(curriculum["clusters"]),
            "topic_count": total_topics,
            "completed_topics": completed_topics
        })
    
    return summaries


def delete_curriculum(curriculum_id: str) -> bool:
    """
    Delete a curriculum by ID.
    """
    from . import content_cache
    
    all_curriculums = _load_all()
    original_length = len(all_curriculums)
    
    all_curriculums = [c for c in all_curriculums if c["id"] != curriculum_id]
    
    if len(all_curriculums) < original_length:
        _save_all(all_curriculums)
        # Also delete progress
        all_progress = _load_progress()
        if curriculum_id in all_progress:
            del all_progress[curriculum_id]
            _save_progress(all_progress)
        # Delete cached lessons/quizzes
        content_cache.delete_curriculum_content(curriculum_id)
        logger.info(f"🗑️ Deleted curriculum with ID: {curriculum_id}")
        return True
    
    return False


# ============ Learning Progress ============

def get_learning_progress(curriculum_id: str) -> Optional[dict]:
    """Get learning progress for a curriculum."""
    all_progress = _load_progress()
    return all_progress.get(curriculum_id)


def init_learning_progress(curriculum_id: str) -> dict:
    """Initialize learning progress for a curriculum."""
    all_progress = _load_progress()
    
    if curriculum_id not in all_progress:
        now = datetime.now().isoformat()
        all_progress[curriculum_id] = {
            "curriculum_id": curriculum_id,
            "topics": {},
            "started_at": now,
            "last_activity": now
        }
        _save_progress(all_progress)
        logger.info(f"🎓 Started learning: {curriculum_id}")
    
    return all_progress[curriculum_id]


def update_topic_progress(
    curriculum_id: str,
    cluster_index: int,
    topic_index: int,
    completed: bool,
    quiz_score: Optional[int] = None
) -> dict:
    """Update progress for a specific topic."""
    all_progress = _load_progress()
    
    if curriculum_id not in all_progress:
        init_learning_progress(curriculum_id)
        all_progress = _load_progress()
    
    topic_key = f"{cluster_index}-{topic_index}"
    now = datetime.now().isoformat()
    
    all_progress[curriculum_id]["topics"][topic_key] = {
        "completed": completed,
        "quiz_score": quiz_score,
        "completed_at": now if completed else None
    }
    all_progress[curriculum_id]["last_activity"] = now
    
    _save_progress(all_progress)
    
    if completed:
        logger.info(f"✅ Topic completed: {curriculum_id} - {topic_key} (score: {quiz_score}%)")
    
    return all_progress[curriculum_id]
