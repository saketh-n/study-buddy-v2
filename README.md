# Study Buddy

An AI-powered application that transforms your learning topics into structured, optimized curricula with interactive lessons, quizzes, and an AI tutor.

## Project Structure

```
study-buddy-v2/
├── frontend/              # React + TypeScript + Tailwind
│   ├── src/
│   │   ├── components/    # UI components
│   │   ├── pages/         # Route pages
│   │   ├── api.ts         # API client
│   │   └── types.ts       # TypeScript types
│   ├── Dockerfile
│   └── package.json
├── backend/               # Python FastAPI
│   ├── app/
│   │   ├── main.py        # API routes
│   │   ├── models.py      # Pydantic models
│   │   ├── learning.py    # AI lesson/quiz generation
│   │   ├── storage.py     # Data persistence
│   │   └── content_cache.py # Caching layer
│   ├── Dockerfile
│   └── requirements.txt
├── docker-compose.yml
└── README.md
```

## Features

- **Curriculum Generation**: Paste topics → AI organizes them into a structured learning path
- **Interactive Lessons**: AI-generated lessons with problem/solution framing
- **Mastery Quizzes**: Test your understanding with AI-powered assessment
- **AI Tutor**: Chat with a tutor, highlight text to ask questions
- **Progress Tracking**: Track your learning progress across topics
- **Quiz History**: Review past quizzes and assessments

## Getting Started

### Option 1: Docker (Recommended for Deployment)

#### Prerequisites
- Docker & Docker Compose installed
- Anthropic API Key

#### Build Docker Images

```bash
# Clone the repository
git clone <your-repo-url>
cd study-buddy-v2

# Build both images
docker-compose build
```

Or build individually:

```bash
# Build backend image
docker build -t study-buddy-backend ./backend

# Build frontend image
docker build -t study-buddy-frontend ./frontend
```

#### Run with Docker Compose

```bash
# Create .env file with your API key
echo "ANTHROPIC_API_KEY=your_api_key_here" > .env

# Start all services
docker-compose up -d
```

The app will be available at:
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8000`

#### Run Individual Containers

```bash
# Create a network for the containers
docker network create study-buddy-network

# Create a data directory for persistence
mkdir -p ./data

# Run backend
docker run -d \
  --name study-buddy-backend \
  --network study-buddy-network \
  -p 8000:8000 \
  -e ANTHROPIC_API_KEY=your_api_key_here \
  -v $(pwd)/data:/app/data \
  study-buddy-backend

# Run frontend
docker run -d \
  --name study-buddy-frontend \
  --network study-buddy-network \
  -p 5173:5173 \
  study-buddy-frontend
```

#### Deploy to Another Computer

1. **Save the Docker images:**
```bash
# Export images to tar files
docker save study-buddy-backend > study-buddy-backend.tar
docker save study-buddy-frontend > study-buddy-frontend.tar
```

2. **Transfer files to the target computer:**
   - Copy `study-buddy-backend.tar`, `study-buddy-frontend.tar`, and `docker-compose.yml`

3. **On the target computer:**
```bash
# Load the images
docker load < study-buddy-backend.tar
docker load < study-buddy-frontend.tar

# Create .env with your API key
echo "ANTHROPIC_API_KEY=your_api_key_here" > .env

# Start the services
docker-compose up -d
```

#### Docker Image Tags

To push to a container registry (Docker Hub, etc.):

```bash
# Tag images
docker tag study-buddy-backend your-registry/study-buddy-backend:latest
docker tag study-buddy-frontend your-registry/study-buddy-frontend:latest

# Push to registry
docker push your-registry/study-buddy-backend:latest
docker push your-registry/study-buddy-frontend:latest
```

### Option 2: Local Development

#### Prerequisites
- Node.js 18+
- Python 3.10+
- Anthropic API Key

#### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set your Anthropic API key
export ANTHROPIC_API_KEY=your_api_key_here

# Run the server
uvicorn app.main:app --reload
```

The API will be available at `http://localhost:8000`

#### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev
```

The app will be available at `http://localhost:5173`

## API Endpoints

### Curriculum
- `POST /api/parse-stream` - Parse topics into curriculum (SSE)
- `GET /api/curriculums` - List all saved curriculums
- `GET /api/curriculums/{id}` - Get specific curriculum
- `DELETE /api/curriculums/{id}` - Delete a curriculum

### Learning
- `POST /api/lesson` - Generate lesson for a topic
- `POST /api/quiz` - Get or generate quiz
- `POST /api/quiz/new` - Force generate new quiz
- `POST /api/quiz/submit` - Submit quiz for AI assessment
- `GET /api/quiz/history/{id}/{cluster}/{topic}` - Get quiz history

### Progress
- `GET /api/curriculums/{id}/progress` - Get learning progress

### AI Tutor
- `POST /api/tutor` - Chat with AI tutor
- `GET /api/chat/{id}/{cluster}/{topic}` - Get chat history

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `ANTHROPIC_API_KEY` | Your Anthropic API key | Yes |

## Data Persistence

All data is stored in the `data/` directory:
- `data/curriculums/` - Saved curriculum JSON files
- `data/content/` - Cached lessons, quizzes, and chat history

When using Docker, mount a volume to `/app/data` to persist data.

## Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Vite, React Router
- **Backend**: FastAPI, Pydantic, Anthropic Claude API
- **Styling**: Custom glassmorphism design with Syne & JetBrains Mono fonts
- **AI**: Claude claude-sonnet-4-20250514 for curriculum parsing, lesson generation, and assessment

## License

MIT
