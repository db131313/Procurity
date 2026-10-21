# Apple Universal Links (stub)

`apple-app-site-association` is a placeholder. Before shipping:

1. Replace `TEAMID.com.procurity.app` with the real Apple Team ID + bundle ID.
2. Host this file at `https://procurity.pro/.well-known/apple-app-site-association`
   with `Content-Type: application/json` and **no** file extension redirect.
3. Enable Associated Domains on the iOS app (`applinks:procurity.pro`).
4. Paths should match deep links the app handles (job open URLs).

Until configured, “Download for iPhone” uses `NEXT_PUBLIC_IOS_APP_URL` (App Store
or TestFlight) instead of universal links.
