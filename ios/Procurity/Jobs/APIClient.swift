import Foundation

enum APIError: LocalizedError {
    case unauthorized
    case http(Int, String)
    case decoding
    case offline

    var errorDescription: String? {
        switch self {
        case .unauthorized: return "Please sign in again."
        case .http(let code, let body): return "Server error (\(code)): \(body)"
        case .decoding: return "Could not read server response."
        case .offline: return "You appear to be offline."
        }
    }
}

struct MobileJobSummary: Codable, Identifiable {
    let id: String
    let customerName: String
    let siteAddress: String
    let status: String
    let updatedAt: String
    let createdAt: String
}

struct MobileJobDetail: Codable {
    let job: MobileJobSummaryExtended
    let scans: [MobileScan]
    let measurements: [MobileMeasurement]
}

struct MobileJobSummaryExtended: Codable, Identifiable {
    let id: String
    let customerName: String
    let customerEmail: String?
    let siteAddress: String
    let status: String
    let companyName: String?
    let updatedAt: String
    let createdAt: String
}

struct MobileScan: Codable, Identifiable {
    let id: String
    let jobId: String
    let fileUrl: String
    let fileName: String
    let mimeType: String
    let type: String
    let createdAt: String
}

struct MobileMeasurement: Codable, Identifiable {
    let id: String
    let jobId: String
    let label: String
    let width: Double?
    let height: Double?
    let unit: String
    let createdAt: String
}

struct JobsListResponse: Codable {
    let ok: Bool
    let jobs: [MobileJobSummary]
}

struct JobDetailResponse: Codable {
    let ok: Bool
    let job: MobileJobSummaryExtended
    let scans: [MobileScan]
    let measurements: [MobileMeasurement]
}

struct ScanUploadResponse: Codable {
    let ok: Bool
    let scan: MobileScan
}

struct MeasurementsUploadResponse: Codable {
    let ok: Bool
    let measurements: [MobileMeasurement]
}

@MainActor
final class APIClient {
    private let auth: AuthViewModel

    init(auth: AuthViewModel) {
        self.auth = auth
    }

    func listJobs() async throws -> [MobileJobSummary] {
        let data = try await get(path: "/api/mobile/jobs")
        let decoded = try JSONDecoder().decode(JobsListResponse.self, from: data)
        return decoded.jobs
    }

    func jobDetail(id: String) async throws -> JobDetailResponse {
        let data = try await get(path: "/api/mobile/jobs/\(id)")
        return try JSONDecoder().decode(JobDetailResponse.self, from: data)
    }

    func uploadScan(
        jobId: String,
        fileURL: URL,
        fileName: String,
        mimeType: String,
        kind: String,
        progress: @escaping (Double) -> Void
    ) async throws -> MobileScan {
        let token = try await auth.bearerToken()
        var request = URLRequest(url: AppConfig.apiBaseURL.appendingPathComponent("api/mobile/jobs/\(jobId)/scans"))
        request.httpMethod = "POST"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

        let boundary = "Boundary-\(UUID().uuidString)"
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")

        var body = Data()
        func append(_ string: String) { body.append(Data(string.utf8)) }
        append("--\(boundary)\r\n")
        append("Content-Disposition: form-data; name=\"kind\"\r\n\r\n\(kind)\r\n")
        append("--\(boundary)\r\n")
        append("Content-Disposition: form-data; name=\"file\"; filename=\"\(fileName)\"\r\n")
        append("Content-Type: \(mimeType)\r\n\r\n")
        body.append(try Data(contentsOf: fileURL))
        append("\r\n--\(boundary)--\r\n")
        request.httpBody = body
        progress(0.3)

        let (data, response) = try await URLSession.shared.data(for: request)
        progress(1)
        try throwIfNeeded(response, data: data)
        let decoded = try JSONDecoder().decode(ScanUploadResponse.self, from: data)
        return decoded.scan
    }

    func uploadMeasurements(jobId: String, payload: [[String: Any]]) async throws {
        let token = try await auth.bearerToken()
        var request = URLRequest(url: AppConfig.apiBaseURL.appendingPathComponent("api/mobile/jobs/\(jobId)/measurements"))
        request.httpMethod = "POST"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        let body: [String: Any] = ["measurements": payload, "prefill": true]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        let (data, response) = try await URLSession.shared.data(for: request)
        try throwIfNeeded(response, data: data)
    }

    private func get(path: String) async throws -> Data {
        let token = try await auth.bearerToken()
        var request = URLRequest(url: AppConfig.apiBaseURL.appendingPathComponent(String(path.dropFirst())))
        // appendingPathComponent drops leading issues — build carefully
        request = URLRequest(url: URL(string: AppConfig.apiBaseURL.absoluteString + path)!)
        request.httpMethod = "GET"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        let (data, response) = try await URLSession.shared.data(for: request)
        try throwIfNeeded(response, data: data)
        return data
    }

    private func throwIfNeeded(_ response: URLResponse, data: Data) throws {
        guard let http = response as? HTTPURLResponse else { return }
        guard (200..<300).contains(http.statusCode) else {
            let body = String(data: data, encoding: .utf8) ?? ""
            if http.statusCode == 401 { throw APIError.unauthorized }
            throw APIError.http(http.statusCode, String(body.prefix(200)))
        }
    }
}
