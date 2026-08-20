/** Shared Firebase web config (safe on server + client). */

export function readFirebaseConfig() {
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim() || undefined,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN?.trim() || undefined,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim() || undefined,
    storageBucket:
      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim() || undefined,
    messagingSenderId:
      process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID?.trim() || undefined,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID?.trim() || undefined,
  };
}

export function isFirebaseConfigured() {
  const c = readFirebaseConfig();
  return Boolean(c.apiKey && c.authDomain && c.projectId && c.appId);
}
