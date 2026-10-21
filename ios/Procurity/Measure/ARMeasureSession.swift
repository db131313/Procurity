import Foundation
import ARKit
import RealityKit
import Combine
import UIKit

/// ARKit world tracking + mesh reconstruction + scene depth for LiDAR measuring.
@MainActor
final class ARMeasureSession: NSObject, ObservableObject, ARSessionDelegate {
    let arView = ARView(frame: .zero)
    @Published var hint: TrackingHint = .good
    @Published var meshCoverage: String = "Move slowly to build the mesh…"
    @Published var pendingStart: MeasurePoint?
    @Published var liveEnd: MeasurePoint?
    @Published var lines: [CapturedLine] = []
    @Published var rects: [CapturedRect] = []
    @Published var mode: MeasureMode = .line
    @Published var unit: LengthUnit = .imperial
    @Published var selectedLabel: String = MeasurePresets.lines[0].label
    @Published var undoStack: [UndoAction] = []

    private var rectCorners: [MeasurePoint] = []
    private var meshAnchorCount = 0

    enum UndoAction {
        case line(UUID)
        case rect(UUID)
    }

    func start() {
        guard ARWorldTrackingConfiguration.supportsSceneReconstruction(.mesh) else {
            hint = .limited("LiDAR mesh reconstruction is not available on this device.")
            return
        }
        let config = ARWorldTrackingConfiguration()
        config.sceneReconstruction = .mesh
        if ARWorldTrackingConfiguration.supportsFrameSemantics(.sceneDepth) {
            config.frameSemantics.insert(.sceneDepth)
        }
        config.environmentTexturing = .automatic
        arView.session.delegate = self
        arView.debugOptions.insert(.showSceneUnderstanding)
        arView.environment.sceneUnderstanding.options.insert(.occlusion)
        arView.session.run(config, options: [.resetTracking, .removeExistingAnchors])
    }

    func stop() {
        arView.session.pause()
    }

    func handleTap(at screenPoint: CGPoint) {
        guard let result = raycast(to: screenPoint) else {
            hint = .limited("No mesh hit — keep scanning until the overlay fills in.")
            return
        }
        let point = MeasurePoint(world: result, screen: screenPoint)
        let distance = distanceFromCamera(to: result)
        if distance > AppConfig.maxReliableRangeMeters {
            hint = .outOfRange
        } else {
            hint = .good
        }

        switch mode {
        case .line:
            if pendingStart == nil {
                pendingStart = point
                liveEnd = nil
            } else if let start = pendingStart {
                let line = CapturedLine(id: UUID(), label: selectedLabel, start: start, end: point)
                lines.append(line)
                undoStack.append(.line(line.id))
                pendingStart = nil
                liveEnd = nil
            }
        case .rectangle:
            rectCorners.append(point)
            if rectCorners.count == 1 {
                pendingStart = point
            } else if rectCorners.count == 2 {
                liveEnd = point
            } else if rectCorners.count >= 3 {
                let origin = rectCorners[0]
                let widthEnd = rectCorners[1]
                let heightEnd = rectCorners[2]
                let rect = CapturedRect(
                    id: UUID(),
                    label: selectedLabel.isEmpty ? "Sign face" : selectedLabel,
                    origin: origin,
                    widthEnd: widthEnd,
                    heightEnd: heightEnd
                )
                rects.append(rect)
                undoStack.append(.rect(rect.id))
                rectCorners = []
                pendingStart = nil
                liveEnd = nil
            }
        }
    }

    func updateLive(at screenPoint: CGPoint) {
        guard pendingStart != nil, let world = raycast(to: screenPoint) else { return }
        liveEnd = MeasurePoint(world: world, screen: screenPoint)
        let distance = distanceFromCamera(to: world)
        hint = distance > AppConfig.maxReliableRangeMeters ? .outOfRange : .good
    }

    func dragAdjust(lineId: UUID, end: Bool, to screenPoint: CGPoint) {
        guard let world = raycast(to: screenPoint),
              let idx = lines.firstIndex(where: { $0.id == lineId }) else { return }
        if end {
            lines[idx].end = MeasurePoint(world: world, screen: screenPoint)
        } else {
            lines[idx].start = MeasurePoint(world: world, screen: screenPoint)
        }
    }

    func deleteLine(_ id: UUID) {
        lines.removeAll { $0.id == id }
    }

    func deleteRect(_ id: UUID) {
        rects.removeAll { $0.id == id }
    }

    func undo() {
        guard let action = undoStack.popLast() else { return }
        switch action {
        case .line(let id): deleteLine(id)
        case .rect(let id): deleteRect(id)
        }
    }

    func cancelPending() {
        pendingStart = nil
        liveEnd = nil
        rectCorners = []
    }

    func snapshotImage() -> UIImage? {
        arView.snapshot()
    }

    // MARK: - Raycast

    private func raycast(to point: CGPoint) -> SIMD3<Float>? {
        let results = arView.raycast(from: point, allowing: .estimatedPlane, alignment: .any)
        if let first = results.first {
            return first.worldTransform.translation
        }
        // Prefer existing mesh via scene understanding raycast
        let meshResults = arView.raycast(from: point, allowing: .existingPlaneGeometry, alignment: .any)
        return meshResults.first?.worldTransform.translation
    }

    private func distanceFromCamera(to world: SIMD3<Float>) -> Float {
        guard let frame = arView.session.currentFrame else { return 0 }
        let cam = frame.camera.transform.translation
        return simd_distance(cam, world)
    }

    nonisolated func session(_ session: ARSession, didAdd anchors: [ARAnchor]) {
        let meshAdds = anchors.compactMap { $0 as? ARMeshAnchor }.count
        guard meshAdds > 0 else { return }
        Task { @MainActor in
            self.meshAnchorCount += meshAdds
            self.meshCoverage = "Mesh anchors: \(self.meshAnchorCount) — keep circling the surface"
        }
    }

    nonisolated func session(_ session: ARSession, cameraDidChangeTrackingState camera: ARCamera) {
        Task { @MainActor in
            switch camera.trackingState {
            case .normal:
                if case .outOfRange = self.hint { break } else { self.hint = .good }
            case .limited(let reason):
                self.hint = .limited(String(describing: reason))
            case .notAvailable:
                self.hint = .limited("Tracking unavailable")
            @unknown default:
                break
            }
        }
    }
}

private extension simd_float4x4 {
    var translation: SIMD3<Float> {
        SIMD3(columns.3.x, columns.3.y, columns.3.z)
    }
}
