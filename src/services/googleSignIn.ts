/**
 * Google Sign-In via expo-auth-session (ID token flow) + Firebase credential.
 *
 * Usage (inside a React component):
 *   const { signInWithGoogle, request } = useGoogleSignIn()
 *   <Button onPress={signInWithGoogle} disabled={!request} />
 *
 * Redirect URI behaviour
 * ─────────────────────
 * Google's WEB client type ONLY accepts HTTPS redirect URIs. Custom schemes
 * (e.g. corsanative://) are rejected with Error 400: invalid_request.
 *
 * Platform-specific client IDs (androidClientId / iosClientId) use native
 * OAuth client types which DO allow custom-scheme URIs. When those are set,
 * expo-auth-session generates the correct scheme automatically and we call
 * promptAsync() directly (no proxy needed).
 *
 * Web-client-only on native (proxy flow)
 * ───────────────────────────────────────
 * When no platform client ID is set, we must route through the Expo auth
 * proxy (https://auth.expo.io) so the redirect URI is HTTPS. In expo-auth-
 * session SDK 55 the useProxy option was REMOVED from makeRedirectUri and
 * AuthRequestPromptOptions. We therefore implement the proxy flow manually:
 *
 *   1. Pass redirectUri = https://auth.expo.io/@owner/slug to the request
 *      config so the Google OAuth URL contains an HTTPS redirect_uri.
 *   2. Build the proxy start URL:
 *        https://auth.expo.io/@owner/slug/start?authUrl=OAUTH_URL&returnUrl=APP_SCHEME
 *   3. Open the browser; the proxy orchestrates:
 *        Browser -> Google OAuth -> proxy callback -> app deep link
 *   4. The browser closes when the app deep link fires, returning the code.
 *   5. Exchange the code + PKCE verifier for an id_token (no client_secret
 *      needed — Google supports PKCE for all OAuth client types since 2021).
 *
 * Requirements:
 *   - "owner" must be set in app.json so Constants.expoConfig.originalFullName
 *     is available. Without it proxyRedirectUri will be undefined and we fall
 *     back to promptAsync() which will fail for WEB clients on native.
 *   - The proxy URL https://auth.expo.io/@owner/CorsaNative must be added to
 *     "Authorized redirect URIs" in the Web client in Google Cloud Console.
 */

import Constants from "expo-constants"
import * as WebBrowser from "expo-web-browser"
import * as Google from "expo-auth-session/providers/google"
import {
  exchangeCodeAsync,
  makeRedirectUri,
  AuthSessionResult,
} from "expo-auth-session"
import { GoogleAuthProvider, signInWithCredential } from "firebase/auth"
import { Platform } from "react-native"

import { firebaseAuth } from "@/services/firebase"

// Required: completes the auth session redirect on iOS/Android.
WebBrowser.maybeCompleteAuthSession()

/** Base URL of the Expo auth proxy. */
const EXPO_AUTH_PROXY_BASE = "https://auth.expo.io"

export function useGoogleSignIn() {
  const extra = Constants.expoConfig?.extra ?? {}

  const webClientId = extra.googleWebClientId as string | undefined
  const iosClientId = extra.googleIosClientId as string | undefined
  const androidClientId = extra.googleAndroidClientId as string | undefined

  // Proxy is needed on native when no platform-specific client ID is available.
  const useProxy =
    (Platform.OS === "android" && !androidClientId) ||
    (Platform.OS === "ios" && !iosClientId)

  // Compute the Expo proxy redirect URI from the project's originalFullName
  // (derived from app.json "owner" + "slug" fields, e.g. @lukemccrae/CorsaNative).
  // If originalFullName is absent we leave this undefined; signInWithGoogle will
  // fall back to promptAsync() which will surface the underlying Google error.
  const originalFullName = Constants.expoConfig?.originalFullName
  const proxyRedirectUri =
    useProxy && originalFullName
      ? `${EXPO_AUTH_PROXY_BASE}/${originalFullName}`
      : undefined

  const [request, , promptAsync] = Google.useIdTokenAuthRequest({
    clientId: webClientId ?? "",
    iosClientId,
    androidClientId,
    // When proxy is needed, override the redirect URI so the auth URL sent to
    // Google contains an HTTPS value that the WEB client type accepts.
    ...(proxyRedirectUri ? { redirectUri: proxyRedirectUri } : {}),
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

    let idToken: string | undefined

    if (useProxy && proxyRedirectUri && request?.url) {
      // ── Manual Expo proxy flow (SDK 55: useProxy removed from the API) ──────
      // The app's return URL: the scheme-based deep link WebBrowser watches for.
      const returnUrl = makeRedirectUri()

      // Proxy start URL: tells the proxy which OAuth URL to open and where to
      // redirect after Google completes the flow.
      const proxyStartUrl = `${proxyRedirectUri}/start?${new URLSearchParams({
        authUrl: request.url,
        returnUrl,
      })}`

      const webResult = await WebBrowser.openAuthSessionAsync(proxyStartUrl, returnUrl)
      if (webResult.type !== "success") return

      // Parse the deep-link URL that the proxy redirected back to the app.
      const parsed: AuthSessionResult = request.parseReturnUrl(webResult.url)
      if (parsed.type !== "success") return

      const { code } = parsed.params
      if (!code) {
        throw new Error(
          `Google sign-in (proxy): authorization code missing from response. ` +
            `Ensure ${proxyRedirectUri} is registered as an Authorized redirect URI ` +
            `on your Google Cloud WEB client.`,
        )
      }

      // Exchange the authorization code for tokens using PKCE (no client_secret
      // required when code_verifier is supplied — Google supports PKCE for all
      // client types since 2021).
      const tokenResponse = await exchangeCodeAsync(
        {
          clientId: webClientId ?? "",
          redirectUri: proxyRedirectUri,
          code,
          extraParams: {
            code_verifier: request.codeVerifier ?? "",
          },
        },
        Google.discovery,
      )

      idToken = tokenResponse.idToken ?? undefined
    } else {
      // ── Standard flow (platform client IDs present, or web platform) ────────
      const result = await promptAsync()
      if (result?.type !== "success") return
      idToken = result.params.id_token
    }

    if (!idToken) {
      throw new Error(
        "Google sign-in: id_token missing from response. Please try signing in again.",
      )
    }

    const credential = GoogleAuthProvider.credential(idToken)
    await signInWithCredential(firebaseAuth, credential)
  }

  return { request, signInWithGoogle }
}
