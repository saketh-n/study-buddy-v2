import Foundation

/// Service for handling Server-Sent Events (SSE) streams
actor SSEService {
    static let shared = SSEService()
    
    private init() {}
    
    /// Stream SSE events and process them with a handler
    /// Returns the first non-nil result from the handler
    func stream<T>(
        request: URLRequest,
        handler: @escaping (SSEEvent) throws -> T?
    ) async throws -> T {
        let (bytes, response) = try await URLSession.shared.bytes(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw SSEError.invalidResponse
        }
        
        guard (200...299).contains(httpResponse.statusCode) else {
            throw SSEError.httpError(statusCode: httpResponse.statusCode)
        }
        
        var currentEvent = SSEEvent()
        
        for try await line in bytes.lines {
            // Parse SSE format
            if line.isEmpty {
                // Empty line means end of event
                if currentEvent.hasData {
                    do {
                        if let result = try handler(currentEvent) {
                            return result
                        }
                    } catch {
                        throw error
                    }
                }
                currentEvent = SSEEvent()
            } else if line.hasPrefix("data: ") {
                let data = String(line.dropFirst(6))
                if currentEvent.data == nil {
                    currentEvent.data = data
                } else {
                    currentEvent.data! += "\n" + data
                }
            } else if line.hasPrefix("event: ") {
                currentEvent.event = String(line.dropFirst(7))
            } else if line.hasPrefix("id: ") {
                currentEvent.id = String(line.dropFirst(4))
            } else if line.hasPrefix("retry: ") {
                if let retry = Int(String(line.dropFirst(7))) {
                    currentEvent.retry = retry
                }
            }
        }
        
        // Process any remaining event
        if currentEvent.hasData {
            if let result = try handler(currentEvent) {
                return result
            }
        }
        
        throw SSEError.streamEnded
    }
    
    /// Stream SSE events without expecting a return value
    func streamVoid(
        request: URLRequest,
        handler: @escaping (SSEEvent) throws -> Bool?
    ) async throws {
        let (bytes, response) = try await URLSession.shared.bytes(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw SSEError.invalidResponse
        }
        
        guard (200...299).contains(httpResponse.statusCode) else {
            throw SSEError.httpError(statusCode: httpResponse.statusCode)
        }
        
        var currentEvent = SSEEvent()
        
        for try await line in bytes.lines {
            if line.isEmpty {
                if currentEvent.hasData {
                    do {
                        if let done = try handler(currentEvent), done {
                            return
                        }
                    } catch {
                        throw error
                    }
                }
                currentEvent = SSEEvent()
            } else if line.hasPrefix("data: ") {
                let data = String(line.dropFirst(6))
                if currentEvent.data == nil {
                    currentEvent.data = data
                } else {
                    currentEvent.data! += "\n" + data
                }
            } else if line.hasPrefix("event: ") {
                currentEvent.event = String(line.dropFirst(7))
            } else if line.hasPrefix("id: ") {
                currentEvent.id = String(line.dropFirst(4))
            } else if line.hasPrefix("retry: ") {
                if let retry = Int(String(line.dropFirst(7))) {
                    currentEvent.retry = retry
                }
            }
        }
        
        // Process any remaining event
        if currentEvent.hasData {
            _ = try handler(currentEvent)
        }
    }
}

/// Represents a single SSE event
struct SSEEvent {
    var event: String?
    var data: String?
    var id: String?
    var retry: Int?
    
    var hasData: Bool {
        data != nil && !data!.isEmpty
    }
}

/// SSE-specific errors
enum SSEError: LocalizedError {
    case invalidResponse
    case httpError(statusCode: Int)
    case streamEnded
    case parseError
    
    var errorDescription: String? {
        switch self {
        case .invalidResponse:
            return "Invalid response from server"
        case .httpError(let statusCode):
            return "Server error (HTTP \(statusCode))"
        case .streamEnded:
            return "Stream ended unexpectedly"
        case .parseError:
            return "Failed to parse event data"
        }
    }
}
