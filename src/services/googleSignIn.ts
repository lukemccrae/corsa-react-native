/**
 * Google Sign-In via expo-auth-session (ID token flow) + Firebase credential.
 *
 * Usage (inside a React component):
 *   const { signInWithGoogle, request } = useGoogleSignIn()
 *   <Button onPress={signInWithGoogle} disabled={!request} />
 *
 * Build notes:
 *   - Supply iosClientId / androidClientId in your .env so Google returns
 *     a native-app credential.
 *   - The Google provider automatically computes the native redirect URI based
 *     on the client ID. The URL scheme must be registered in Info.plist.
 */

import Constants from "expo-constants"
import * as AuthSession from "expo-auth-session"
import * as WebBrowser from "expo-web-browser"
import * as Google from "expo-auth-session/providers/google"
import { GoogleAuthProvider, signInWithCredential } from "firebase/auth"
import { Platform } from "react-native"

import { firebaseAuth } from "@/services/firebase"

// Required: completes the auth session redirect on iOS/Android.
WebBrowser.maybeCompleteAuthSession()

function reverseClientIdRedirectUri(clientId: string): string {
  return `${clientId.split(".").reverse().join(".")}:/oauthredirect`
}

export function useGoogleSignIn() {
  // In native builds, expoConfig may be undefined. Fall back to env vars.
  const expoConfigExtra = Constants.expoConfig?.extra ?? {}
  const googleWebClientId =
    (expoConfigExtra.googleWebClientId as string | undefined) ??
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ??
    ""
  const iosClientId =
    (expoConfigExtra.googleIosClientId as string | undefined) ??
    process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID
  const androidClientId =
    (expoConfigExtra.googleAndroidClientId as string | undefined) ??
    process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID

  console.log("useGoogleSignIn:", {
    googleWebClientId: googleWebClientId ? "***" : "undefined",
    iosClientId: iosClientId ? "***" : "undefined",
    androidClientId: androidClientId ? "***" : "undefined",
  })

  const nativeClientId = Platform.OS === "ios" ? iosClientId : androidClientId
  const nativeRedirectUri = nativeClientId
    ? reverseClientIdRedirectUri(nativeClientId)
    : undefined

  if ((Platform.OS === "ios" || Platform.OS === "android") && !nativeClientId) {
    throw new Error(
      `Google sign-in misconfigured: missing ${Platform.OS} client ID. Set EXPO_PUBLIC_GOOGLE_${
        Platform.OS === "ios" ? "IOS" : "ANDROID"
      }_CLIENT_ID in .env and rebuild the app.`,
    )
  }

  // Force a stable native redirect URI that matches the native OAuth client.
  // Without this, expo-auth-session may default to applicationId:/oauthredirect
  // which can mismatch the client Google expects during code exchange.
  const [request, , promptAsync] = Google.useAuthRequest({
    clientId: googleWebClientId,
    iosClientId,
    androidClientId,
    responseType: AuthSession.ResponseType.Code,
    shouldAutoExchangeCode: true,
    ...(nativeRedirectUri && { redirectUri: nativeRedirectUri }),
  })

  const signInWithGoogle = async (): Promise<void> => {
    const result = await promptAsync()

    console.log("Google OAuth result:", result)

    if (result.type !== "success") {
      console.error("Google OAuth result type is not success:", result.type)
      return
    }

    const idToken =
      (result as { authentication?: { idToken?: string | null; idTokenExpirationDate?: string } })
        .authentication?.idToken ?? result.params.id_token

    console.log("idToken:", idToken)

    let resolvedIdToken: string | undefined = idToken || undefined

    // Fallback: when auto exchange fails or returns no id_token, do code exchange manually.
    if (!resolvedIdToken && result.params.code && nativeClientId && nativeRedirectUri) {
      const tokenResponse = await AuthSession.exchangeCodeAsync(
        {
          code: result.params.code,
          clientId: nativeClientId,
          redirectUri: nativeRedirectUri,
          extraParams: {
            code_verifier: request?.codeVerifier ?? "",
          },
        },
        Google.discovery,
      )

      resolvedIdToken =
        (tokenResponse as { idToken?: string | null }).idToken ??
        (tokenResponse as { rawResponse?: { id_token?: string } }).rawResponse?.id_token
    }

    if (!resolvedIdToken) {
      const msg = "Google sign-in: id_token missing from response. Please try signing in again."
      console.error(msg, {
        responseType: (request as { responseType?: string } | null)?.responseType,
        paramsKeys: Object.keys(result.params ?? {}),
        hasAuthentication: Boolean(
          (result as { authentication?: unknown }).authentication,
        ),
      })
      throw new Error(msg)
    }

    console.log("Creating Firebase credential with idToken...")
    const credential = GoogleAuthProvider.credential(resolvedIdToken)
    console.log("Signing in with Firebase...")
    await signInWithCredential(firebaseAuth, credential)
    console.log("Google sign-in successful!")
  }

  return { request, signInWithGoogle }
}
