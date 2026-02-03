import SwiftUI
import Combine

@MainActor
class HomeViewModel: ObservableObject {
    @Published var curriculums: [CurriculumSummary] = []
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var rawText = ""
    @Published var isCreating = false
    @Published var creationProgress: Double = 0
    @Published var creationStatus: String = ""
    
    private let apiService = APIService.shared
    private let cacheService = CacheService.shared
    
    func loadCurriculums() async {
        isLoading = true
        errorMessage = nil
        
        do {
            // Try to load from API first
            curriculums = try await apiService.listCurriculums()
        } catch {
            // Fall back to cached/bundled content
            curriculums = await cacheService.listCachedCurriculums()
            if curriculums.isEmpty {
                errorMessage = "Unable to load curriculums: \(error.localizedDescription)"
            }
        }
        
        isLoading = false
    }
    
    func createCurriculum() async {
        guard !rawText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }
        
        isCreating = true
        creationProgress = 0
        creationStatus = "Starting..."
        
        do {
            let curriculumId = try await apiService.parseCurriculumStream(
                rawText: rawText,
                onProgress: { [weak self] progress, status in
                    Task { @MainActor in
                        self?.creationProgress = progress
                        self?.creationStatus = status
                    }
                }
            )
            
            // Reload curriculums after creating
            await loadCurriculums()
            
            // Clear the text input
            rawText = ""
            
        } catch {
            errorMessage = "Failed to create curriculum: \(error.localizedDescription)"
        }
        
        isCreating = false
    }
    
    func deleteCurriculum(_ id: String) async {
        do {
            try await apiService.deleteCurriculum(id)
            await loadCurriculums()
        } catch {
            errorMessage = "Failed to delete curriculum: \(error.localizedDescription)"
        }
    }
}
