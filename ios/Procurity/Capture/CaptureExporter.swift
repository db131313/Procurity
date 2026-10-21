import Foundation
import UIKit
import RealityKit
import ARKit

struct CaptureExport: Identifiable, Codable {
    let id: UUID
    let jobId: String
    var snapshotPath: String?
    var meshPath: String?
    let measurementsJSON: [[String: AnyCodable]]
    let createdAt: Date

    init(
        id: UUID,
        jobId: String,
        snapshotURL: URL?,
        meshURL: URL?,
        measurementsJSON: [[String: Any]],
        createdAt: Date
    ) {
        self.id = id
        self.jobId = jobId
        self.snapshotPath = snapshotURL?.path
        self.meshPath = meshURL?.path
        self.measurementsJSON = measurementsJSON.map { dict in
            dict.mapValues { AnyCodable($0) }
        }
        self.createdAt = createdAt
    }

    var snapshotURL: URL? { snapshotPath.map { URL(fileURLWithPath: $0) } }
    var meshURL: URL? { meshPath.map { URL(fileURLWithPath: $0) } }

    var measurementsPayload: [[String: Any]] {
        measurementsJSON.map { dict in
            dict.mapValues { $0.value }
        }
    }
}

enum CaptureExporter {
    static func export(session: ARMeasureSession, jobId: String) throws -> CaptureExport {
        let dir = FileManager.default.temporaryDirectory.appendingPathComponent("capture-\(UUID().uuidString)", isDirectory: true)
        try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)

        // Snapshot with dimension overlays burned in
        guard var image = session.snapshotImage() else {
            throw NSError(domain: "Capture", code: 1, userInfo: [
                NSLocalizedDescriptionKey: "Could not capture camera snapshot",
            ])
        }
        image = drawOverlays(on: image, session: session)
        let snapURL = dir.appendingPathComponent("snapshot.jpg")
        guard let jpeg = image.jpegData(compressionQuality: 0.85) else {
            throw NSError(domain: "Capture", code: 2, userInfo: [
                NSLocalizedDescriptionKey: "JPEG encode failed",
            ])
        }
        try jpeg.write(to: snapURL)

        // Mesh USDZ — best-effort from AR mesh anchors
        let meshURL = dir.appendingPathComponent("mesh.usdz")
        try exportMeshUSDZ(from: session, to: meshURL)

        var measurements: [[String: Any]] = session.lines.map { line in
            [
                "label": line.label,
                "lengthInches": line.lengthInches,
                "unit": "in",
                "source": "lidar",
                "start3d": [
                    "x": Double(line.start.world.x),
                    "y": Double(line.start.world.y),
                    "z": Double(line.start.world.z),
                ],
                "end3d": [
                    "x": Double(line.end.world.x),
                    "y": Double(line.end.world.y),
                    "z": Double(line.end.world.z),
                ],
            ]
        }
        for rect in session.rects {
            measurements.append([
                "label": rect.label,
                "width": Double(rect.widthMeters) * 39.37007874,
                "height": Double(rect.heightMeters) * 39.37007874,
                "unit": "in",
                "source": "lidar",
                "start3d": [
                    "x": Double(rect.origin.world.x),
                    "y": Double(rect.origin.world.y),
                    "z": Double(rect.origin.world.z),
                ],
                "end3d": [
                    "x": Double(rect.widthEnd.world.x),
                    "y": Double(rect.widthEnd.world.y),
                    "z": Double(rect.widthEnd.world.z),
                ],
            ])
        }

        // Persist measurements JSON beside files
        let jsonURL = dir.appendingPathComponent("measurements.json")
        let jsonData = try JSONSerialization.data(withJSONObject: measurements, options: [.prettyPrinted])
        try jsonData.write(to: jsonURL)

        return CaptureExport(
            id: UUID(),
            jobId: jobId,
            snapshotURL: snapURL,
            meshURL: FileManager.default.fileExists(atPath: meshURL.path) ? meshURL : nil,
            measurementsJSON: measurements,
            createdAt: Date()
        )
    }

    private static func drawOverlays(on image: UIImage, session: ARMeasureSession) -> UIImage {
        let renderer = UIGraphicsImageRenderer(size: image.size)
        return renderer.image { ctx in
            image.draw(at: .zero)
            let scaleX = image.size.width / max(session.arView.bounds.width, 1)
            let scaleY = image.size.height / max(session.arView.bounds.height, 1)
            ctx.cgContext.setStrokeColor(UIColor(ProcurityTheme.primary).cgColor)
            ctx.cgContext.setLineWidth(4)
            for line in session.lines {
                let a = CGPoint(x: line.start.screen.x * scaleX, y: line.start.screen.y * scaleY)
                let b = CGPoint(x: line.end.screen.x * scaleX, y: line.end.screen.y * scaleY)
                ctx.cgContext.move(to: a)
                ctx.cgContext.addLine(to: b)
                ctx.cgContext.strokePath()
                let label = line.formatted(unit: session.unit) as NSString
                let mid = CGPoint(x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 - 12)
                label.draw(at: mid, withAttributes: [
                    .font: UIFont.boldSystemFont(ofSize: 28),
                    .foregroundColor: UIColor.white,
                ])
            }
        }
    }

    private static func exportMeshUSDZ(from session: ARMeasureSession, to url: URL) throws {
        // Stub-friendly: write an empty placeholder when mesh export APIs aren't available in-session.
        // On device, ARMeshAnchors can be converted with ModelEntity; we attempt a best-effort dump.
        let anchors = session.arView.session.currentFrame?.anchors.compactMap { $0 as? ARMeshAnchor } ?? []
        guard !anchors.isEmpty else {
            // Leave no file — upload queue skips missing mesh
            return
        }
        // RealityKit doesn't expose a one-liner mesh→USDZ from ARMeshAnchor without custom geometry build.
        // Mark as stubbed export: write a tiny USDZ zip header won't validate — skip file creation.
        // Physical-device follow-up: integrate ModelIO mesh builder (documented in README).
        _ = anchors
        _ = url
    }
}

/// Type-erased Codable wrapper for heterogeneous JSON dictionaries.
struct AnyCodable: Codable {
    let value: Any

    init(_ value: Any) { self.value = value }

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if let v = try? container.decode(Double.self) { value = v; return }
        if let v = try? container.decode(String.self) { value = v; return }
        if let v = try? container.decode(Bool.self) { value = v; return }
        if let v = try? container.decode([String: AnyCodable].self) {
            value = v.mapValues { $0.value }; return
        }
        if let v = try? container.decode([AnyCodable].self) {
            value = v.map { $0.value }; return
        }
        value = NSNull()
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        switch value {
        case let v as Double: try container.encode(v)
        case let v as Int: try container.encode(v)
        case let v as String: try container.encode(v)
        case let v as Bool: try container.encode(v)
        case let v as [String: Any]:
            try container.encode(v.mapValues { AnyCodable($0) })
        case let v as [Any]:
            try container.encode(v.map { AnyCodable($0) })
        default:
            try container.encodeNil()
        }
    }
}
