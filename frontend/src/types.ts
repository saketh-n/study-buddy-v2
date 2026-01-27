export interface Topic {
  name: string;
  description: string;
  order: number;
  prerequisites: string[];
}

export interface Cluster {
  name: string;
  description: string;
  order: number;
  topics: Topic[];
}

export interface Curriculum {
  subject: string;
  description: string;
  clusters: Cluster[];
}

export interface ParseResponse {
  curriculum: Curriculum | null;
  success: boolean;
  error?: string;
}

export interface CurriculumSummary {
  id: string;
  created_at: string;
  subject: string;
  description: string;
  cluster_count: number;
  topic_count: number;
  completed_topics: number;
}

export interface SavedCurriculumRecord {
  id: string;
  created_at: string;
  curriculum: Curriculum;
}

// ============ Learning Types ============

export interface LessonSection {
  title: string;
  content: string;
  key_points: string[];
}

export interface Lesson {
  topic_name: string;
  introduction: string;
  sections: LessonSection[];
  summary: string;
  estimated_time_minutes: number;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
}

export interface Quiz {
  topic_name: string;
  questions: QuizQuestion[];
  passing_score: number;
  version: number;
}

export interface QuestionFeedback {
  question_num: number;
  is_correct: boolean;
  student_choice: string;
  correct_answer: string;
  analysis: string;
  explanation: string;
}

export interface AssessmentSummary {
  misconceptions: string[];
  focus_areas: string[];
  encouragement: string;
  recommendation: string;
}

export interface QuizAssessment {
  score: number;
  passed: boolean;
  correct_count: number;
  total_questions: number;
  quiz_version: number;
  question_feedback: QuestionFeedback[];
  summary: AssessmentSummary;
  fallback_mode?: boolean;  // True when AI assessment failed
}

export interface TopicProgress {
  completed: boolean;
  quiz_score: number | null;
  completed_at: string | null;
}

export interface LearningProgress {
  curriculum_id: string;
  topics: Record<string, TopicProgress>;
  started_at: string;
  last_activity: string;
}

export interface ApiStatus {
  has_api_key: boolean;
}

// Helper to get topic key
export function getTopicKey(clusterIndex: number, topicIndex: number): string {
  return `${clusterIndex}-${topicIndex}`;
}

// Helper to parse topic key
export function parseTopicKey(key: string): { clusterIndex: number; topicIndex: number } {
  const [clusterIndex, topicIndex] = key.split('-').map(Number);
  return { clusterIndex, topicIndex };
}

// Helper to flatten topics with their indices
export interface FlatTopic {
  topic: Topic;
  clusterIndex: number;
  topicIndex: number;
  clusterName: string;
  globalIndex: number;
  topicKey: string;
}

export function flattenTopics(curriculum: Curriculum): FlatTopic[] {
  const result: FlatTopic[] = [];
  let globalIndex = 0;
  
  // Sort clusters by order
  const sortedClusters = [...curriculum.clusters].sort((a, b) => a.order - b.order);
  
  for (let ci = 0; ci < sortedClusters.length; ci++) {
    const cluster = sortedClusters[ci];
    const originalClusterIndex = curriculum.clusters.findIndex(c => c.name === cluster.name);
    
    // Sort topics by order
    const sortedTopics = [...cluster.topics].sort((a, b) => a.order - b.order);
    
    for (let ti = 0; ti < sortedTopics.length; ti++) {
      const topic = sortedTopics[ti];
      const originalTopicIndex = cluster.topics.findIndex(t => t.name === topic.name);
      
      result.push({
        topic,
        clusterIndex: originalClusterIndex,
        topicIndex: originalTopicIndex,
        clusterName: cluster.name,
        globalIndex,
        topicKey: getTopicKey(originalClusterIndex, originalTopicIndex)
      });
      globalIndex++;
    }
  }
  
  return result;
}

export function findTopicByKey(flatTopics: FlatTopic[], topicKey: string): FlatTopic | undefined {
  return flatTopics.find(t => t.topicKey === topicKey);
}
