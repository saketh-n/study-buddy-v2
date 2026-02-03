import SwiftUI

struct HomeView: View {
    @StateObject private var viewModel = HomeViewModel()
    
    var body: some View {
        ScrollView {
            VStack(spacing: 32) {
                // Header
                VStack(spacing: 16) {
                    // AI-Powered Learning badge
                    HStack(spacing: 8) {
                        PulsingDot(color: .electric400, size: 8)
                        Text("AI-Powered Learning")
                            .font(.caption)
                            .fontWeight(.medium)
                            .foregroundColor(.white.opacity(0.7))
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 8)
                    .glassBackground()
                    
                    // Title: "Study" (white) + "Buddy" (gradient)
                    HStack(spacing: 0) {
                        Text("Study")
                            .font(.system(size: 48, weight: .black, design: .rounded))
                            .foregroundColor(.white)
                        Text("Buddy")
                            .font(.system(size: 48, weight: .black, design: .rounded))
                            .gradientText()
                    }
                    
                    // Subtitle
                    Text("Paste your learning topics and let AI organize them into a structured curriculum with the optimal learning path.")
                        .font(.body)
                        .foregroundColor(.white.opacity(0.6))
                        .multilineTextAlignment(.center)
                        .padding(.horizontal)
                }
                .padding(.top, 20)
                
                // Text Input Section
                TextInputView(viewModel: viewModel)
                
                // Saved Curriculums Section
                SavedCurriculumsView(viewModel: viewModel)
            }
            .padding()
        }
        .appBackground()
        .navigationBarHidden(true)
        .task {
            await viewModel.loadCurriculums()
        }
        .refreshable {
            await viewModel.loadCurriculums()
        }
    }
}

#Preview {
    NavigationStack {
        HomeView()
    }
}
