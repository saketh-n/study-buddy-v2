import json
import logging
import asyncio
import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from concurrent.futures import ThreadPoolExecutor

from .models import (
    ParseRequest, Curriculum, LessonRequest, QuizRequest, 
    QuizSubmission
)
from .curriculum_parser import parse_curriculum_with_progress
from . import storage
from . import learning
from . import content_cache

# Load environment variables
load_dotenv()

# CORS Configuration
# Default origins for frontend development
DEFAULT_FRONTEND_PORT = "5173"
frontend_port = os.getenv("FRONTEND_PORT", DEFAULT_FRONTEND_PORT).strip()

# Allow custom origins via environment variable (comma-separated)
# Example: ALLOWED_ORIGINS=http://localhost:5173,http://192.168.50.81:5173,*
custom_origins = os.getenv("ALLOWED_ORIGINS", "").strip()

if custom_origins:
    # Use custom origins if provided
    ALLOWED_ORIGINS = [o.strip() for o in custom_origins.split(",") if o.strip()]
else:
    # Default to localhost origins for development
    ALLOWED_ORIGINS = [
        f"http://localhost:{frontend_port}",
        f"http://127.0.0.1:{frontend_port}",
    ]

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
# Supports LAN access for iOS testing and cloud deployment
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
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


@app.get("/api/status")
async def get_api_status():
    """Return API status including whether AI features are available."""
    import os
    has_api_key = bool(os.environ.get("ANTHROPIC_API_KEY"))
    return {"has_api_key": has_api_key}


# ============ Curriculum Parsing ============

async def generate_progress_events(raw_text: str):
    """Generator for SSE progress events."""
    logger.info(f"🚀 New curriculum request received ({len(raw_text)} chars)")
    
    # Remove all the executor code - just use async for directly
    async for update in parse_curriculum_with_progress(raw_text):
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


# ============ Content Preparation ============

@app.get("/api/curriculums/{curriculum_id}/content-status")
async def get_content_status(curriculum_id: str):
    """Check what content is already cached for a curriculum."""
    record = storage.get_curriculum(curriculum_id)
    if not record:
        raise HTTPException(status_code=404, detail="Curriculum not found")
    
    curriculum = record["curriculum"]
    
    # Count all topics and check cache status
    total_topics = 0
    lessons_cached = 0
    quizzes_cached = 0
    missing_lessons = []
    missing_quizzes = []
    
    for ci, cluster in enumerate(curriculum["clusters"]):
        for ti, topic in enumerate(cluster["topics"]):
            total_topics += 1
            
            # Check lesson cache
            if content_cache.get_cached_lesson(curriculum_id, ci, ti):
                lessons_cached += 1
            else:
                missing_lessons.append({
                    "cluster_index": ci,
                    "topic_index": ti,
                    "topic_name": topic["name"],
                    "cluster_name": cluster["name"]
                })
            
            # Check quiz cache (at least one quiz exists)
            if content_cache.get_quiz_count(curriculum_id, ci, ti) > 0:
                quizzes_cached += 1
            else:
                missing_quizzes.append({
                    "cluster_index": ci,
                    "topic_index": ti,
                    "topic_name": topic["name"],
                    "cluster_name": cluster["name"]
                })
    
    ready = (lessons_cached == total_topics and quizzes_cached == total_topics)
    
    return {
        "total_topics": total_topics,
        "lessons_cached": lessons_cached,
        "quizzes_cached": quizzes_cached,
        "missing_lessons": missing_lessons,
        "missing_quizzes": missing_quizzes,
        "ready": ready
    }


# Semaphore to limit concurrent LLM calls during batch preparation
# 4 concurrent allows fast generation while keeping server responsive
_prepare_semaphore = asyncio.Semaphore(4)


@app.post("/api/curriculums/{curriculum_id}/prepare")
async def prepare_curriculum_content(curriculum_id: str):
    """
    Batch generate all missing lessons and quizzes for a curriculum.
    Runs up to 4 generations in parallel for speed.
    Streams progress via SSE.
    """
    record = storage.get_curriculum(curriculum_id)
    if not record:
        raise HTTPException(status_code=404, detail="Curriculum not found")
    
    async def generate_content():
        curriculum = record["curriculum"]
        
        # Build list of all generation tasks needed
        tasks = []
        for ci, cluster in enumerate(curriculum["clusters"]):
            for ti, topic in enumerate(cluster["topics"]):
                # Check if lesson needs generating
                if not content_cache.get_cached_lesson(curriculum_id, ci, ti):
                    tasks.append({
                        "type": "lesson",
                        "cluster_index": ci,
                        "topic_index": ti,
                        "topic_name": topic["name"]
                    })
                
                # Check if quiz needs generating
                if content_cache.get_quiz_count(curriculum_id, ci, ti) == 0:
                    tasks.append({
                        "type": "quiz",
                        "cluster_index": ci,
                        "topic_index": ti,
                        "topic_name": topic["name"]
                    })
        
        total = len(tasks)
        
        if total == 0:
            yield f"data: {json.dumps({'type': 'complete', 'generated_count': 0, 'message': 'All content already prepared'})}\n\n"
            return
        
        logger.info(f"📦 Starting batch preparation: {total} items for {curriculum_id}")
        
        # Send initial status
        yield f"data: {json.dumps({'type': 'start', 'total': total})}\n\n"
        
        generated_count = 0
        errors = []
        completed = 0
        
        # Process in batches of 4 for parallel generation
        BATCH_SIZE = 4
        
        async def run_task(task):
            """Run a single generation task with semaphore."""
            async with _prepare_semaphore:
                if task["type"] == "lesson":
                    await learning.generate_lesson(
                        curriculum_id,
                        task["cluster_index"],
                        task["topic_index"]
                    )
                else:
                    await learning.generate_quiz(
                        curriculum_id,
                        task["cluster_index"],
                        task["topic_index"]
                    )
                return task
        
        # Process tasks in batches
        for batch_start in range(0, total, BATCH_SIZE):
            batch_end = min(batch_start + BATCH_SIZE, total)
            batch = tasks[batch_start:batch_end]
            
            # Send batch start update with cluster/topic indices for frontend tracking
            yield f"data: {json.dumps({'type': 'batch_start', 'batch_size': len(batch), 'current': batch_start + 1, 'total': total, 'items': [{'type': t['type'], 'topic_name': t['topic_name'], 'cluster_index': t['cluster_index'], 'topic_index': t['topic_index']} for t in batch]})}\n\n"
            
            # Run batch in parallel
            batch_results = await asyncio.gather(
                *[run_task(task) for task in batch],
                return_exceptions=True
            )
            
            # Process results
            for i, result in enumerate(batch_results):
                completed += 1
                task = batch[i]
                
                if isinstance(result, Exception):
                    logger.error(f"❌ Failed to generate {task['type']} for {task['topic_name']}: {result}")
                    errors.append({
                        "type": task["type"],
                        "topic_name": task["topic_name"],
                        "error": str(result)
                    })
                else:
                    generated_count += 1
            
            # Send batch complete update
            yield f"data: {json.dumps({'type': 'batch_complete', 'completed': completed, 'total': total, 'generated_count': generated_count})}\n\n"
        
        # Send completion
        yield f"data: {json.dumps({'type': 'complete', 'generated_count': generated_count, 'errors': errors})}\n\n"
        
        logger.info(f"✅ Batch preparation complete: {generated_count}/{total} items generated")
    
    return StreamingResponse(
        generate_content(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"}
    )


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
    
    # Use AI assessment if requested and available, otherwise use fallback
    if submission.use_ai_grading:
        try:
            assessment = await learning.assess_quiz_answers(
                submission.curriculum_id,
                submission.cluster_index,
                submission.topic_index,
                quiz,
                quiz_version,
                submission.answers
            )
        except Exception as e:
            logger.error(f"❌ AI assessment failed, using fallback: {e}")
            
            # Create fallback assessment without AI
            assessment = _create_fallback_assessment(quiz, quiz_version, submission.answers, str(e))
    else:
        # Skip AI, use fallback directly
        assessment = _create_fallback_assessment(quiz, quiz_version, submission.answers, "AI grading not requested")
    
    # Update progress if passed
    if assessment["passed"]:
        storage.update_topic_progress(
            submission.curriculum_id,
            submission.cluster_index,
            submission.topic_index,
            completed=True,
            quiz_score=assessment["score"]
        )
    
    # Cache the assessment
    content_cache.save_assessment(
        submission.curriculum_id,
        submission.cluster_index,
        submission.topic_index,
        quiz_version,
        assessment
    )
    
    return assessment


def _create_fallback_assessment(quiz, quiz_version: int, answers: list[int], error_message: str) -> dict:
    """Create a basic assessment when AI is unavailable."""
    
    # Calculate score
    correct_count = 0
    question_feedback = []
    
    for i, (question, answer) in enumerate(zip(quiz.questions, answers)):
        is_correct = answer == question.correct_index
        if is_correct:
            correct_count += 1
        
        question_feedback.append({
            "question_num": i + 1,
            "is_correct": is_correct,
            "student_choice": question.options[answer] if 0 <= answer < len(question.options) else "No answer",
            "correct_answer": question.options[question.correct_index],
            "analysis": "Great job!" if is_correct else f"The correct answer was: {question.options[question.correct_index]}",
            "explanation": question.explanation
        })
    
    score = int((correct_count / len(quiz.questions)) * 100)
    passed = score >= quiz.passing_score
    
    # Determine error type for user-friendly message
    is_credits_error = "credit" in error_message.lower() or "rate" in error_message.lower() or "quota" in error_message.lower() or "billing" in error_message.lower()
    
    if is_credits_error:
        encouragement = "⚠️ AI feedback unavailable (API credits exhausted). But don't worry - your score has been calculated and saved!"
    else:
        encouragement = "⚠️ AI feedback temporarily unavailable. Your score has been calculated and progress saved."
    
    if passed:
        encouragement += f" Congratulations on passing with {score}%! 🎉"
    else:
        encouragement += f" You scored {score}%. Review the explanations below and try again!"
    
    return {
        "score": score,
        "correct_count": correct_count,
        "total_questions": len(quiz.questions),
        "passed": passed,
        "quiz_version": quiz_version,
        "fallback_mode": True,  # Flag to indicate AI wasn't used
        "question_feedback": question_feedback,
        "summary": {
            "misconceptions": [] if passed else ["Review the questions you missed above"],
            "focus_areas": [] if passed else ["Check the explanations for each incorrect answer"],
            "encouragement": encouragement,
            "recommendation": "Continue to the next topic!" if passed else "Review the lesson and try a new quiz when ready."
        }
    }


@app.get("/api/assessments/{curriculum_id}/{cluster_index}/{topic_index}")
async def get_assessments(curriculum_id: str, cluster_index: int, topic_index: int):
    """Get all quiz assessments for a topic."""
    return {"assessments": content_cache.get_assessments(curriculum_id, cluster_index, topic_index)}


@app.get("/api/history/quiz/{curriculum_id}/{cluster_index}/{topic_index}")
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
