import Constants from "expo-constants"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { initializeApp, getApps, getApp } from "firebase/app"
import { Auth, initializeAuth, getAuth, getReactNativePersistence } from "firebase/auth"

const extra = Constants.expoConfig?.extra ?? {}

const requiredKeys = [
  ["firebaseApiKey", extra.firebaseApiKey],
  ["firebaseAuthDomain", extra.firebaseAuthDomain],
  ["firebaseProjectId", extra.firebaseProjectId],
  ["firebaseStorageBucket", extra.firebaseStorageBucket],
  ["firebaseMessagingSenderId", extra.firebaseMessagingSenderId],
  ["firebaseAppId", extra.firebaseAppId],
] as const

const missingKeys = requiredKeys.filter(([, value]) => !value).map(([key]) => key)
if (missingKeys.length > 0) {
  console.warn(
    `[Firebase] Missing required configuration keys: ${missingKeys.join(", ")}. ` +
      "Copy .env.example to .env and fill in your Firebase project values.",
  )
}

const firebaseConfig = {
  apiKey: extra.firebaseApiKey as string,
  authDomain: extra.firebaseAuthDomain as string,
  projectId: extra.firebaseProjectId as string,
  storageBucket: extra.firebaseStorageBucket as string,
  messagingSenderId: extra.firebaseMessagingSenderId as string,
  appId: extra.firebaseAppId as string,
}

// Initialize Firebase app only once (guards against hot-reload double-init)
export const firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()

// Initialize Auth with React Native AsyncStorage persistence.
// Use try/catch so that hot-reload doesn't throw on duplicate initializeAuth calls.
let _auth: Auth
try {
  _auth = initializeAuth(firebaseApp, {
    persistence: getReactNativePersistence(AsyncStorage),
  })
} catch {
  _auth = getAuth(firebaseApp)
}

export const firebaseAuth = _auth
