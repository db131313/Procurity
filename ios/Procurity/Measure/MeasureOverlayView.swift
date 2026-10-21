import SwiftUI

struct MeasureOverlayView: View {
    @ObservedObject var session: ARMeasureSession
    @Binding var loupePoint: CGPoint?
    var onTap: (CGPoint) -> Void

    var body: some View {
        GeometryReader { geo in
            ZStack {
                Color.clear
                    .contentShape(Rectangle())
                    .gesture(
                        DragGesture(minimumDistance: 0)
                            .onChanged { value in
                                loupePoint = value.location
                                session.updateLive(at: value.location)
                            }
                            .onEnded { value in
                                loupePoint = nil
                                onTap(value.location)
                            }
                    )

                // Captured lines
                ForEach(session.lines) { line in
                    Path { path in
                        path.move(to: line.start.screen)
                        path.addLine(to: line.end.screen)
                    }
                    .stroke(ProcurityTheme.primary, style: StrokeStyle(lineWidth: 3, lineCap: .round))

                    Text(line.formatted(unit: session.unit))
                        .font(.caption.bold())
                        .padding(6)
                        .background(.white.opacity(0.92))
                        .clipShape(Capsule())
                        .position(
                            x: (line.start.screen.x + line.end.screen.x) / 2,
                            y: (line.start.screen.y + line.end.screen.y) / 2 - 16
                        )
                }

                if let start = session.pendingStart, let end = session.liveEnd {
                    Path { path in
                        path.move(to: start.screen)
                        path.addLine(to: end.screen)
                    }
                    .stroke(ProcurityTheme.primary.opacity(0.7), style: StrokeStyle(lineWidth: 2, dash: [6, 4]))
                }

                ForEach(session.rects) { rect in
                    Path { path in
                        path.move(to: rect.origin.screen)
                        path.addLine(to: rect.widthEnd.screen)
                        path.addLine(to: CGPoint(
                            x: rect.widthEnd.screen.x + (rect.heightEnd.screen.x - rect.origin.screen.x),
                            y: rect.widthEnd.screen.y + (rect.heightEnd.screen.y - rect.origin.screen.y)
                        ))
                        path.addLine(to: rect.heightEnd.screen)
                        path.closeSubpath()
                    }
                    .stroke(ProcurityTheme.primary, lineWidth: 2)

                    Text(String(format: "%.1f sq ft", rect.areaSqFt))
                        .font(.caption.bold())
                        .padding(6)
                        .background(.white.opacity(0.92))
                        .clipShape(Capsule())
                        .position(rect.origin.screen)
                }
            }
        }
        .allowsHitTesting(true)
    }
}
