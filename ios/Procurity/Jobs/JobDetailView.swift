import SwiftUI

struct JobDetailView: View {
    let jobId: String
    let title: String

    @EnvironmentObject private var auth: AuthViewModel
    @EnvironmentObject private var uploadQueue: UploadQueue
    @State private var detail: JobDetailResponse?
    @State private var error: String?
    @State private var showMeasure = false
    @State private var showRoom = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                if let detail {
                    VStack(alignment: .leading, spacing: 6) {
                        Text(detail.job.siteAddress)
                            .font(.title3.weight(.semibold))
                        Text("Status: \(detail.job.status.replacingOccurrences(of: "_", with: " "))")
                            .font(.subheadline)
                            .foregroundStyle(ProcurityTheme.slate)
                        Text("\(detail.measurements.count) measurements · \(detail.scans.count) scans")
                            .font(.footnote)
                            .foregroundStyle(ProcurityTheme.slate)
                    }

                    if !LiDARCapability.hasLiDAR {
                        Label(
                            "This device has no LiDAR. Use a Pro / Pro Max iPhone or iPad Pro, or capture photo references in the web app.",
                            systemImage: "exclamationmark.triangle.fill"
                        )
                        .font(.footnote)
                        .foregroundStyle(ProcurityTheme.warning)
                        .padding()
                        .background(Color.white)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                    }

                    Button {
                        showMeasure = true
                    } label: {
                        Label("LiDAR measure", systemImage: "ruler")
                    }
                    .buttonStyle(PrimaryButtonStyle(enabled: LiDARCapability.hasLiDAR))
                    .disabled(!LiDARCapability.hasLiDAR)

                    Button {
                        showRoom = true
                    } label: {
                        Label("Scan room (RoomPlan)", systemImage: "cube.transparent")
                    }
                    .buttonStyle(SecondaryButtonStyle())
                    .disabled(!LiDARCapability.hasLiDAR)

                    if !detail.measurements.isEmpty {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("On job")
                                .font(.headline)
                            ForEach(detail.measurements) { m in
                                HStack {
                                    Text(m.label)
                                    Spacer()
                                    Text(measurementLabel(m))
                                        .foregroundStyle(ProcurityTheme.slate)
                                }
                                .font(.subheadline)
                                .padding(.vertical, 4)
                            }
                        }
                        .padding()
                        .background(Color.white)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                    }
                } else if let error {
                    Text(error).foregroundStyle(ProcurityTheme.danger)
                } else {
                    ProgressView()
                }
            }
            .padding(20)
        }
        .background(ProcurityTheme.offwhite.ignoresSafeArea())
        .navigationTitle(title.isEmpty ? "Job" : title)
        .navigationBarTitleDisplayMode(.inline)
        .task { await load() }
        .fullScreenCover(isPresented: $showMeasure) {
            LiDARMeasureFlow(jobId: jobId)
                .environmentObject(auth)
                .environmentObject(uploadQueue)
        }
        .fullScreenCover(isPresented: $showRoom) {
            RoomScanFlow(jobId: jobId)
                .environmentObject(auth)
                .environmentObject(uploadQueue)
        }
    }

    private func load() async {
        do {
            detail = try await APIClient(auth: auth).jobDetail(id: jobId)
        } catch {
            self.error = error.localizedDescription
        }
    }

    private func measurementLabel(_ m: MobileMeasurement) -> String {
        if let w = m.width, let h = m.height {
            return String(format: "%.1f × %.1f %@", w, h, m.unit)
        }
        if let w = m.width {
            return String(format: "%.1f %@", w, m.unit)
        }
        return m.unit
    }
}

enum LiDARCapability {
    static var hasLiDAR: Bool {
        #if targetEnvironment(simulator)
        return false
        #else
        // ARWorldTrackingConfiguration.supportsSceneReconstruction(.mesh) requires device check at runtime
        return ARSupport.supportsMesh
        #endif
    }
}

import ARKit

enum ARSupport {
    static var supportsMesh: Bool {
        ARWorldTrackingConfiguration.supportsSceneReconstruction(.mesh)
    }
}
