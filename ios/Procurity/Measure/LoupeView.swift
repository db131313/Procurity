import SwiftUI

/// Magnifier loupe for precise point placement.
struct LoupeView: View {
    var snapshot: UIImage?
    var focus: CGPoint
    var size: CGFloat = 120
    var scale: CGFloat = 2.2

    var body: some View {
        ZStack {
            if let snapshot {
                Image(uiImage: snapshot)
                    .resizable()
                    .frame(width: size * scale, height: size * scale)
                    .offset(
                        x: size / 2 - focus.x * scale,
                        y: size / 2 - focus.y * scale
                    )
            } else {
                ProcurityTheme.offwhite
            }
            Circle()
                .stroke(ProcurityTheme.primary, lineWidth: 3)
            Circle()
                .fill(ProcurityTheme.primary)
                .frame(width: 6, height: 6)
        }
        .frame(width: size, height: size)
        .clipShape(Circle())
        .shadow(radius: 6)
        .allowsHitTesting(false)
    }
}
