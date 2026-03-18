/**
 * Google Sign-In via expo-auth-session (ID token flow) + Firebase credential.
 *
 * Usage (inside a React component):
 *   const { signInWithGoogle, request } = useGoogleSignIn()
 *   <Button onPress={signInWithGoogle} disabled={!request} />
 *
 * Redirect URI behaviour:
 *   expo-auth-session/providers/google picks the redirect URI automatically:
 *
 *   • androidClientId set → com.googleusercontent.apps.{id}://oauth2redirect/android
 *     (Android OAuth client type; custom scheme is allowed for native clients)
 *   • iosClientId set    → reversed iOS client-ID scheme
 *     (iOS OAuth client type; custom scheme is allowed for native clients)
 *   • Neither set (web client only on native) → the hook generates the reversed
 *     web-client-ID scheme, but Google's WEB client type forbids custom schemes and
 *     expo-auth-session throws "Custom scheme URIs are not allowed for 'WEB' client type".
 *     Fix: pass useProxy:true so the Expo auth proxy (https://auth.expo.io/…) is
 *     used instead. This HTTPS URL must be registered in the Web client's
 *     "Authorized redirect URIs" in Google Cloud Console.
 *     Works in Expo Go and development builds; for standalone EAS builds you
 *     must configure EXPO_PUBLIC_GOOGLE_ANDROID/IOS_CLIENT_ID.
 */

import Constants from "expo-constants"
import * as WebBrowser from "expo-web-browser"
import * as Google from "expo-auth-session/providers/google"
import { GoogleAuthProvider, signInWithCredential } from "firebase/auth"
import { Platform } from "react-native"

import { firebaseAuth } from "@/services/firebase"

// Required: completes the auth session redirect on iOS/Android.
WebBrowser.maybeCompleteAuthSession()

export function useGoogleSignIn() {
  const extra = Constants.expoConfig?.extra ?? {}

  const webClientId = extra.googleWebClientId as string | undefined
  const iosClientId = extra.googleIosClientId as string | undefined
  const androidClientId = extra.googleAndroidClientId as string | undefined

  // Google's WEB client type does not allow custom-scheme redirect URIs.
  // When on native without a platform-specific client ID, expo-auth-session
  // falls back to the web client and generates a custom scheme → error.
  // Use the Expo auth proxy (HTTPS) in that case so the web client accepts it.
  // When platform client IDs are present, useProxy is false and expo-auth-session
  // uses the correct native OAuth client scheme automatically.
  const useProxy =
    (Platform.OS === "android" && !androidClientId) ||
    (Platform.OS === "ios" && !iosClientId)

  const [request, , promptAsync] = Google.useIdTokenAuthRequest(
    {
      clientId: webClientId ?? "",
      iosClientId,
      androidClientId,
    },
    { useProxy },
  )

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
