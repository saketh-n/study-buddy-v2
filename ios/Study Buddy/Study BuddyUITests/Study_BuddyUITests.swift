import XCTest

final class Study_BuddyUITests: XCTestCase {
    
    var app: XCUIApplication!
    
    override func setUpWithError() throws {
        continueAfterFailure = false
        app = XCUIApplication()
        app.launch()
    }
    
    override func tearDownWithError() throws {
        app = nil
    }
    
    // MARK: - Home Screen Tests
    
    func testHomeScreenElements() throws {
        // Verify main elements exist
        XCTAssertTrue(app.staticTexts["Study Buddy"].exists)
        XCTAssertTrue(app.staticTexts["Your AI-powered learning companion"].exists)
        XCTAssertTrue(app.staticTexts["Create New Curriculum"].exists)
        XCTAssertTrue(app.staticTexts["Your Curriculums"].exists)
    }
    
    func testTextInputSection() throws {
        // Find text editor
        let textEditor = app.textViews.firstMatch
        XCTAssertTrue(textEditor.exists)
        
        // Find create button
        let createButton = app.buttons["Create Curriculum"]
        XCTAssertTrue(createButton.exists)
        
        // Button should be disabled when text is empty
        XCTAssertFalse(createButton.isEnabled)
    }
    
    func testTextInputEnablesButton() throws {
        // Find text editor and enter text
        let textEditor = app.textViews.firstMatch
        textEditor.tap()
        textEditor.typeText("Learn Swift programming")
        
        // Create button should now be enabled
        let createButton = app.buttons["Create Curriculum"]
        XCTAssertTrue(createButton.isEnabled)
    }
    
    // MARK: - Navigation Tests
    
    func testNavigateToCurriculum() throws {
        // Wait for curriculums to load
        let timeout: TimeInterval = 5
        
        // If there's a bundled curriculum, it should appear
        let curriculumCard = app.buttons.containing(.staticText, identifier: "clusters").firstMatch
        
        if curriculumCard.waitForExistence(timeout: timeout) {
            curriculumCard.tap()
            
            // Should navigate to curriculum view
            XCTAssertTrue(app.navigationBars["Curriculum"].waitForExistence(timeout: timeout))
        }
    }
    
    func testCurriculumScreenElements() throws {
        // Navigate to curriculum if available
        let timeout: TimeInterval = 5
        let curriculumCard = app.buttons.containing(.staticText, identifier: "clusters").firstMatch
        
        guard curriculumCard.waitForExistence(timeout: timeout) else {
            // Skip if no curriculum available
            return
        }
        
        curriculumCard.tap()
        
        // Wait for curriculum to load
        Thread.sleep(forTimeInterval: 1)
        
        // Verify curriculum elements
        XCTAssertTrue(app.staticTexts["Topics"].waitForExistence(timeout: timeout))
    }
    
    // MARK: - Pull to Refresh Tests
    
    func testPullToRefresh() throws {
        // Find the scroll view
        let scrollView = app.scrollViews.firstMatch
        guard scrollView.exists else { return }
        
        // Pull to refresh
        scrollView.swipeDown()
        
        // App should still be responsive
        XCTAssertTrue(app.staticTexts["Study Buddy"].exists)
    }
    
    // MARK: - Error State Tests
    
    func testEmptyStateMessage() throws {
        // If no curriculums, should show empty state
        let emptyMessage = app.staticTexts["No curriculums yet"]
        
        // Wait a moment for content to load
        Thread.sleep(forTimeInterval: 2)
        
        // Either shows curriculums or empty state
        let hasCurriculums = app.buttons.containing(.staticText, identifier: "clusters").firstMatch.exists
        
        if !hasCurriculums {
            XCTAssertTrue(emptyMessage.exists || app.staticTexts.containing(.staticText, identifier: "curriculum").count > 0)
        }
    }
}
