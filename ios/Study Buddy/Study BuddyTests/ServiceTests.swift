import XCTest
@testable import Study_Buddy

final class ServiceTests: XCTestCase {
    
    // MARK: - BundledContentService Tests
    
    func testBundledContentServiceSingleton() {
        let service1 = BundledContentService.shared
        let service2 = BundledContentService.shared
        
        XCTAssertTrue(service1 === service2)
    }
    
    func testLoadBundledCurriculums() {
        let service = BundledContentService.shared
        let curriculums = service.loadBundledCurriculums()
        
        // Should load bundled curriculums if bundle is present
        // This test verifies the loading mechanism works
        if let curriculums = curriculums {
            XCTAssertFalse(curriculums.isEmpty)
        }
    }
    
    func testListBundledCurriculums() {
        let service = BundledContentService.shared
        let summaries = service.listBundledCurriculums()
        
        // All bundled curriculums should be marked as downloaded
        for summary in summaries {
            XCTAssertTrue(summary.isDownloaded)
        }
    }
    
    // MARK: - SSEEvent Tests
    
    func testSSEEventHasData() {
        var event = SSEEvent()
        XCTAssertFalse(event.hasData)
        
        event.data = ""
        XCTAssertFalse(event.hasData)
        
        event.data = "some data"
        XCTAssertTrue(event.hasData)
    }
    
    // MARK: - NetworkMonitor Tests
    
    @MainActor
    func testNetworkMonitorSingleton() {
        let monitor1 = NetworkMonitor.shared
        let monitor2 = NetworkMonitor.shared
        
        XCTAssertTrue(monitor1 === monitor2)
    }
    
    // MARK: - APIError Tests
    
    func testAPIErrorDescriptions() {
        let invalidResponse = APIError.invalidResponse
        XCTAssertEqual(invalidResponse.errorDescription, "Invalid response from server")
        
        let serverError = APIError.serverError(message: "Test error")
        XCTAssertEqual(serverError.errorDescription, "Test error")
        
        let networkError = APIError.networkUnavailable
        XCTAssertEqual(networkError.errorDescription, "Network unavailable. Using offline content.")
    }
    
    func testAPIErrorHTTPError() {
        let errorData = """
        {"detail": "Not found"}
        """.data(using: .utf8)!
        
        let error = APIError.httpError(statusCode: 404, data: errorData)
        XCTAssertEqual(error.errorDescription, "Not found")
    }
    
    func testAPIErrorHTTPErrorWithoutDetail() {
        let errorData = "{}".data(using: .utf8)!
        
        let error = APIError.httpError(statusCode: 500, data: errorData)
        XCTAssertEqual(error.errorDescription, "Server error (HTTP 500)")
    }
    
    // MARK: - SSEError Tests
    
    func testSSEErrorDescriptions() {
        XCTAssertEqual(SSEError.invalidResponse.errorDescription, "Invalid response from server")
        XCTAssertEqual(SSEError.httpError(statusCode: 404).errorDescription, "Server error (HTTP 404)")
        XCTAssertEqual(SSEError.streamEnded.errorDescription, "Stream ended unexpectedly")
        XCTAssertEqual(SSEError.parseError.errorDescription, "Failed to parse event data")
    }
}
