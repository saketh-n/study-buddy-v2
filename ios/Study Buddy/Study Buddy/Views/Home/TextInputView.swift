import SwiftUI

struct TextInputView: View {
    @ObservedObject var viewModel: HomeViewModel
    
    private let placeholderText = """
Paste your learning topics here...

Example:
- Virtual Machines
- Containers and Docker
- Kubernetes
- Load Balancing
- Auto Scaling
- Serverless Computing
- Cloud Storage (S3, Blob)
- CDN and Edge Computing
- Database Replication
- Caching Strategies (Redis, Memcached)
"""
    
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            // Text Editor with placeholder
            ZStack(alignment: .topLeading) {
                // Placeholder
                if viewModel.rawText.isEmpty {
                    Text(placeholderText)
                        .font(.body)
                        .foregroundColor(.white.opacity(0.3))
                        .padding(.horizontal, 12)
                        .padding(.vertical, 16)
                }
                
                // Text Editor
                TextEditor(text: $viewModel.rawText)
                    .font(.body)
                    .foregroundColor(.white)
                    .scrollContentBackground(.hidden)
                    .background(Color.clear)
                    .frame(minHeight: 200)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 8)
            }
            .padding(4)
            .glassBackground(isStrong: true)
            .overlay(
                // Character count
                Text("\(viewModel.rawText.count)")
                    .font(.caption)
                    .foregroundColor(.white.opacity(0.4))
                    .padding(12),
                alignment: .bottomTrailing
            )
            
            // Progress section (when creating)
            if viewModel.isCreating {
                VStack(spacing: 8) {
                    ProgressView(value: viewModel.creationProgress)
                        .progressViewStyle(.linear)
                        .tint(.electric400)
                    
                    Text(viewModel.creationStatus)
                        .font(.caption)
                        .foregroundColor(.white.opacity(0.6))
                }
                .padding()
                .glassBackground()
            }
            
            // Generate button
            Button(action: {
                Task {
                    await viewModel.createCurriculum()
                }
            }) {
                HStack(spacing: 12) {
                    if viewModel.isCreating {
                        ProgressView()
                            .progressViewStyle(CircularProgressViewStyle(tint: .midnight950))
                            .scaleEffect(0.8)
                    } else {
                        Image(systemName: "sparkles")
                    }
                    Text(viewModel.isCreating ? "Generating..." : "Generate Learning Path")
                        .fontWeight(.bold)
                }
            }
            .buttonStyle(ElectricButtonStyle(isEnabled: !viewModel.rawText.isEmpty && !viewModel.isCreating))
            .disabled(viewModel.rawText.isEmpty || viewModel.isCreating)
            
            // Error message
            if let error = viewModel.errorMessage {
                Text(error)
                    .font(.caption)
                    .foregroundColor(.coral400)
                    .padding()
                    .frame(maxWidth: .infinity)
                    .glassBackground()
            }
        }
    }
}

#Preview {
    TextInputView(viewModel: HomeViewModel())
        .padding()
        .appBackground()
}
