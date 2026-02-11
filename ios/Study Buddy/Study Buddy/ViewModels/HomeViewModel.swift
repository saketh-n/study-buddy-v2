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
    @Published var isDownloadingAll = false
    @Published var downloadAllProgress: Double = 0
    @Published var downloadAllStatus: String = ""
    
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
    
    func downloadAllCurricula() async {
        guard !curriculums.isEmpty else { return }
        
        isDownloadingAll = true
        downloadAllProgress = 0
        downloadAllStatus = "Starting download..."
        errorMessage = nil
        
        let totalCurriculums = curriculums.count
        
        for (index, summary) in curriculums.enumerated() {
            let curriculumLabel = "\(index + 1)/\(totalCurriculums)"
            downloadAllStatus = "Fetching curriculum \(curriculumLabel): \(summary.subject)..."
            
            do {
                let record = try await apiService.getCurriculum(summary.id)
                
                try await cacheService.downloadAllContent(
                    record: record,
                    apiService: apiService
                ) { [weak self] progress, status in
                    Task { @MainActor in
                        // Aggregate progress: each curriculum is an equal slice
                        let baseProgress = Double(index) / Double(totalCurriculums)
                        let sliceProgress = progress / Double(totalCurriculums)
                        self?.downloadAllProgress = baseProgress + sliceProgress
                        self?.downloadAllStatus = "[\(curriculumLabel)] \(status)"
                    }
                }
            } catch {
                // Log the error but continue with the next curriculum
                downloadAllStatus = "Failed \(summary.subject): \(error.localizedDescription). Continuing..."
            }
        }
        
        downloadAllProgress = 1.0
        downloadAllStatus = "All curricula downloaded!"
        
        // Reload to reflect updated download status
        await loadCurriculums()
        
        isDownloadingAll = false
    }
}
