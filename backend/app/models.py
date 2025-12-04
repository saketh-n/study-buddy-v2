from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class Topic(BaseModel):
    """A single topic within a cluster"""
    name: str
    description: str
    order: int  # Learning order within the cluster
    prerequisites: List[str] = []  # Topics that should be learned first


class Cluster(BaseModel):
    """A cluster of related topics"""
    name: str
    description: str
    order: int  # Learning order among clusters
    topics: List[Topic]


class Curriculum(BaseModel):
    """The full curriculum structure"""
    subject: str
    description: str
    clusters: List[Cluster]


class ParseRequest(BaseModel):
    """Request to parse raw text into curriculum"""
    raw_text: str


class ParseResponse(BaseModel):
    """Response containing the parsed curriculum"""
    curriculum: Optional[Curriculum] = None
    success: bool
    error: Optional[str] = None


# ============ Learning Models ============

class LessonSection(BaseModel):
    """A section within a lesson"""
    title: str
    content: str
    key_points: List[str] = []


class Lesson(BaseModel):
    """AI-generated lesson for a topic"""
    topic_name: str
    introduction: str
    sections: List[LessonSection]
    summary: str
    estimated_time_minutes: int


class QuizQuestion(BaseModel):
    """A single quiz question"""
    question: str
    options: List[str]
    correct_index: int
    explanation: str


class Quiz(BaseModel):
    """Quiz for a topic"""
    topic_name: str
    questions: List[QuizQuestion]
    passing_score: int = 80  # Percentage needed to pass


class LessonRequest(BaseModel):
    """Request to generate a lesson"""
    curriculum_id: str
    cluster_index: int
    topic_index: int


class QuizRequest(BaseModel):
    """Request to generate a quiz"""
    curriculum_id: str
    cluster_index: int
    topic_index: int


class QuizSubmission(BaseModel):
    """User's quiz answers"""
    curriculum_id: str
    cluster_index: int
    topic_index: int
    answers: List[int]  # Index of selected answer for each question


class QuizResult(BaseModel):
    """Result of a quiz attempt"""
    score: int  # Percentage
    passed: bool
    correct_count: int
    total_questions: int
    feedback: List[str]  # Feedback for each question


class TopicProgress(BaseModel):
    """Progress for a single topic"""
    completed: bool = False
    quiz_score: Optional[int] = None
    completed_at: Optional[str] = None


class LearningProgress(BaseModel):
    """Learning progress for a curriculum"""
    curriculum_id: str
    topics: dict[str, TopicProgress] = {}  # key: "cluster_index-topic_index"
    started_at: str
    last_activity: str


class ChatMessage(BaseModel):
    """A chat message for the AI tutor"""
    role: str  # "user" or "assistant"
    content: str


class TutorRequest(BaseModel):
    """Request to the AI tutor"""
    curriculum_id: str
    cluster_index: int
    topic_index: int
    message: str
    history: List[ChatMessage] = []
    highlighted_context: str = ""  # Optional highlighted text for context
