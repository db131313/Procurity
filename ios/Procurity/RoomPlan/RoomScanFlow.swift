import SwiftUI
import RoomPlan

struct RoomScanFlow: View {
    let jobId: String
    @EnvironmentObject private var auth: AuthViewModel
    @EnvironmentObject private var uploadQueue: UploadQueue
    @Environment(\.dismiss) private var dismiss

    @StateObject private var model = RoomScanModel()
    @State private var error: String?
    @State private var busy = false

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                RoomCaptureViewRepresentable(model: model)
                    .ignoresSafeArea(edges: .bottom)

                VStack(spacing: 12) {
                    Text(model.statusText)
                        .font(.footnote)
                        .foregroundStyle(ProcurityTheme.slate)
                        .frame(maxWidth: .infinity, alignment: .leading)

                    if !model.dimensionLines.isEmpty {
                        ForEach(model.dimensionLines, id: \.label) { line in
                            HStack {
                                Text(line.label)
                                Spacer()
                                Text(String(format: "%.1f in", line.inches))
                                    .foregroundStyle(ProcurityTheme.slate)
                            }
                            .font(.subheadline)
                        }
                    }

                    HStack(spacing: 12) {
                        Button("Cancel") { dismiss() }
                            .buttonStyle(SecondaryButtonStyle())
                        Button(model.isScanning ? "Stop & export" : "Start scan") {
                            if model.isScanning {
                                Task { await finish() }
                            } else {
                                model.start()
                            }
                        }
                        .buttonStyle(PrimaryButtonStyle(enabled: !busy))
                    }
                }
                .padding()
                .background(Color.white)
            }
            .navigationTitle("Scan room")
            .navigationBarTitleDisplayMode(.inline)
            .alert("RoomPlan", isPresented: Binding(
                get: { error != nil },
                set: { if !$0 { error = nil } }
            )) {
                Button("OK", role: .cancel) {}
            } message: {
                Text(error ?? "")
            }
        }
    }

    private func finish() async {
        busy = true
        defer { busy = false }
        do {
            try await model.stopAndExport()
            let export = try model.makeCaptureExport(jobId: jobId)
            uploadQueue.enqueue(export)
            await uploadQueue.flush(auth: auth)
            dismiss()
        } catch {
            self.error = error.localizedDescription
        }
    }
}

@MainActor
final class RoomScanModel: ObservableObject {
    @Published var isScanning = false
    @Published var statusText = "Walk the room slowly. RoomPlan needs LiDAR."
    @Published var dimensionLines: [(label: String, inches: Double)] = []

    fileprivate var captureView: RoomCaptureView?
    private var finalResult: CapturedRoom?
    private var usdzURL: URL?

    func start() {
        guard let captureView else { return }
        isScanning = true
        statusText = "Scanning…"
        captureView.captureSession.run(configuration: .init())
    }

    func stopAndExport() async throws {
        guard let captureView else { return }
        captureView.captureSession.stop()
        isScanning = false
        statusText = "Processing room…"
        // Result arrives via delegate
        try await Task.sleep(nanoseconds: 500_000_000)
        guard let room = finalResult else {
            throw NSError(domain: "RoomPlan", code: 1, userInfo: [
                NSLocalizedDescriptionKey: "No room captured. Try again with better lighting and clearer walls.",
            ])
        }
        dimensionLines = RoomScanModel.extractDimensions(room)
        let url = FileManager.default.temporaryDirectory.appendingPathComponent("room-\(UUID().uuidString).usdz")
        try room.export(to: url)
        usdzURL = url
        statusText = "Room ready"
    }

    func makeCaptureExport(jobId: String) throws -> CaptureExport {
        guard let usdzURL else {
            throw NSError(domain: "RoomPlan", code: 2, userInfo: [
                NSLocalizedDescriptionKey: "Missing USDZ export",
            ])
        }
        let measurements: [[String: Any]] = dimensionLines.map { line in
            [
                "label": line.label,
                "lengthInches": line.inches,
                "unit": "in",
                "source": "roomplan",
            ]
        }
        return CaptureExport(
            id: UUID(),
            jobId: jobId,
            snapshotURL: nil,
            meshURL: usdzURL,
            measurementsJSON: measurements,
            createdAt: Date()
        )
    }

    static func extractDimensions(_ room: CapturedRoom) -> [(label: String, inches: Double)] {
        var lines: [(String, Double)] = []
        // Approximate room footprint from walls
        for (idx, wall) in room.walls.enumerated() {
            let extent = wall.dimensions
            let inches = Double(extent.x) * 39.37007874
            lines.append(("Wall \(idx + 1) length", inches))
        }
        if let floor = room.floors.first {
            let w = Double(floor.dimensions.x) * 39.37007874
            let d = Double(floor.dimensions.z) * 39.37007874
            lines.append(("Room width", w))
            lines.append(("Room depth", d))
        }
        return lines
    }

    fileprivate func setResult(_ room: CapturedRoom) {
        finalResult = room
    }
}

struct RoomCaptureViewRepresentable: UIViewRepresentable {
    @ObservedObject var model: RoomScanModel

    func makeCoordinator() -> Coordinator {
        Coordinator(model: model)
    }

    func makeUIView(context: Context) -> RoomCaptureView {
        let view = RoomCaptureView(frame: .zero)
        view.delegate = context.coordinator
        model.captureView = view
        return view
    }

    func updateUIView(_ uiView: RoomCaptureView, context: Context) {}

    final class Coordinator: NSObject, RoomCaptureViewDelegate {
        let model: RoomScanModel
        init(model: RoomScanModel) { self.model = model }

        func captureView(
            shouldPresent roomDataForProcessing: CapturedRoomData,
            error: (any Error)?
        ) -> Bool {
            true
        }

        func captureView(
            didPresent processedResult: CapturedRoom,
            error: (any Error)?
        ) {
            Task { @MainActor in
                if let error {
                    model.statusText = error.localizedDescription
                } else {
                    model.setResult(processedResult)
                    model.dimensionLines = RoomScanModel.extractDimensions(processedResult)
                    model.statusText = "Room captured — tap Stop & export"
                }
            }
        }
    }
}
