import SwiftUI
import FirebaseCore

@main
struct ProcurityApp: App {
    @StateObject private var auth = AuthViewModel()
    @StateObject private var uploadQueue = UploadQueue()

    init() {
        if Bundle.main.path(forResource: "GoogleService-Info", ofType: "plist") != nil {
            FirebaseApp.configure()
        } else {
            #if DEBUG
            print("[Procurity] GoogleService-Info.plist missing — add it before signing in. See ios/README.md")
            #endif
        }
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(auth)
                .environmentObject(uploadQueue)
                .tint(ProcurityTheme.primary)
        }
    }
}
