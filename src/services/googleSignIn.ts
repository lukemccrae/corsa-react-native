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
 *     in your .env so Google returns a native-app credential.
 */

import { makeRedirectUri } from "expo-auth-session"
import Constants from "expo-constants"
import * as WebBrowser from "expo-web-browser"
import * as Google from "expo-auth-session/providers/google"
import { GoogleAuthProvider, signInWithCredential } from "firebase/auth"

import { firebaseAuth } from "@/services/firebase"

// Required: completes the auth session redirect on iOS/Android.
WebBrowser.maybeCompleteAuthSession()

export function useGoogleSignIn() {
  const extra = Constants.expoConfig?.extra ?? {}

  const redirectUri = makeRedirectUri({
    // Must match the "scheme" field in app.json ("corsanative").
    scheme: "corsanative",
  })

  const [request, , promptAsync] = Google.useIdTokenAuthRequest({
    clientId: (extra.googleWebClientId as string | undefined) ?? "",
    iosClientId: extra.googleIosClientId as string | undefined,
    androidClientId: extra.googleAndroidClientId as string | undefined,
    redirectUri,
  })

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
