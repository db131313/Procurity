import SwiftUI

struct ContentView: View {
    @EnvironmentObject private var auth: AuthViewModel

    var body: some View {
        Group {
            if auth.isSignedIn {
                JobsListView()
            } else {
                AuthView()
            }
        }
        .animation(.easeInOut(duration: 0.2), value: auth.isSignedIn)
    }
}
