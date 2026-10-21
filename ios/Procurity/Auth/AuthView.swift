import SwiftUI

struct AuthView: View {
    @EnvironmentObject private var auth: AuthViewModel

    var body: some View {
        NavigationStack {
            VStack(spacing: 24) {
                VStack(spacing: 8) {
                    Text("PROCURITY")
                        .font(.system(size: 28, weight: .bold, design: .default))
                        .tracking(4)
                        .foregroundStyle(ProcurityTheme.ink)
                    Text("LiDAR site capture")
                        .font(.subheadline)
                        .foregroundStyle(ProcurityTheme.slate)
                }
                .padding(.top, 48)

                VStack(spacing: 14) {
                    TextField("Email", text: $auth.email)
                        .textContentType(.username)
                        .keyboardType(.emailAddress)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .padding()
                        .frame(minHeight: ProcurityTheme.minTap)
                        .background(Color.white)
                        .overlay(RoundedRectangle(cornerRadius: 12).stroke(ProcurityTheme.line))

                    SecureField("Password", text: $auth.password)
                        .textContentType(.password)
                        .padding()
                        .frame(minHeight: ProcurityTheme.minTap)
                        .background(Color.white)
                        .overlay(RoundedRectangle(cornerRadius: 12).stroke(ProcurityTheme.line))
                }

                if let error = auth.errorMessage {
                    Text(error)
                        .font(.footnote)
                        .foregroundStyle(ProcurityTheme.danger)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }

                Button {
                    Task { await auth.signIn() }
                } label: {
                    if auth.isBusy {
                        ProgressView()
                    } else {
                        Text("Sign in")
                    }
                }
                .buttonStyle(PrimaryButtonStyle(enabled: !auth.isBusy))
                .disabled(auth.isBusy || auth.email.isEmpty || auth.password.isEmpty)

                Text("Requires a LiDAR iPhone/iPad and a paid Procurity Jobs plan.")
                    .font(.caption)
                    .foregroundStyle(ProcurityTheme.slate)
                    .multilineTextAlignment(.center)

                Spacer()
            }
            .padding(24)
            .background(ProcurityTheme.offwhite.ignoresSafeArea())
            .navigationBarHidden(true)
        }
    }
}
