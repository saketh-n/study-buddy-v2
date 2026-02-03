import SwiftUI

struct SavedCurriculumsView: View {
    @ObservedObject var viewModel: HomeViewModel
    
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            // Header with decorative lines
            HStack(spacing: 12) {
                Rectangle()
                    .fill(Color.white.opacity(0.1))
                    .frame(height: 1)
                
                Text("SAVED CURRICULUMS")
                    .font(.caption)
                    .fontWeight(.semibold)
                    .foregroundColor(.white.opacity(0.5))
                    .tracking(2)
                
                Rectangle()
                    .fill(Color.white.opacity(0.1))
                    .frame(height: 1)
                
                if viewModel.isLoading {
                    ProgressView()
                        .scaleEffect(0.7)
                        .tint(.electric400)
                }
            }
            
            if viewModel.curriculums.isEmpty && !viewModel.isLoading {
                // Empty state
                VStack(spacing: 12) {
                    Image(systemName: "book.closed")
                        .font(.system(size: 40))
                        .foregroundColor(.white.opacity(0.3))
                    
                    Text("No saved curriculums yet")
                        .font(.headline)
                        .foregroundColor(.white.opacity(0.6))
                    
                    Text("Generate your first one above!")
                        .font(.subheadline)
                        .foregroundColor(.white.opacity(0.4))
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 40)
            } else {
                ForEach(viewModel.curriculums) { curriculum in
                    NavigationLink(destination: CurriculumView(curriculumId: curriculum.id)) {
                        CurriculumCard(curriculum: curriculum)
                    }
                    .buttonStyle(.plain)
                    .contextMenu {
                        Button(role: .destructive) {
                            Task {
                                await viewModel.deleteCurriculum(curriculum.id)
                            }
                        } label: {
                            Label("Delete", systemImage: "trash")
                        }
                    }
                }
            }
        }
    }
}

struct CurriculumCard: View {
    let curriculum: CurriculumSummary
    
    private var progressPercent: Int {
        guard curriculum.topicCount > 0 else { return 0 }
        return Int((Double(curriculum.completedTopics) / Double(curriculum.topicCount)) * 100)
    }
    
    private var progressText: String {
        if curriculum.completedTopics == 0 {
            return "Not started yet"
        } else {
            return "\(curriculum.completedTopics)/\(curriculum.topicCount) topics completed"
        }
    }
    
    private var formattedDate: String {
        // Parse ISO date and format it nicely
        let isoFormatter = ISO8601DateFormatter()
        isoFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        
        // Try with fractional seconds first
        if let date = isoFormatter.date(from: curriculum.createdAt) {
            return formatDate(date)
        }
        
        // Try without fractional seconds
        isoFormatter.formatOptions = [.withInternetDateTime]
        if let date = isoFormatter.date(from: curriculum.createdAt) {
            return formatDate(date)
        }
        
        return curriculum.createdAt
    }
    
    private func formatDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d, hh:mm a"
        return formatter.string(from: date)
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Title row
            HStack {
                Text(curriculum.subject)
                    .font(.headline)
                    .fontWeight(.semibold)
                    .foregroundColor(.white)
                    .lineLimit(1)
                
                Spacer()
                
                if curriculum.isDownloaded {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundColor(.electric400)
                        .font(.caption)
                }
                
                Image(systemName: "chevron.right")
                    .foregroundColor(.white.opacity(0.3))
                    .font(.caption)
            }
            
            // Description
            Text(curriculum.description)
                .font(.subheadline)
                .foregroundColor(.white.opacity(0.6))
                .lineLimit(2)
            
            // Progress text
            Text(progressText)
                .font(.caption)
                .foregroundColor(curriculum.completedTopics > 0 ? .electric400 : .white.opacity(0.4))
            
            // Progress bar
            GeometryReader { geometry in
                ZStack(alignment: .leading) {
                    // Background
                    RoundedRectangle(cornerRadius: 2)
                        .fill(Color.white.opacity(0.1))
                        .frame(height: 4)
                    
                    // Progress
                    if progressPercent > 0 {
                        RoundedRectangle(cornerRadius: 2)
                            .fill(AppGradients.progressBar)
                            .frame(width: geometry.size.width * CGFloat(progressPercent) / 100, height: 4)
                    }
                }
            }
            .frame(height: 4)
            
            // Stats row
            HStack {
                // Clusters with green dot
                HStack(spacing: 4) {
                    ColoredDot(color: .electric400)
                    Text("\(curriculum.clusterCount) clusters")
                        .foregroundColor(.white.opacity(0.5))
                }
                
                // Topics with pink dot
                HStack(spacing: 4) {
                    ColoredDot(color: .coral400)
                    Text("\(curriculum.topicCount) topics")
                        .foregroundColor(.white.opacity(0.5))
                }
                
                // Date
                Text(formattedDate)
                    .foregroundColor(.white.opacity(0.4))
                
                Spacer()
                
                // Percentage (only if started)
                if progressPercent > 0 {
                    Text("\(progressPercent)%")
                        .fontWeight(.semibold)
                        .foregroundColor(.electric400)
                }
            }
            .font(.caption)
        }
        .padding(16)
        .glassBackground(isStrong: true)
    }
}

#Preview {
    NavigationStack {
        SavedCurriculumsView(viewModel: HomeViewModel())
            .padding()
            .appBackground()
    }
}
