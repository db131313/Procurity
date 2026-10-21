import SwiftUI

struct JobsListView: View {
    @EnvironmentObject private var auth: AuthViewModel
    @EnvironmentObject private var uploadQueue: UploadQueue
    @State private var jobs: [MobileJobSummary] = []
    @State private var error: String?
    @State private var loading = true

    var body: some View {
        NavigationStack {
            Group {
                if loading {
                    ProgressView("Loading jobs…")
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if let error {
                    VStack(spacing: 16) {
                        Text(error)
                            .foregroundStyle(ProcurityTheme.danger)
                            .multilineTextAlignment(.center)
                        Button("Retry") { Task { await load() } }
                            .buttonStyle(PrimaryButtonStyle())
                    }
                    .padding(24)
                } else if jobs.isEmpty {
                    ContentUnavailableView(
                        "No jobs yet",
                        systemImage: "briefcase",
                        description: Text("Create a job in the Procurity web app, then pull to refresh.")
                    )
                } else {
                    List(jobs) { job in
                        NavigationLink(value: job) {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(job.customerName.isEmpty ? "Untitled job" : job.customerName)
                                    .font(.headline)
                                    .foregroundStyle(ProcurityTheme.ink)
                                Text(job.siteAddress.isEmpty ? "No address" : job.siteAddress)
                                    .font(.subheadline)
                                    .foregroundStyle(ProcurityTheme.slate)
                                Text(job.status.replacingOccurrences(of: "_", with: " "))
                                    .font(.caption.weight(.semibold))
                                    .foregroundStyle(ProcurityTheme.primary)
                            }
                            .padding(.vertical, 6)
                        }
                        .listRowBackground(Color.white)
                    }
                    .listStyle(.plain)
                    .refreshable { await load() }
                }
            }
            .background(ProcurityTheme.offwhite.ignoresSafeArea())
            .navigationTitle("Jobs")
            .navigationDestination(for: MobileJobSummary.self) { job in
                JobDetailView(jobId: job.id, title: job.customerName.isEmpty ? job.siteAddress : job.customerName)
            }
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Menu {
                        if uploadQueue.pendingCount > 0 {
                            Text("\(uploadQueue.pendingCount) queued upload(s)")
                            Button("Retry queue") { Task { await uploadQueue.flush(auth: auth) } }
                        }
                        Button("Sign out", role: .destructive) { auth.signOut() }
                    } label: {
                        Image(systemName: "person.circle")
                            .font(.title3)
                    }
                }
            }
            .task { await load() }
        }
    }

    private func load() async {
        loading = jobs.isEmpty
        error = nil
        do {
            let client = APIClient(auth: auth)
            jobs = try await client.listJobs()
        } catch {
            self.error = error.localizedDescription
        }
        loading = false
    }
}
