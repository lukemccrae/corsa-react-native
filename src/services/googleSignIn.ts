/**
 * Google Sign-In via expo-auth-session (ID token flow) + Firebase credential.
 *
 * Usage (inside a React component):
 *   const { signInWithGoogle, request } = useGoogleSignIn()
 *   <Button onPress={signInWithGoogle} disabled={!request} />
 *
 * Build notes:
 *   - In Expo Go only the webClientId is used (no native Google SDK).
 *   - For native builds (EAS / bare workflow) supply iosClientId / androidClientId
 *     in your .env so Google uses the correct platform-specific OAuth flow.
 *   - Do NOT override redirectUri – expo-auth-session/providers/google computes the
 *     correct platform redirect URI automatically:
 *       Android: com.googleusercontent.apps.{androidClientId}://oauth2redirect/android
 *       iOS:     reversed iOS client-ID scheme
 *     Passing a custom scheme like "corsanative://" causes Error 400: invalid_request.
 */

import Constants from "expo-constants"
import * as WebBrowser from "expo-web-browser"
import * as Google from "expo-auth-session/providers/google"
import { GoogleAuthProvider, signInWithCredential } from "firebase/auth"

import { firebaseAuth } from "@/services/firebase"

// Required: completes the auth session redirect on iOS/Android.
WebBrowser.maybeCompleteAuthSession()

export function useGoogleSignIn() {
  const extra = Constants.expoConfig?.extra ?? {}

  const webClientId = extra.googleWebClientId as string | undefined
  const iosClientId = extra.googleIosClientId as string | undefined
  const androidClientId = extra.googleAndroidClientId as string | undefined

  // Do not pass redirectUri – let expo-auth-session generate the correct
  // platform-specific URI. Overriding with a custom scheme (e.g. corsanative://)
  // causes Google to return Error 400: invalid_request.
  const [request, , promptAsync] = Google.useIdTokenAuthRequest({
    clientId: webClientId ?? "",
    iosClientId,
    androidClientId,
  })

  const signInWithGoogle = async (): Promise<void> => {
    if (!webClientId && !iosClientId && !androidClientId) {
      throw new Error(
        "[GoogleSignIn] No Google OAuth client IDs configured. " +
          "Set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID (required for Expo Go / web flow) and, " +
          "for native builds, EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID and/or " +
          "EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID in your .env file. " +
          "See .env.example and README for setup instructions.",
      )
    }

    const result = await promptAsync()

    if (result.type !== "success") return

    const idToken = result.params.id_token
    if (!idToken)
      throw new Error(
        "Google sign-in: id_token missing from response. Please try signing in again.",
      )

    const credential = GoogleAuthProvider.credential(idToken)
    await signInWithCredential(firebaseAuth, credential)
  }

  return { request, signInWithGoogle }
}
