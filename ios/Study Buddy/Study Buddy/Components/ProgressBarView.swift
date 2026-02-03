import SwiftUI

struct ProgressBarView: View {
    let progress: Double
    let status: String
    var showPercentage: Bool = true
    var height: CGFloat = 8
    var color: Color = .electric400
    
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            GeometryReader { geometry in
                ZStack(alignment: .leading) {
                    // Background
                    RoundedRectangle(cornerRadius: height / 2)
                        .fill(Color.white.opacity(0.1))
                    
                    // Progress
                    RoundedRectangle(cornerRadius: height / 2)
                        .fill(
                            LinearGradient(
                                colors: [color, color.opacity(0.8)],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                        .frame(width: max(0, min(geometry.size.width * progress, geometry.size.width)))
                        .animation(.easeInOut(duration: 0.3), value: progress)
                }
            }
            .frame(height: height)
            
            HStack {
                Text(status)
                    .font(.caption)
                    .foregroundColor(.white.opacity(0.5))
                
                Spacer()
                
                if showPercentage {
                    Text("\(Int(progress * 100))%")
                        .font(.caption)
                        .fontWeight(.medium)
                        .foregroundColor(color)
                }
            }
        }
    }
}

#Preview {
    VStack(spacing: 20) {
        ProgressBarView(progress: 0.7, status: "Loading...")
        ProgressBarView(progress: 0.3, status: "In progress", color: .coral400)
        ProgressBarView(progress: 1.0, status: "Complete", color: .electric400)
    }
    .padding()
    .appBackground()
}
