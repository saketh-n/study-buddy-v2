# Study Buddy

An AI-powered application that transforms your learning topics into structured, optimized curricula.

## Project Structure

```
study-buddy-v2/
├── frontend/          # React + TypeScript + Tailwind
│   ├── src/
│   │   ├── components/
│   │   ├── App.tsx
│   │   ├── api.ts
│   │   └── types.ts
│   └── package.json
├── backend/           # Python FastAPI
│   ├── app/
│   │   ├── main.py
│   │   ├── models.py
│   │   └── curriculum_parser.py
│   └── requirements.txt
└── README.md
```

## Features

- **Text Input**: Paste a list of topics you want to learn
- **AI Organization**: Claude AI analyzes and clusters related topics
- **Learning Path**: Topics are ordered by prerequisites (what to learn first)
- **Beautiful UI**: Modern glassmorphism design with smooth animations

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.10+
- Anthropic API Key

### Backend Setup

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

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev
```

The app will be available at `http://localhost:5173`

## API Endpoints

### `POST /api/parse`

Parse raw text into a structured curriculum.

**Request Body:**
```json
{
  "raw_text": "Virtual Machines\nContainers\nKubernetes\nLoad Balancing..."
}
```

**Response:**
```json
{
  "success": true,
  "curriculum": {
    "subject": "Cloud Computing",
    "description": "A comprehensive guide to cloud infrastructure",
    "clusters": [
      {
        "name": "Virtualization Fundamentals",
        "description": "Core concepts of virtualization",
        "order": 1,
        "topics": [
          {
            "name": "Virtual Machines",
            "description": "Understanding VMs and hypervisors",
            "order": 1,
            "prerequisites": []
          }
        ]
      }
    ]
  }
}
```

## Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Vite
- **Backend**: FastAPI, Pydantic, Anthropic Claude API
- **Styling**: Custom glassmorphism design with Syne & JetBrains Mono fonts

## License

MIT

