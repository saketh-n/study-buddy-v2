import json
import logging
import asyncio
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from concurrent.futures import ThreadPoolExecutor

from .models import (
    ParseRequest, Curriculum, LessonRequest, QuizRequest, 
    QuizSubmission, TutorRequest
)
from .curriculum_parser import parse_curriculum_with_progress
from . import storage
from . import learning
from . import content_cache

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s | %(levelname)s | %(message)s',
    datefmt='%H:%M:%S'
)
logger = logging.getLogger(__name__)

# Thread pool for CPU-bound parsing work
_executor = ThreadPoolExecutor(max_workers=2)

app = FastAPI(
    title="Study Buddy API",
    description="API for parsing learning topics into structured curricula",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Study Buddy API is running"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


# ============ Curriculum Parsing ============

async def generate_progress_events(raw_text: str):
    """Generator for SSE progress events - runs parsing in thread to not block."""
    logger.info(f"🚀 New curriculum request received ({len(raw_text)} chars)")
    
    loop = asyncio.get_event_loop()
    
    # Run the generator in a thread-safe way
    def run_parser():
        return list(parse_curriculum_with_progress(raw_text))
    
    updates = await loop.run_in_executor(_executor, run_parser)
    
    for update in updates:
        if update.get("status") == "complete" and update.get("curriculum"):
            curriculum = Curriculum(**update["curriculum"])
            saved_id = storage.save_curriculum(curriculum)
            update["saved_id"] = saved_id
        
        event_data = json.dumps(update)
        yield f"data: {event_data}\n\n"
    
    logger.info(f"📡 SSE stream completed")


@app.post("/api/parse/stream")
async def parse_topics_stream(request: ParseRequest):
    """Parse raw text into a structured curriculum with SSE progress."""
    if not request.raw_text.strip():
        raise HTTPException(status_code=400, detail="Raw text cannot be empty")
    
    return StreamingResponse(
        generate_progress_events(request.raw_text),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"}
    )


# ============ Curriculum Storage ============

@app.get("/api/curriculums")
async def list_curriculums():
    """List all saved curriculums with summary info."""
    return {"curriculums": storage.list_curriculums()}


@app.get("/api/curriculums/{curriculum_id}")
async def get_curriculum(curriculum_id: str):
    """Get a specific curriculum by ID."""
    record = storage.get_curriculum(curriculum_id)
    if not record:
        raise HTTPException(status_code=404, detail="Curriculum not found")
    return record


@app.delete("/api/curriculums/{curriculum_id}")
async def delete_curriculum(curriculum_id: str):
    """Delete a curriculum by ID."""
    success = storage.delete_curriculum(curriculum_id)
    if not success:
        raise HTTPException(status_code=404, detail="Curriculum not found")
    return {"success": True, "message": "Curriculum deleted"}


# ============ Learning Progress ============

@app.get("/api/curriculums/{curriculum_id}/progress")
async def get_progress(curriculum_id: str):
    """Get learning progress for a curriculum."""
    progress = storage.get_learning_progress(curriculum_id)
    if not progress:
        progress = storage.init_learning_progress(curriculum_id)
    return progress


@app.post("/api/curriculums/{curriculum_id}/progress/start")
async def start_learning(curriculum_id: str):
    """Start learning a curriculum."""
    record = storage.get_curriculum(curriculum_id)
    if not record:
        raise HTTPException(status_code=404, detail="Curriculum not found")
    
    progress = storage.init_learning_progress(curriculum_id)
    return progress


# ============ Lessons ============

@app.post("/api/lesson")
async def generate_lesson_endpoint(request: LessonRequest):
    """Generate an AI lesson for a specific topic (cached)."""
    try:
        lesson = await learning.generate_lesson(
            request.curriculum_id,
            request.cluster_index,
            request.topic_index
        )
        return lesson.model_dump()
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"❌ Lesson generation error: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate lesson")


# ============ Quizzes ============

@app.post("/api/quiz")
async def generate_quiz_endpoint(request: QuizRequest):
    """Generate a quiz for a specific topic (cached)."""
    try:
        quiz, version = await learning.generate_quiz(
            request.curriculum_id,
            request.cluster_index,
            request.topic_index
        )
        return {
            **quiz.model_dump(),
            "version": version
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"❌ Quiz generation error: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate quiz")


@app.post("/api/quiz/new")
async def generate_new_quiz_endpoint(request: QuizRequest):
    """Force generate a new quiz (for retries after failure)."""
    try:
        quiz, version = await learning.generate_quiz(
            request.curriculum_id,
            request.cluster_index,
            request.topic_index,
            force_new=True
        )
        return {
            **quiz.model_dump(),
            "version": version
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"❌ Quiz generation error: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate quiz")


@app.get("/api/quiz/{curriculum_id}/{cluster_index}/{topic_index}/{version}")
async def get_quiz_by_version(curriculum_id: str, cluster_index: int, topic_index: int, version: int):
    """Get a specific quiz version."""
    quiz = content_cache.get_cached_quiz(curriculum_id, cluster_index, topic_index, version)
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    return {
        **quiz.model_dump(),
        "version": version
    }


@app.post("/api/quiz/submit")
async def submit_quiz(submission: QuizSubmission):
    """Submit quiz answers and get AI-powered assessment."""
    try:
        # Get the quiz (latest version or specific version if provided)
        quiz = content_cache.get_cached_quiz(
            submission.curriculum_id,
            submission.cluster_index,
            submission.topic_index
        )
        
        if not quiz:
            raise HTTPException(status_code=404, detail="Quiz not found")
        
        quiz_version = content_cache.get_quiz_count(
            submission.curriculum_id,
            submission.cluster_index,
            submission.topic_index
        ) - 1
        
        # Get AI assessment
        assessment = await learning.assess_quiz_answers(
            submission.curriculum_id,
            submission.cluster_index,
            submission.topic_index,
            quiz,
            quiz_version,
            submission.answers
        )
        
        # Update progress if passed
        if assessment["passed"]:
            storage.update_topic_progress(
                submission.curriculum_id,
                submission.cluster_index,
                submission.topic_index,
                completed=True,
                quiz_score=assessment["score"]
            )
        
        return assessment
        
    except Exception as e:
        logger.error(f"❌ Quiz submission error: {e}")
        raise HTTPException(status_code=500, detail="Failed to assess quiz")


@app.get("/api/assessments/{curriculum_id}/{cluster_index}/{topic_index}")
async def get_assessments(curriculum_id: str, cluster_index: int, topic_index: int):
    """Get all quiz assessments for a topic."""
    return {"assessments": content_cache.get_assessments(curriculum_id, cluster_index, topic_index)}


@app.get("/api/quiz/history/{curriculum_id}/{cluster_index}/{topic_index}")
async def get_quiz_history(curriculum_id: str, cluster_index: int, topic_index: int):
    """Get quiz history including all versions and assessments for a topic."""
    quiz_count = content_cache.get_quiz_count(curriculum_id, cluster_index, topic_index)
    assessments = content_cache.get_assessments(curriculum_id, cluster_index, topic_index)
    
    # Build history with quiz versions and their assessments
    history = []
    for version in range(quiz_count):
        quiz = content_cache.get_cached_quiz(curriculum_id, cluster_index, topic_index, version)
        if quiz:
            # Find assessments for this quiz version
            version_assessments = [a for a in assessments if a.get("quiz_version") == version]
            history.append({
                "version": version,
                "quiz": quiz.model_dump(),
                "assessments": version_assessments
            })
    
    return {
        "total_quizzes": quiz_count,
        "history": history
    }


# ============ AI Tutor ============

@app.get("/api/chat/{curriculum_id}/{cluster_index}/{topic_index}")
async def get_chat_history(curriculum_id: str, cluster_index: int, topic_index: int):
    """Get chat history for a topic."""
    history = learning.get_chat_history(curriculum_id, cluster_index, topic_index)
    return {"messages": history}


@app.post("/api/tutor")
async def chat_with_tutor(request: TutorRequest):
    """Chat with the AI tutor about a topic."""
    try:
        response, history = await learning.chat_with_tutor(
            request.curriculum_id,
            request.cluster_index,
            request.topic_index,
            request.message,
            request.highlighted_context
        )
        return {
            "response": response,
            "history": history
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"❌ Tutor error: {e}")
        raise HTTPException(status_code=500, detail="Failed to get tutor response")
