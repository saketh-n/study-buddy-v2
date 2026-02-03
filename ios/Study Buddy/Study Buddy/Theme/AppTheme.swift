import SwiftUI

// MARK: - Color Definitions

extension Color {
    // Midnight palette (dark blues)
    static let midnight50 = Color(hex: "f0f4f8")
    static let midnight100 = Color(hex: "d9e2ec")
    static let midnight200 = Color(hex: "bcccdc")
    static let midnight300 = Color(hex: "9fb3c8")
    static let midnight400 = Color(hex: "829ab1")
    static let midnight500 = Color(hex: "627d98")
    static let midnight600 = Color(hex: "486581")
    static let midnight700 = Color(hex: "334e68")
    static let midnight800 = Color(hex: "243b53")
    static let midnight900 = Color(hex: "102a43")
    static let midnight950 = Color(hex: "0a1929")
    
    // Electric accent (mint green)
    static let electric400 = Color(hex: "60f5c4")
    static let electric500 = Color(hex: "38e8b0")
    static let electric600 = Color(hex: "1dd19b")
    
    // Coral accent (pink)
    static let coral400 = Color(hex: "ff7eb3")
    static let coral500 = Color(hex: "ff5c9a")
    static let coral600 = Color(hex: "e84381")
    
    // Convenience initializer for hex strings
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3: // RGB (12-bit)
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: // RGB (24-bit)
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB (32-bit)
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (1, 1, 1, 0)
        }
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue: Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}

// MARK: - Gradients

struct AppGradients {
    // Main background gradient
    static let background = LinearGradient(
        gradient: Gradient(colors: [
            Color.midnight950,
            Color.midnight900,
            Color(hex: "1a3a5c")
        ]),
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )
    
    // Electric button gradient
    static let electricButton = LinearGradient(
        gradient: Gradient(colors: [
            Color.electric500,
            Color.electric400
        ]),
        startPoint: .leading,
        endPoint: .trailing
    )
    
    // Text gradient (green to pink)
    static let textGradient = LinearGradient(
        gradient: Gradient(colors: [
            Color.electric400,
            Color.coral400
        ]),
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )
    
    // Progress bar gradient
    static let progressBar = LinearGradient(
        gradient: Gradient(colors: [
            Color.electric500,
            Color.electric400
        ]),
        startPoint: .leading,
        endPoint: .trailing
    )
    
    // Timeline gradient
    static let timeline = LinearGradient(
        gradient: Gradient(colors: [
            Color.electric500.opacity(0.5),
            Color.coral500.opacity(0.3),
            Color.clear
        ]),
        startPoint: .top,
        endPoint: .bottom
    )
}

// MARK: - View Modifiers

struct GlassBackground: ViewModifier {
    var isStrong: Bool = false
    
    func body(content: Content) -> some View {
        content
            .background(
                RoundedRectangle(cornerRadius: 16)
                    .fill(Color.white.opacity(isStrong ? 0.06 : 0.03))
                    .background(
                        RoundedRectangle(cornerRadius: 16)
                            .fill(.ultraThinMaterial)
                            .opacity(0.3)
                    )
            )
            .overlay(
                RoundedRectangle(cornerRadius: 16)
                    .stroke(Color.white.opacity(isStrong ? 0.12 : 0.08), lineWidth: 1)
            )
    }
}

struct GlowEffect: ViewModifier {
    var color: Color = .electric400
    var radius: CGFloat = 30
    var opacity: Double = 0.15
    
    func body(content: Content) -> some View {
        content
            .shadow(color: color.opacity(opacity), radius: radius)
    }
}

struct GradientText: ViewModifier {
    func body(content: Content) -> some View {
        content
            .overlay(
                AppGradients.textGradient
                    .mask(content)
            )
    }
}

struct AppBackground: ViewModifier {
    func body(content: Content) -> some View {
        ZStack {
            AppGradients.background
                .ignoresSafeArea()
            content
        }
    }
}

// MARK: - View Extensions

extension View {
    func glassBackground(isStrong: Bool = false) -> some View {
        modifier(GlassBackground(isStrong: isStrong))
    }
    
    func glow(color: Color = .electric400, radius: CGFloat = 30, opacity: Double = 0.15) -> some View {
        modifier(GlowEffect(color: color, radius: radius, opacity: opacity))
    }
    
    func gradientText() -> some View {
        modifier(GradientText())
    }
    
    func appBackground() -> some View {
        modifier(AppBackground())
    }
}

// MARK: - Custom Button Styles

struct ElectricButtonStyle: ButtonStyle {
    var isEnabled: Bool = true
    
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.headline)
            .fontWeight(.bold)
            .foregroundColor(isEnabled ? .midnight950 : .white.opacity(0.3))
            .padding(.vertical, 16)
            .padding(.horizontal, 24)
            .frame(maxWidth: .infinity)
            .background(
                Group {
                    if isEnabled {
                        AppGradients.electricButton
                    } else {
                        LinearGradient(
                            colors: [Color.midnight700, Color.midnight600],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    }
                }
            )
            .cornerRadius(12)
            .scaleEffect(configuration.isPressed ? 0.98 : 1.0)
            .animation(.easeInOut(duration: 0.1), value: configuration.isPressed)
            .glow(color: isEnabled ? .electric400 : .clear)
    }
}

struct GlassButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.subheadline)
            .fontWeight(.semibold)
            .foregroundColor(.white.opacity(0.8))
            .padding(.vertical, 12)
            .padding(.horizontal, 20)
            .glassBackground()
            .scaleEffect(configuration.isPressed ? 0.98 : 1.0)
            .animation(.easeInOut(duration: 0.1), value: configuration.isPressed)
    }
}

// MARK: - Text Styles

extension Font {
    static let appTitle = Font.system(size: 48, weight: .black, design: .rounded)
    static let appHeadline = Font.system(size: 24, weight: .bold, design: .rounded)
    static let appSubheadline = Font.system(size: 16, weight: .medium, design: .rounded)
    static let appBody = Font.system(size: 14, weight: .regular, design: .rounded)
    static let appCaption = Font.system(size: 12, weight: .medium, design: .rounded)
}

// MARK: - Reusable Components

struct ColoredDot: View {
    let color: Color
    var size: CGFloat = 8
    
    var body: some View {
        Circle()
            .fill(color)
            .frame(width: size, height: size)
    }
}

struct PulsingDot: View {
    let color: Color
    var size: CGFloat = 8
    @State private var isAnimating = false
    
    var body: some View {
        Circle()
            .fill(color)
            .frame(width: size, height: size)
            .opacity(isAnimating ? 0.7 : 1.0)
            .onAppear {
                withAnimation(.easeInOut(duration: 1.0).repeatForever(autoreverses: true)) {
                    isAnimating = true
                }
            }
    }
}

struct NumberBadge: View {
    let number: Int
    var size: CGFloat = 32
    var useGradient: Bool = false
    
    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 8)
                .fill(
                    useGradient
                        ? AnyShapeStyle(AppGradients.textGradient)
                        : AnyShapeStyle(Color.electric500.opacity(0.2))
                )
                .frame(width: size, height: size)
            
            Text("\(number)")
                .font(.system(size: size * 0.5, weight: .bold, design: .monospaced))
                .foregroundColor(useGradient ? .midnight950 : .electric400)
        }
    }
}

struct StatusIndicator: View {
    enum Status {
        case ready
        case generating
        case pending
    }
    
    let status: Status
    let label: String
    
    var body: some View {
        HStack(spacing: 4) {
            switch status {
            case .ready:
                Image(systemName: "book")
                    .font(.caption2)
                    .foregroundColor(.electric400.opacity(0.7))
            case .generating:
                ProgressView()
                    .scaleEffect(0.5)
                    .frame(width: 12, height: 12)
            case .pending:
                Image(systemName: "clock")
                    .font(.caption2)
                    .foregroundColor(.white.opacity(0.3))
            }
            
            Text(label)
                .font(.caption2)
                .foregroundColor(status == .ready ? .electric400.opacity(0.7) : .white.opacity(0.3))
        }
    }
}

// MARK: - Preview

#Preview {
    ScrollView {
        VStack(spacing: 20) {
            // Colors
            HStack {
                ColoredDot(color: .electric400)
                Text("Electric")
                ColoredDot(color: .coral400)
                Text("Coral")
            }
            .foregroundColor(.white)
            
            // Gradient text
            Text("Gradient Text")
                .font(.appTitle)
                .gradientText()
            
            // Glass backgrounds
            VStack {
                Text("Glass Background")
                    .foregroundColor(.white)
            }
            .padding()
            .glassBackground()
            
            VStack {
                Text("Strong Glass")
                    .foregroundColor(.white)
            }
            .padding()
            .glassBackground(isStrong: true)
            
            // Buttons
            Button("Electric Button") {}
                .buttonStyle(ElectricButtonStyle())
            
            Button("Glass Button") {}
                .buttonStyle(GlassButtonStyle())
            
            // Number badges
            HStack {
                NumberBadge(number: 1)
                NumberBadge(number: 2, useGradient: true)
                NumberBadge(number: 3)
            }
            
            // Status indicators
            HStack {
                StatusIndicator(status: .ready, label: "Lesson ready")
                StatusIndicator(status: .generating, label: "Generating...")
                StatusIndicator(status: .pending, label: "Pending")
            }
            
            // Pulsing dot
            HStack {
                PulsingDot(color: .electric400)
                Text("AI-Powered Learning")
                    .foregroundColor(.white)
            }
        }
        .padding()
    }
    .appBackground()
}
