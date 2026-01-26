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
- `GET /api/history/quiz/{id}/{cluster}/{topic}` - Get quiz history

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

## Testing

This project supports **backend**, **frontend**, and **end-to-end (E2E)** testing.

For E2E and CI-related changes, it is **strongly recommended** to use `act` to run the actual GitHub Actions workflow locally before pushing commits.

---

## Backend Tests

```bash
cd backend
pytest tests/ -v
pytest tests/ --cov=app --cov-report=html   # With coverage
```

---

## Frontend Tests

```bash
cd frontend
npm run test             # Watch mode
npm run test:run         # Single run
npm run test:coverage    # With coverage
```

---

## E2E Tests (Playwright)

From the `frontend/` directory:

```bash
npm run test:e2e
npm run test:e2e:ui          # Playwright UI mode
npm run test:e2e:headed      # Run in headed browser
```

### Frontend port override
If the frontend is running on a port other than `5173`, set:

```bash
FRONTEND_PORT=XXXX
```

---

## Local CI Simulation with GitHub Actions (`act`) ⭐ Recommended

To avoid pushing commits just to test CI or workflow changes, use **`act`** to run the real GitHub Actions jobs locally.

`act` runs workflows **inside Docker containers**, so it is safe:
- your real local data is not modified
- backend seeding only affects the container filesystem
- artifacts are not uploaded anywhere

### Requirements
- Docker (Docker Desktop or Docker Engine)
- `act` installed

macOS:
```bash
brew install act
```

---

## Run Comprehensive Test Suite (Backend, Frontend, E2E) CI Job Locally

From the **repo root**:

```bash
ACT=true && act -j e2e-tests \
  -P ubuntu-latest=ghcr.io/catthehacker/ubuntu:act-22.04
```

---

### About ACT

- Flag to indicate this is running in a container not on GitHub
- Ensures playwright reports are properly accessible

---

## Backend Data Seeding (E2E)

During E2E runs in CI (and `act`), backend data is seeded automatically:

```yaml
- name: Seed backend data for E2E
  run: cp -R backend/sample-data backend/data
```

This runs **inside the container only**.  
`backend/data` is gitignored and never touches real local data.

---

## Playwright Artifacts (Local)

When running E2E tests locally or via `act`, Playwright outputs:

- HTML report: `frontend/playwright-report/`
- Traces, screenshots, videos: `frontend/test-results/`

View the report locally with:

```bash
npx playwright show-report frontend/playwright-report
```

Artifact upload steps only run on GitHub Actions and are skipped locally.

---

## Summary

- Use unit tests for fast feedback
- Use Playwright directly for UI debugging
- Use `act` to validate CI workflows before pushing
- E2E seeding is container-only and safe by design
- No local data is deleted or overwritten

