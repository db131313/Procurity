import Foundation
import Combine
import FirebaseAuth

@MainActor
final class AuthViewModel: ObservableObject {
    @Published var email = ""
    @Published var password = ""
    @Published var isBusy = false
    @Published var errorMessage: String?
    @Published private(set) var isSignedIn = false
    @Published private(set) var idToken: String?

    private var handle: AuthStateDidChangeListenerHandle?

    init() {
        handle = Auth.auth().addStateDidChangeListener { [weak self] _, user in
            Task { @MainActor in
                self?.isSignedIn = user != nil
                if user != nil {
                    await self?.refreshToken()
                } else {
                    self?.idToken = nil
                }
            }
        }
        isSignedIn = Auth.auth().currentUser != nil
        Task { await refreshToken() }
    }

    deinit {
        if let handle {
            Auth.auth().removeStateDidChangeListener(handle)
        }
    }

    func signIn() async {
        errorMessage = nil
        guard FirebaseAppReady.isConfigured else {
            errorMessage = "Add GoogleService-Info.plist (see ios/README.md) before signing in."
            return
        }
        isBusy = true
        defer { isBusy = false }
        do {
            _ = try await Auth.auth().signIn(withEmail: email.trimmingCharacters(in: .whitespacesAndNewlines), password: password)
            await refreshToken()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func signOut() {
        try? Auth.auth().signOut()
        idToken = nil
        isSignedIn = false
    }

    func refreshToken() async {
        guard let user = Auth.auth().currentUser else {
            idToken = nil
            return
        }
        do {
            idToken = try await user.getIDToken()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func bearerToken() async throws -> String {
        if let idToken { return idToken }
        await refreshToken()
        guard let idToken else {
            throw APIError.unauthorized
        }
        return idToken
    }
}

enum FirebaseAppReady {
    static var isConfigured: Bool {
        Bundle.main.path(forResource: "GoogleService-Info", ofType: "plist") != nil
    }
}
