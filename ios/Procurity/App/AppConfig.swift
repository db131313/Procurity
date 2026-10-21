import Foundation

enum AppConfig {
    /// Production API. Override in Debug via Info.plist `API_BASE_URL` if needed.
    static var apiBaseURL: URL {
        if let raw = Bundle.main.object(forInfoDictionaryKey: "API_BASE_URL") as? String,
           let url = URL(string: raw), !raw.isEmpty {
            return url
        }
        return URL(string: "https://procurity.pro")!
    }

    static let appName = "Procurity"
    /// Soft LiDAR range warning (~5 meters).
    static let maxReliableRangeMeters: Float = 5.0
}
