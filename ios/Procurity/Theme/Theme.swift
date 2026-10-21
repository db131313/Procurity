import SwiftUI

enum ProcurityTheme {
    /// Single primary brand color — no gradients.
    static let primary = Color(red: 37 / 255, green: 99 / 255, blue: 235 / 255) // #2563EB
    static let ink = Color(red: 15 / 255, green: 23 / 255, blue: 42 / 255)
    static let slate = Color(red: 100 / 255, green: 116 / 255, blue: 139 / 255)
    static let line = Color(red: 226 / 255, green: 232 / 255, blue: 240 / 255)
    static let offwhite = Color(red: 248 / 255, green: 250 / 255, blue: 252 / 255)
    static let danger = Color(red: 185 / 255, green: 28 / 255, blue: 28 / 255)
    static let warning = Color(red: 217 / 255, green: 119 / 255, blue: 6 / 255)

    static let minTap: CGFloat = 48
}

struct PrimaryButtonStyle: ButtonStyle {
    var enabled: Bool = true

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.headline)
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity, minHeight: ProcurityTheme.minTap)
            .background(enabled ? ProcurityTheme.primary : ProcurityTheme.slate)
            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
            .opacity(configuration.isPressed ? 0.85 : 1)
    }
}

struct SecondaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.headline)
            .foregroundStyle(ProcurityTheme.ink)
            .frame(maxWidth: .infinity, minHeight: ProcurityTheme.minTap)
            .background(Color.white)
            .overlay(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .stroke(ProcurityTheme.line, lineWidth: 1)
            )
            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
            .opacity(configuration.isPressed ? 0.85 : 1)
    }
}
