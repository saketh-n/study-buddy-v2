import Foundation

// MARK: - LessonSection

struct LessonSection: Codable, Identifiable, Equatable {
    let title: String
    let content: String
    let keyPoints: [String]
    
    var id: String { title }
    
    enum CodingKeys: String, CodingKey {
        case title
        case content
        case keyPoints = "key_points"
    }
}

// MARK: - Lesson

struct Lesson: Codable, Identifiable, Equatable {
    let topicName: String
    let introduction: String
    let sections: [LessonSection]
    let summary: String
    let estimatedTimeMinutes: Int
    
    var id: String { topicName }
    
    enum CodingKeys: String, CodingKey {
        case topicName = "topic_name"
        case introduction
        case sections
        case summary
        case estimatedTimeMinutes = "estimated_time_minutes"
    }
    
    /// Formatted time string
    var formattedTime: String {
        if estimatedTimeMinutes < 60 {
            return "\(estimatedTimeMinutes) min"
        } else {
            let hours = estimatedTimeMinutes / 60
            let minutes = estimatedTimeMinutes % 60
            if minutes == 0 {
                return "\(hours) hr"
            }
            return "\(hours) hr \(minutes) min"
        }
    }
}

// MARK: - API Request

struct LessonRequest: Codable {
    let curriculumId: String
    let clusterIndex: Int
    let topicIndex: Int
    
    enum CodingKeys: String, CodingKey {
        case curriculumId = "curriculum_id"
        case clusterIndex = "cluster_index"
        case topicIndex = "topic_index"
    }
}
