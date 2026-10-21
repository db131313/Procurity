import Foundation
import Combine

/// Offline-capable upload queue with progress + retry.
@MainActor
final class UploadQueue: ObservableObject {
    @Published private(set) var items: [CaptureExport] = []
    @Published var progress: Double = 0
    @Published var lastError: String?

    var pendingCount: Int { items.count }

    private let storeURL: URL = {
        let dir = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
        return dir.appendingPathComponent("upload-queue.json")
    }()

    init() {
        load()
    }

    func enqueue(_ export: CaptureExport) {
        items.append(export)
        save()
    }

    func flush(auth: AuthViewModel) async {
        lastError = nil
        let client = APIClient(auth: auth)
        var remaining: [CaptureExport] = []
        for (idx, item) in items.enumerated() {
            progress = Double(idx) / Double(max(items.count, 1))
            do {
                if let snap = item.snapshotURL,
                   FileManager.default.fileExists(atPath: snap.path) {
                    _ = try await client.uploadScan(
                        jobId: item.jobId,
                        fileURL: snap,
                        fileName: "lidar-snapshot.jpg",
                        mimeType: "image/jpeg",
                        kind: "snapshot"
                    ) { self.progress = $0 }
                }
                if let mesh = item.meshURL,
                   FileManager.default.fileExists(atPath: mesh.path) {
                    _ = try await client.uploadScan(
                        jobId: item.jobId,
                        fileURL: mesh,
                        fileName: "lidar-mesh.usdz",
                        mimeType: "model/vnd.usdz+zip",
                        kind: "mesh"
                    ) { self.progress = $0 }
                }
                if !item.measurementsPayload.isEmpty {
                    try await client.uploadMeasurements(
                        jobId: item.jobId,
                        payload: item.measurementsPayload
                    )
                }
            } catch {
                lastError = error.localizedDescription
                remaining.append(item)
            }
        }
        items = remaining
        save()
        progress = remaining.isEmpty ? 1 : progress
    }

    private func save() {
        do {
            let data = try JSONEncoder().encode(items)
            try data.write(to: storeURL, options: .atomic)
        } catch {
            lastError = "Could not persist offline queue"
        }
    }

    private func load() {
        guard let data = try? Data(contentsOf: storeURL),
              let decoded = try? JSONDecoder().decode([CaptureExport].self, from: data) else {
            return
        }
        items = decoded
    }
}
