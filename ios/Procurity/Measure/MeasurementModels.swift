import Foundation
import simd

enum MeasureMode: String, CaseIterable, Identifiable {
    case line
    case rectangle

    var id: String { rawValue }
    var title: String {
        switch self {
        case .line: return "Point to point"
        case .rectangle: return "Width × height"
        }
    }
}

enum LengthUnit: String, CaseIterable, Identifiable {
    case imperial
    case metric

    var id: String { rawValue }
    var title: String {
        switch self {
        case .imperial: return "ft / in"
        case .metric: return "m / cm"
        }
    }
}

struct NamedLineTemplate: Identifiable, Hashable {
    let id = UUID()
    let label: String
}

enum MeasurePresets {
    static let lines: [NamedLineTemplate] = [
        .init(label: "Sign width"),
        .init(label: "Sign height"),
        .init(label: "Mounting height"),
    ]
}

struct MeasurePoint: Equatable {
    var world: SIMD3<Float>
    var screen: CGPoint
}

struct CapturedLine: Identifiable, Equatable {
    let id: UUID
    var label: String
    var start: MeasurePoint
    var end: MeasurePoint

    var lengthMeters: Float {
        simd_distance(start.world, end.world)
    }

    var lengthInches: Double {
        Double(lengthMeters) * 39.37007874
    }

    func formatted(unit: LengthUnit) -> String {
        switch unit {
        case .metric:
            let m = Double(lengthMeters)
            if m >= 1 { return String(format: "%.2f m", m) }
            return String(format: "%.0f cm", m * 100)
        case .imperial:
            let inches = lengthInches
            let feet = Int(inches) / 12
            let rem = inches - Double(feet * 12)
            if feet > 0 {
                return String(format: "%d′ %.1f″", feet, rem)
            }
            return String(format: "%.1f″", inches)
        }
    }
}

struct CapturedRect: Identifiable, Equatable {
    let id: UUID
    var label: String
    var origin: MeasurePoint
    var widthEnd: MeasurePoint
    var heightEnd: MeasurePoint

    var widthMeters: Float { simd_distance(origin.world, widthEnd.world) }
    var heightMeters: Float { simd_distance(origin.world, heightEnd.world) }
    var areaSqFt: Double {
        Double(widthMeters * heightMeters) * 10.7639104
    }
}

enum TrackingHint: Equatable {
    case good
    case limited(String)
    case outOfRange

    var message: String? {
        switch self {
        case .good: return nil
        case .limited(let s): return s
        case .outOfRange:
            return "Target beyond ~5 m — LiDAR quality drops. Use the photo reference tool in the web app for distant faces."
        }
    }
}
