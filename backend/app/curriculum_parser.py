import json
import logging
import re
from typing import AsyncGenerator
from anthropic import AsyncAnthropic
from dotenv import load_dotenv
from .models import Curriculum, Cluster, Topic

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s | %(levelname)s | %(message)s',
    datefmt='%H:%M:%S'
)
logger = logging.getLogger(__name__)

# Initialize Anthropic client
client = AsyncAnthropic()

SYSTEM_PROMPT = """You are an expert curriculum designer and educational content organizer. Your task is to analyze a raw list of topics and organize them into a structured learning curriculum.

When given a list of topics to learn, you must:
1. Identify the overarching subject/theme
2. Cluster related topics together into logical groups
3. Order the clusters from foundational to advanced (what should be learned first)
4. Within each cluster, order topics from prerequisites to dependent topics
5. Provide brief descriptions for the subject, each cluster, and each topic

IMPORTANT: Your response must be valid JSON matching this exact structure:
{
  "subject": "The main subject name",
  "description": "A brief description of what this curriculum covers",
  "clusters": [
    {
      "name": "Cluster Name",
      "description": "What this cluster covers",
      "order": 1,
      "topics": [
        {
          "name": "Topic Name",
          "description": "What this topic covers",
          "order": 1,
          "prerequisites": ["Any prerequisite topic names from earlier in the curriculum"]
        }
      ]
    }
  ]
}

Rules:
- Clusters should be ordered by their "order" field (1 = learn first)
- Topics within clusters should also be ordered (1 = learn first within that cluster)
- Prerequisites should only reference topics that appear earlier in the curriculum
- Provide helpful, concise descriptions
- Group truly related concepts together
- Consider learning dependencies when ordering

Respond ONLY with the JSON object, no additional text."""


async def parse_curriculum_with_progress(raw_text: str) -> AsyncGenerator[dict, None]:
    """
    Parse raw text containing topics into a structured curriculum using Claude.
    Yields progress updates and final result.
    """
    # Log input
    input_preview = raw_text[:200] + "..." if len(raw_text) > 200 else raw_text
    logger.info(f"📥 API Call Started")
    logger.info(f"   Input preview: {input_preview.replace(chr(10), ' ')}")
    logger.info(f"   Input length: {len(raw_text)} characters")
    
    yield {"status": "processing", "message": "Analyzing your topics...", "progress": 1}
    
    yield {"status": "processing", "message": "Sending to AI for organization...", "progress": 2}
    
    try:
        logger.info(f"🤖 Calling Claude API (model: claude-sonnet-4-20250514)")
        
        # Use stream instead of create
        async with client.messages.stream(
            model="claude-sonnet-4-20250514",
            max_tokens=4096,
            messages=[{
                "role": "user",
                "content": f"Please organize the following topics into a structured learning curriculum:\n\n{raw_text}"
            }],
            system=SYSTEM_PROMPT
        ) as stream:
            
            response_text = ""
            progress = 2
            async for text in stream.text_stream:
                response_text += text
                progress = min(96, progress + 1)
                # Optional: yield progress as tokens arrive
                yield {"status": "processing", "message": "Receiving AI response...", "progress": progress}
            
            message = await stream.get_final_message()
        
        logger.info(f"✅ Claude API Response received")
        yield {"status": "processing", "message": "AI response received, parsing...", "progress": 97}
        
    except Exception as e:
        logger.error(f"❌ Claude API Error: {str(e)}")
        yield {"status": "error", "message": f"AI API error: {str(e)}", "progress": 0}
        return
    
    # Extract the response text
    response_text = message.content[0].text
    logger.info(f"📤 Response preview: {response_text[:300].replace(chr(10), ' ')}...")
    
    yield {"status": "processing", "message": "Building curriculum structure...", "progress": 98}
    
    # Parse the JSON response
    try:
        curriculum_data = json.loads(response_text)
    except json.JSONDecodeError:
        # Try to extract JSON from the response if it's wrapped in markdown
        json_match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', response_text)
        if json_match:
            curriculum_data = json.loads(json_match.group(1))
        else:
            logger.error(f"❌ Failed to parse JSON from response")
            yield {"status": "error", "message": "Failed to parse curriculum from AI response", "progress": 0}
            return
    
    yield {"status": "processing", "message": "Finalizing curriculum...", "progress": 99}
    
    # Convert to Pydantic models
    clusters = []
    for cluster_data in curriculum_data.get("clusters", []):
        topics = []
        for topic_data in cluster_data.get("topics", []):
            topics.append(Topic(
                name=topic_data["name"],
                description=topic_data["description"],
                order=topic_data["order"],
                prerequisites=topic_data.get("prerequisites", [])
            ))
        clusters.append(Cluster(
            name=cluster_data["name"],
            description=cluster_data["description"],
            order=cluster_data["order"],
            topics=topics
        ))
    
    curriculum = Curriculum(
        subject=curriculum_data["subject"],
        description=curriculum_data["description"],
        clusters=clusters
    )
    
    total_topics = sum(len(c.topics) for c in clusters)
    logger.info(f"🎉 Curriculum created successfully!")
    logger.info(f"   Subject: {curriculum.subject}")
    logger.info(f"   Clusters: {len(clusters)}, Topics: {total_topics}")
    
    yield {
        "status": "complete", 
        "message": "Curriculum ready!", 
        "progress": 100,
        "curriculum": curriculum.model_dump()
    }
