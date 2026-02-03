import Foundation

// MARK: - Topic

struct Topic: Codable, Identifiable, Equatable {
    let name: String
    let description: String
    let order: Int
    let prerequisites: [String]
    
    var id: String { name }
}

// MARK: - Cluster

struct Cluster: Codable, Identifiable, Equatable {
    let name: String
    let description: String
    let order: Int
    let topics: [Topic]
    
    var id: String { name }
}

// MARK: - Curriculum

struct Curriculum: Codable, Equatable {
    let subject: String
    let description: String
    let clusters: [Cluster]
    
    /// Get all topics flattened with their indices
    func flattenTopics() -> [FlatTopic] {
        var result: [FlatTopic] = []
        var globalIndex = 0
        
        // Sort clusters by order
        let sortedClusters = clusters.sorted { $0.order < $1.order }
        
        for cluster in sortedClusters {
            guard let originalClusterIndex = clusters.firstIndex(where: { $0.name == cluster.name }) else { continue }
            
            // Sort topics by order
            let sortedTopics = cluster.topics.sorted { $0.order < $1.order }
            
            for topic in sortedTopics {
                guard let originalTopicIndex = cluster.topics.firstIndex(where: { $0.name == topic.name }) else { continue }
                
                result.append(FlatTopic(
                    topic: topic,
                    clusterIndex: originalClusterIndex,
                    topicIndex: originalTopicIndex,
                    clusterName: cluster.name,
                    globalIndex: globalIndex,
                    topicKey: TopicKey.make(clusterIndex: originalClusterIndex, topicIndex: originalTopicIndex)
                ))
                globalIndex += 1
            }
        }
        
        return result
    }
    
    /// Total number of topics in the curriculum
    var totalTopics: Int {
        clusters.reduce(0) { $0 + $1.topics.count }
    }
}

// MARK: - FlatTopic

struct FlatTopic: Identifiable, Equatable {
    let topic: Topic
    let clusterIndex: Int
    let topicIndex: Int
    let clusterName: String
    let globalIndex: Int
    let topicKey: String
    
    var id: String { topicKey }
}

// MARK: - TopicKey Helper

enum TopicKey {
    static func make(clusterIndex: Int, topicIndex: Int) -> String {
        "\(clusterIndex)-\(topicIndex)"
    }
    
    static func parse(_ key: String) -> (clusterIndex: Int, topicIndex: Int)? {
        let parts = key.split(separator: "-")
        guard parts.count == 2,
              let clusterIndex = Int(parts[0]),
              let topicIndex = Int(parts[1]) else {
            return nil
        }
        return (clusterIndex, topicIndex)
    }
}

// MARK: - CurriculumSummary

struct CurriculumSummary: Codable, Identifiable, Equatable {
    let id: String
    let createdAt: String
    let subject: String
    let description: String
    let clusterCount: Int
    let topicCount: Int
    let completedTopics: Int
    
    /// Whether this curriculum is downloaded for offline use
    var isDownloaded: Bool = false
    
    enum CodingKeys: String, CodingKey {
        case id
        case createdAt = "created_at"
        case subject
        case description
        case clusterCount = "cluster_count"
        case topicCount = "topic_count"
        case completedTopics = "completed_topics"
    }
    
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(String.self, forKey: .id)
        createdAt = try container.decode(String.self, forKey: .createdAt)
        subject = try container.decode(String.self, forKey: .subject)
        description = try container.decode(String.self, forKey: .description)
        clusterCount = try container.decode(Int.self, forKey: .clusterCount)
        topicCount = try container.decode(Int.self, forKey: .topicCount)
        completedTopics = try container.decode(Int.self, forKey: .completedTopics)
        isDownloaded = false
    }
    
    init(id: String, createdAt: String, subject: String, description: String, clusterCount: Int, topicCount: Int, completedTopics: Int, isDownloaded: Bool = false) {
        self.id = id
        self.createdAt = createdAt
        self.subject = subject
        self.description = description
        self.clusterCount = clusterCount
        self.topicCount = topicCount
        self.completedTopics = completedTopics
        self.isDownloaded = isDownloaded
    }
}

// MARK: - SavedCurriculumRecord

struct SavedCurriculumRecord: Codable, Identifiable, Equatable {
    let id: String
    let createdAt: String
    let curriculum: Curriculum
    
    enum CodingKeys: String, CodingKey {
        case id
        case createdAt = "created_at"
        case curriculum
    }
}

// MARK: - API Response Types

struct CurriculumsResponse: Codable {
    let curriculums: [CurriculumSummary]
}

struct ParseProgressEvent: Codable {
    let status: String
    let message: String?
    let progress: Int?
    let curriculum: Curriculum?
    let savedId: String?
    
    enum CodingKeys: String, CodingKey {
        case status
        case message
        case progress
        case curriculum
        case savedId = "saved_id"
    }
}
