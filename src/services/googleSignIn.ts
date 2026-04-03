/**
 * Google Sign-In via expo-auth-session (ID token flow) + Firebase credential.
 *
 * Usage (inside a React component):
 *   const { signInWithGoogle, request } = useGoogleSignIn()
 *   <Button onPress={signInWithGoogle} disabled={!request} />
 *
 * Build notes:
 *   - For native builds (EAS / bare workflow) supply iosClientId / androidClientId
 *     in your .env so Google returns a native-app credential.
 *   - Native OAuth clients require the redirect URI to be the reverse of the
 *     client ID: com.googleusercontent.apps.{id-prefix}:/oauthredirect
 *     This scheme must also be registered in Info.plist (handled by app.config.ts).
 */

import { Platform } from "react-native"
import Constants from "expo-constants"
import * as WebBrowser from "expo-web-browser"
import * as Google from "expo-auth-session/providers/google"
import { GoogleAuthProvider, signInWithCredential } from "firebase/auth"

import { firebaseAuth } from "@/services/firebase"

// Required: completes the auth session redirect on iOS/Android.
WebBrowser.maybeCompleteAuthSession()

/**
 * Converts a Google OAuth client ID to the reverse-domain redirect URI that
 * native iOS/Android clients require.
 * e.g. "183920355653-xxxx.apps.googleusercontent.com"
 *   -> "com.googleusercontent.apps.183920355653-xxxx:/oauthredirect"
 */
function reverseClientIdRedirectUri(clientId: string): string {
  return `${clientId.split(".").reverse().join(".")}:/oauthredirect`
}

export function useGoogleSignIn() {
  const extra = Constants.expoConfig?.extra ?? {}

  const iosClientId = extra.googleIosClientId as string | undefined
  const androidClientId = extra.googleAndroidClientId as string | undefined

  // Google native OAuth clients require the reverse client ID as the redirect URI.
  // The web client ID is still needed so Firebase can validate the ID token.
  const nativeClientId = Platform.OS === "ios" ? iosClientId : androidClientId
  const redirectUri = nativeClientId ? reverseClientIdRedirectUri(nativeClientId) : undefined

  const [request, , promptAsync] = Google.useIdTokenAuthRequest(
    {
      clientId: (extra.googleWebClientId as string | undefined) ?? "",
      iosClientId,
      androidClientId,
    },
    redirectUri ? { native: redirectUri } : {},
  )

  const signInWithGoogle = async (): Promise<void> => {
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
