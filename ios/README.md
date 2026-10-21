# Procurity iOS (LiDAR)

Native SwiftUI app (iOS 17+) for LiDAR site capture against the existing Procurity Next.js backend (`/api/mobile/*`).

**Target devices:** iPhone / iPad with LiDAR (Pro / Pro Max / iPad Pro). The Simulator has **no LiDAR** — AR mesh, RoomPlan, and measuring must be validated on hardware.

## Open in Xcode

1. On a Mac, clone this repo and open:
   ```bash
   open ios/Procurity.xcodeproj
   ```
2. Select the **Procurity** shared scheme and an attached LiDAR device (not a Simulator) for AR features.
3. **Signing:** Target → Signing & Capabilities → Team → choose your Apple Developer team. Set a unique Bundle Identifier if `com.procurity.ios` is taken (e.g. `com.yourco.procurity`).
4. **Firebase:**
   - Firebase Console → project **`procurity`** → Add iOS app with your bundle id.
   - Download `GoogleService-Info.plist`.
   - Place it at `ios/Procurity/GoogleService-Info.plist`.
   - Confirm it appears under Target → Build Phases → Copy Bundle Resources.
   - Enable **Email/Password** sign-in in Firebase Authentication (same as the web app).
5. **API base URL:** Defaults to `https://procurity.pro` via `Info.plist` key `API_BASE_URL`. For local backend testing, change it to your machine URL (e.g. `https://your-tunnel.example`).
6. Add the **Firebase iOS SDK** via Swift Package Manager if Xcode prompts:
   - File → Add Package Dependencies…
   - URL: `https://github.com/firebase/firebase-ios-sdk`
   - Products: `FirebaseAuth` (and `FirebaseCore` transitively).
   - The Xcode project already declares this package dependency in `project.pbxproj`.
7. Build & Run on device (`⌘R`). Grant Camera permission when prompted.

## Archive for TestFlight

1. Select **Any iOS Device (arm64)**.
2. Product → Archive.
3. Organizer → Distribute App → App Store Connect → Upload.
4. In App Store Connect, add the build to TestFlight and invite testers with LiDAR devices.

## Backend routes used

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/mobile/jobs` | List jobs (Bearer Firebase ID token) |
| GET | `/api/mobile/jobs/[id]` | Job detail + scans + measurements |
| POST | `/api/mobile/jobs/[id]/scans` | Multipart snapshot / USDZ upload |
| POST | `/api/mobile/jobs/[id]/measurements` | LiDAR / RoomPlan measurements + Design/Estimate prefill |
| GET | `/api/mobile/jobs/[id]/scans/[scanId]/file` | Authenticated file bytes |
| GET | `/api/jobs/[jobId]/scans/[scanId]/file` | Same bytes for web Site capture (cookie or Bearer) |

Auth: `Authorization: Bearer <Firebase ID token>`. Jobs paid-plan gate + ownership enforced server-side. Uploads never use `data:` URLs; bytes go to Neon/`fileData` or Firebase Storage.

## What to test on a physical LiDAR device

- [ ] Sign in with a paid-plan Procurity user
- [ ] Jobs list loads from production
- [ ] LiDAR measure: mesh overlay, point-to-point lines, loupe, drag adjust, undo/delete
- [ ] Named presets: Sign width / Sign height / Mounting height
- [ ] Rectangle mode + area (sq ft)
- [ ] Range warning beyond ~5 m + copy about web photo reference
- [ ] Capture & upload: snapshot + measurements appear under Job → Site capture
- [ ] Design notes / Estimate qty prefilled from width×height
- [ ] RoomPlan “Scan room” → dimensions uploaded
- [ ] Airplane mode → capture → queue → reconnect → Retry queue

## Stubbed / limited (read before QA)

| Area | Status |
|------|--------|
| **USDZ mesh export from ARMeshAnchor** | Best-effort stub — anchors are detected but full ModelIO mesh→USDZ conversion is not wired. Snapshot + measurements **do** upload. Follow-up: build `MDLMesh` from `ARMeshAnchor` geometry and export USDZ. |
| **RoomPlan wall/floor parsing** | Uses `CapturedRoom` wall/floor extents; furniture categories are not mapped. |
| **Simulator** | No LiDAR / RoomPlan. UI + auth + jobs list can be smoke-tested; AR screens show capability warnings. |
| **GoogleService-Info.plist** | Not committed — you must add the real file from Firebase project `procurity`. |
| **Drag-to-adjust handles** | Line endpoints update via raycast when dragging on the overlay; dedicated grab handles are minimal. |

## Design notes

- Primary color `#2563EB` only (no gradients).
- Minimum tap targets ~48pt.
- Errors surface as alerts / inline text (no silent failures).
