import json
import logging
import re
import asyncio
from concurrent.futures import ThreadPoolExecutor
from anthropic import Anthropic
from dotenv import load_dotenv
from .models import Lesson, LessonSection, Quiz, QuizQuestion
from . import storage
from . import content_cache

load_dotenv()

logger = logging.getLogger(__name__)
client = Anthropic()

# Thread pool for running blocking LLM calls
_executor = ThreadPoolExecutor(max_workers=4)


def _call_llm_sync(messages: list, system: str = "", max_tokens: int = 4096) -> str:
    """Synchronous LLM call - runs in thread pool."""
    kwargs = {
        "model": "claude-sonnet-4-20250514",
        "max_tokens": max_tokens,
        "messages": messages
    }
    if system:
        kwargs["system"] = system
    
    response = client.messages.create(**kwargs)
    return response.content[0].text


async def _call_llm(messages: list, system: str = "", max_tokens: int = 4096) -> str:
    """Async wrapper for LLM calls - doesn't block the event loop."""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(
        _executor,
        lambda: _call_llm_sync(messages, system, max_tokens)
    )


def _parse_json_response(text: str) -> dict:
    """Parse JSON from LLM response, handling markdown code blocks."""
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        json_match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', text)
        if json_match:
            return json.loads(json_match.group(1))
        raise ValueError("Failed to parse JSON from response")


async def generate_lesson(curriculum_id: str, cluster_index: int, topic_index: int) -> Lesson:
    """Generate an AI lesson for a specific topic, using cache if available."""
    
    # Check cache first
    cached = content_cache.get_cached_lesson(curriculum_id, cluster_index, topic_index)
    if cached:
        return cached
    
    # Get the curriculum and topic
    record = storage.get_curriculum(curriculum_id)
    if not record:
        raise ValueError("Curriculum not found")
    
    curriculum = record["curriculum"]
    cluster = curriculum["clusters"][cluster_index]
    topic = cluster["topics"][topic_index]
    
    logger.info(f"📚 Generating lesson for: {topic['name']}")
    
    prompt = f"""Create a comprehensive lesson for learning the following topic:

Subject: {curriculum['subject']}
Cluster: {cluster['name']}
Topic: {topic['name']}
Topic Description: {topic['description']}
Prerequisites: {', '.join(topic.get('prerequisites', [])) or 'None'}

Create a well-structured lesson that:

1. **Starts with the "Why"** - Begin with an engaging introduction that explains:
   - What PROBLEM or challenge this concept was developed to solve
   - The historical or practical context (what did people struggle with before this existed?)
   - Why this matters in the real world

2. **Explains the "What"** - Break down the concept into 3-4 digestible sections that:
   - Explain the core concept clearly with concrete examples
   - Use analogies to make abstract ideas tangible
   - Include key points that crystallize the essential knowledge

3. **Shows the "Elegance"** - Help the learner appreciate:
   - Why this solution is elegant or effective
   - How it addresses the original problem in a clever way
   - What makes it better than naive approaches

4. **Ends with practical application** - Summarize with:
   - How to recognize when to apply this concept
   - Common use cases and patterns

Respond with JSON in this exact format:
{{
    "topic_name": "{topic['name']}",
    "introduction": "An engaging intro that sets up the PROBLEM this concept solves and why it matters...",
    "sections": [
        {{
            "title": "Section Title",
            "content": "Detailed explanation with examples, analogies, and practical insights...",
            "key_points": ["Point 1", "Point 2", "Point 3"]
        }}
    ],
    "summary": "A concise summary covering when and how to apply this knowledge...",
    "estimated_time_minutes": 15
}}

Respond ONLY with the JSON, no additional text."""

    response_text = await _call_llm([{"role": "user", "content": prompt}])
    logger.info(f"✅ Lesson generated for: {topic['name']}")
    
    data = _parse_json_response(response_text)
    
    lesson = Lesson(
        topic_name=data["topic_name"],
        introduction=data["introduction"],
        sections=[LessonSection(**s) for s in data["sections"]],
        summary=data["summary"],
        estimated_time_minutes=data.get("estimated_time_minutes", 15)
    )
    
    # Cache the lesson
    content_cache.save_lesson(curriculum_id, cluster_index, topic_index, lesson)
    
    return lesson


async def generate_quiz(curriculum_id: str, cluster_index: int, topic_index: int, force_new: bool = False) -> tuple[Quiz, int]:
    """
    Generate a quiz to assess mastery of a topic.
    Returns (Quiz, version_number).
    If force_new=True, generates a new quiz even if one exists.
    """
    
    # Check cache first (unless forcing new)
    if not force_new:
        cached = content_cache.get_cached_quiz(curriculum_id, cluster_index, topic_index)
        if cached:
            version = content_cache.get_quiz_count(curriculum_id, cluster_index, topic_index) - 1
            return cached, version
    
    record = storage.get_curriculum(curriculum_id)
    if not record:
        raise ValueError("Curriculum not found")
    
    curriculum = record["curriculum"]
    cluster = curriculum["clusters"][cluster_index]
    topic = cluster["topics"][topic_index]
    
    # Get count of existing quizzes to make new ones different
    existing_count = content_cache.get_quiz_count(curriculum_id, cluster_index, topic_index)
    
    logger.info(f"📝 Generating quiz v{existing_count} for: {topic['name']}")
    
    variation_note = ""
    if existing_count > 0:
        variation_note = f"\n\nIMPORTANT: This is quiz attempt #{existing_count + 1}. Create DIFFERENT questions than previous quizzes to test the concept from new angles."
    
    prompt = f"""Create a quiz to assess understanding of this topic:

Subject: {curriculum['subject']}
Topic: {topic['name']}
Description: {topic['description']}{variation_note}

Create 5 multiple-choice questions that:
1. Test conceptual understanding, not just memorization
2. Include questions about WHY/WHEN to use this concept (problem-solving context)
3. Range from basic comprehension to application
4. Have plausible distractors that represent common misconceptions

Respond with JSON in this exact format:
{{
    "topic_name": "{topic['name']}",
    "questions": [
        {{
            "question": "The question text?",
            "options": ["Option A", "Option B", "Option C", "Option D"],
            "correct_index": 0,
            "explanation": "Brief explanation of the correct answer..."
        }}
    ]
}}

Respond ONLY with the JSON, no additional text."""

    response_text = await _call_llm([{"role": "user", "content": prompt}], max_tokens=2048)
    logger.info(f"✅ Quiz generated for: {topic['name']}")
    
    data = _parse_json_response(response_text)
    
    quiz = Quiz(
        topic_name=data["topic_name"],
        questions=[QuizQuestion(**q) for q in data["questions"]],
        passing_score=80
    )
    
    # Cache the quiz
    version = content_cache.save_quiz(curriculum_id, cluster_index, topic_index, quiz)
    
    return quiz, version


async def assess_quiz_answers(
    curriculum_id: str,
    cluster_index: int,
    topic_index: int,
    quiz: Quiz,
    quiz_version: int,
    answers: list[int]
) -> dict:
    """
    AI-powered assessment of quiz answers.
    Analyzes why the student chose each answer and provides personalized feedback.
    """
    
    record = storage.get_curriculum(curriculum_id)
    if not record:
        raise ValueError("Curriculum not found")
    
    curriculum = record["curriculum"]
    topic = curriculum["clusters"][cluster_index]["topics"][topic_index]
    
    # Build question analysis
    questions_analysis = []
    for i, (question, answer) in enumerate(zip(quiz.questions, answers)):
        questions_analysis.append({
            "question_num": i + 1,
            "question": question.question,
            "options": question.options,
            "student_answer": question.options[answer] if 0 <= answer < len(question.options) else "No answer",
            "student_answer_index": answer,
            "correct_answer": question.options[question.correct_index],
            "correct_index": question.correct_index,
            "is_correct": answer == question.correct_index
        })
    
    correct_count = sum(1 for q in questions_analysis if q["is_correct"])
    score = int((correct_count / len(quiz.questions)) * 100)
    
    logger.info(f"🔍 Generating AI assessment for quiz (score: {score}%)")
    
    prompt = f"""You are an expert educational assessor. Analyze this student's quiz performance and provide detailed, helpful feedback.

Topic: {topic['name']}
Subject: {curriculum['subject']}
Score: {score}% ({correct_count}/{len(quiz.questions)} correct)

Quiz Results:
{json.dumps(questions_analysis, indent=2)}

For each INCORRECT answer, provide:
1. An analysis of why the student likely chose that answer (common misconceptions)
2. A clear explanation of why it's wrong
3. Why the correct answer is right

Then provide an overall summary of:
1. The student's key misconceptions or knowledge gaps
2. Specific areas to focus on for improvement
3. Encouragement and next steps

Respond with JSON:
{{
    "question_feedback": [
        {{
            "question_num": 1,
            "is_correct": true/false,
            "student_choice": "Their answer",
            "correct_answer": "The right answer",
            "analysis": "For incorrect: Why they likely chose this / For correct: Good understanding shown",
            "explanation": "Detailed explanation of the concept"
        }}
    ],
    "summary": {{
        "misconceptions": ["List of identified misconceptions"],
        "focus_areas": ["Specific topics to review"],
        "encouragement": "Personalized encouraging message",
        "recommendation": "What to do next"
    }}
}}

Respond ONLY with the JSON."""

    response_text = await _call_llm([{"role": "user", "content": prompt}], max_tokens=3000)
    
    assessment = _parse_json_response(response_text)
    assessment["score"] = score
    assessment["correct_count"] = correct_count
    assessment["total_questions"] = len(quiz.questions)
    assessment["passed"] = score >= quiz.passing_score
    assessment["quiz_version"] = quiz_version
    
    # Cache the assessment
    content_cache.save_assessment(curriculum_id, cluster_index, topic_index, quiz_version, assessment)
    
    logger.info(f"✅ Assessment complete for quiz v{quiz_version}")
    
    return assessment
