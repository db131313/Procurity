import SwiftUI
import RealityKit

struct LiDARMeasureFlow: View {
    let jobId: String
    @EnvironmentObject private var auth: AuthViewModel
    @EnvironmentObject private var uploadQueue: UploadQueue
    @Environment(\.dismiss) private var dismiss

    @StateObject private var session = ARMeasureSession()
    @State private var loupePoint: CGPoint?
    @State private var loupeImage: UIImage?
    @State private var busy = false
    @State private var error: String?
    @State private var status: String?

    var body: some View {
        ZStack {
            ARViewContainer(session: session)
                .ignoresSafeArea()

            MeasureOverlayView(session: session, loupePoint: $loupePoint) { point in
                session.handleTap(at: point)
            }

            if let loupePoint {
                LoupeView(snapshot: loupeImage ?? session.snapshotImage(), focus: loupePoint)
                    .position(x: loupePoint.x, y: max(90, loupePoint.y - 90))
            }

            VStack {
                topBar
                if let message = session.hint.message {
                    Text(message)
                        .font(.footnote.weight(.semibold))
                        .foregroundStyle(.white)
                        .padding(10)
                        .background(ProcurityTheme.warning.opacity(0.95))
                        .clipShape(RoundedRectangle(cornerRadius: 10))
                        .padding(.horizontal)
                }
                Text(session.meshCoverage)
                    .font(.caption)
                    .foregroundStyle(.white)
                    .padding(8)
                    .background(.black.opacity(0.45))
                    .clipShape(Capsule())
                Spacer()
                bottomBar
            }
            .padding(.vertical, 12)
        }
        .onAppear { session.start() }
        .onDisappear { session.stop() }
        .alert("Upload", isPresented: Binding(
            get: { error != nil },
            set: { if !$0 { error = nil } }
        )) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(error ?? "")
        }
    }

    private var topBar: some View {
        HStack {
            Button("Close") { dismiss() }
                .foregroundStyle(.white)
                .frame(minWidth: 64, minHeight: ProcurityTheme.minTap)
            Spacer()
            Picker("Unit", selection: $session.unit) {
                ForEach(LengthUnit.allCases) { Text($0.title).tag($0) }
            }
            .pickerStyle(.segmented)
            .frame(maxWidth: 180)
            Spacer()
            Button("Undo") { session.undo() }
                .foregroundStyle(.white)
                .frame(minWidth: 64, minHeight: ProcurityTheme.minTap)
        }
        .padding(.horizontal)
    }

    private var bottomBar: some View {
        VStack(spacing: 10) {
            Picker("Mode", selection: $session.mode) {
                ForEach(MeasureMode.allCases) { Text($0.title).tag($0) }
            }
            .pickerStyle(.segmented)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack {
                    ForEach(MeasurePresets.lines) { preset in
                        Button(preset.label) {
                            session.selectedLabel = preset.label
                        }
                        .padding(.horizontal, 14)
                        .frame(minHeight: 40)
                        .background(session.selectedLabel == preset.label ? ProcurityTheme.primary : Color.white)
                        .foregroundStyle(session.selectedLabel == preset.label ? Color.white : ProcurityTheme.ink)
                        .clipShape(Capsule())
                    }
                }
            }

            if !session.lines.isEmpty || !session.rects.isEmpty {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack {
                        ForEach(session.lines) { line in
                            HStack {
                                Text("\(line.label): \(line.formatted(unit: session.unit))")
                                    .font(.caption)
                                Button(role: .destructive) {
                                    session.deleteLine(line.id)
                                } label: {
                                    Image(systemName: "xmark.circle.fill")
                                }
                            }
                            .padding(8)
                            .background(Color.white)
                            .clipShape(Capsule())
                        }
                    }
                }
            }

            if let status {
                Text(status).font(.caption).foregroundStyle(.white)
            }

            Button {
                Task { await captureAndUpload() }
            } label: {
                if busy {
                    ProgressView()
                } else {
                    Text("Capture & upload")
                }
            }
            .buttonStyle(PrimaryButtonStyle(enabled: !busy && (!session.lines.isEmpty || !session.rects.isEmpty)))
            .disabled(busy || (session.lines.isEmpty && session.rects.isEmpty))
        }
        .padding()
        .background(.ultraThinMaterial)
    }

    private func captureAndUpload() async {
        busy = true
        defer { busy = false }
        status = "Exporting…"
        do {
            let export = try CaptureExporter.export(
                session: session,
                jobId: jobId
            )
            status = "Queued for upload…"
            uploadQueue.enqueue(export)
            await uploadQueue.flush(auth: auth)
            status = "Uploaded to Site capture"
            try? await Task.sleep(nanoseconds: 800_000_000)
            dismiss()
        } catch {
            self.error = error.localizedDescription
            status = nil
        }
    }
}

struct ARViewContainer: UIViewRepresentable {
    @ObservedObject var session: ARMeasureSession

    func makeUIView(context: Context) -> ARView {
        session.arView
    }

    func updateUIView(_ uiView: ARView, context: Context) {}
}
