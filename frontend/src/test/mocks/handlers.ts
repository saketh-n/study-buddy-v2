import { http, HttpResponse } from 'msw'

const API_BASE_URL = 'http://localhost:8000'

// Mock data
export const mockCurriculum = {
  subject: 'Data Structures and Algorithms',
  description: 'A comprehensive guide to DSA',
  clusters: [
    {
      name: 'Search Algorithms',
      description: 'Fundamental searching techniques',
      order: 1,
      topics: [
        {
          name: 'Binary Search',
          description: 'Efficient searching in sorted arrays',
          order: 1,
          prerequisites: []
        },
        {
          name: 'Linear Search',
          description: 'Simple sequential search',
          order: 2,
          prerequisites: []
        }
      ]
    }
  ]
}

export const mockCurriculumSummary = {
  id: 'test123',
  created_at: '2024-01-01T00:00:00',
  subject: 'Data Structures and Algorithms',
  description: 'A comprehensive guide to DSA',
  cluster_count: 1,
  topic_count: 2,
  completed_topics: 0
}

export const mockSavedCurriculum = {
  id: 'test123',
  created_at: '2024-01-01T00:00:00',
  curriculum: mockCurriculum
}

export const mockLesson = {
  topic_name: 'Binary Search',
  introduction: 'Binary search is a fundamental algorithm for efficiently finding items in sorted arrays.',
  sections: [
    {
      title: 'How Binary Search Works',
      content: 'Binary search works by repeatedly dividing the search interval in half...',
      key_points: ['O(log n) time complexity', 'Requires sorted array', 'Divide and conquer approach']
    },
    {
      title: 'Implementation',
      content: 'Here is how you implement binary search...',
      key_points: ['Maintain left and right pointers', 'Calculate mid point', 'Compare and narrow range']
    }
  ],
  summary: 'Binary search is a powerful technique for searching sorted data efficiently.',
  estimated_time_minutes: 15
}

export const mockQuiz = {
  topic_name: 'Binary Search',
  questions: [
    {
      question: 'What is the time complexity of binary search?',
      options: ['O(n)', 'O(log n)', 'O(n^2)', 'O(1)'],
      correct_index: 1,
      explanation: 'Binary search halves the search space each iteration, resulting in O(log n) complexity.'
    },
    {
      question: 'Binary search requires the array to be:',
      options: ['Empty', 'Sorted', 'Reversed', 'Random'],
      correct_index: 1,
      explanation: 'Binary search only works correctly on sorted arrays.'
    },
    {
      question: 'What is the space complexity of iterative binary search?',
      options: ['O(n)', 'O(log n)', 'O(n^2)', 'O(1)'],
      correct_index: 3,
      explanation: 'Iterative binary search uses constant extra space.'
    }
  ],
  passing_score: 80,
  version: 0
}

export const mockQuizAssessment = {
  score: 100,
  passed: true,
  correct_count: 3,
  total_questions: 3,
  quiz_version: 0,
  question_feedback: [
    {
      question_num: 1,
      is_correct: true,
      student_choice: 'O(log n)',
      correct_answer: 'O(log n)',
      analysis: 'Great understanding of time complexity!',
      explanation: 'Binary search halves the search space each iteration.'
    }
  ],
  summary: {
    misconceptions: [],
    focus_areas: [],
    encouragement: 'Excellent work! You have a solid understanding of binary search.',
    recommendation: 'Move on to the next topic.'
  }
}

export const mockProgress = {
  curriculum_id: 'test123',
  topics: {},
  started_at: '2024-01-01T00:00:00',
  last_activity: '2024-01-01T00:00:00'
}

export const mockContentStatus = {
  total_topics: 2,
  lessons_cached: 2,
  quizzes_cached: 2,
  missing_lessons: [],
  missing_quizzes: [],
  ready: true
}

// API handlers
export const handlers = [
  // List curriculums
  http.get(`${API_BASE_URL}/api/curriculums`, () => {
    return HttpResponse.json({
      curriculums: [mockCurriculumSummary]
    })
  }),

  // Get curriculum by ID
  http.get(`${API_BASE_URL}/api/curriculums/:id`, ({ params }) => {
    const { id } = params
    if (id === 'test123') {
      return HttpResponse.json(mockSavedCurriculum)
    }
    return new HttpResponse(null, { status: 404 })
  }),

  // Delete curriculum
  http.delete(`${API_BASE_URL}/api/curriculums/:id`, ({ params }) => {
    const { id } = params
    if (id === 'test123') {
      return HttpResponse.json({ success: true, message: 'Curriculum deleted' })
    }
    return new HttpResponse(null, { status: 404 })
  }),

  // Get learning progress
  http.get(`${API_BASE_URL}/api/curriculums/:id/progress`, () => {
    return HttpResponse.json(mockProgress)
  }),

  // Start learning
  http.post(`${API_BASE_URL}/api/curriculums/:id/progress/start`, () => {
    return HttpResponse.json(mockProgress)
  }),

  // Get content status
  http.get(`${API_BASE_URL}/api/curriculums/:id/content-status`, () => {
    return HttpResponse.json(mockContentStatus)
  }),

  // Generate lesson
  http.post(`${API_BASE_URL}/api/lesson`, () => {
    return HttpResponse.json(mockLesson)
  }),

  // Generate quiz
  http.post(`${API_BASE_URL}/api/quiz`, () => {
    return HttpResponse.json(mockQuiz)
  }),

  // Generate new quiz
  http.post(`${API_BASE_URL}/api/quiz/new`, () => {
    return HttpResponse.json({ ...mockQuiz, version: 1 })
  }),

  // Submit quiz
  http.post(`${API_BASE_URL}/api/quiz/submit`, () => {
    return HttpResponse.json(mockQuizAssessment)
  }),

  // Get quiz history
  http.get(`${API_BASE_URL}/api/history/quiz/:curriculumId/:clusterIndex/:topicIndex`, () => {
    return HttpResponse.json({
      total_quizzes: 1,
      history: [
        {
          version: 0,
          quiz: mockQuiz,
          assessments: [mockQuizAssessment]
        }
      ]
    })
  })
]
