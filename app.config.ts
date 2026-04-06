import { ExpoConfig, ConfigContext } from "@expo/config"

/**
 * Use tsx/cjs here so we can use TypeScript for our Config Plugins
 * and not have to compile them to JavaScript.
 *
 * See https://docs.expo.dev/config-plugins/plugins/#add-typescript-support-and-convert-to-dynamic-app-config
 */
import "tsx/cjs"

/**
 * @param config ExpoConfig coming from the static config app.json if it exists
 *
 * You can read more about Expo's Configuration Resolution Rules here:
 * https://docs.expo.dev/workflow/configuration/#configuration-resolution-rules
 */
module.exports = ({ config }: ConfigContext): Partial<ExpoConfig> => {
  const existingPlugins = config.plugins ?? []

  // Compute the reverse client ID URL scheme so iOS can route the OAuth
  // callback back to the app. e.g. com.googleusercontent.apps.183920355653-xxxx
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? ""
  const reverseIosClientId = iosClientId
    ? iosClientId.split(".").reverse().join(".")
    : undefined

  return {
    ...config,
    ios: {
      ...config.ios,
      infoPlist: {
        ...config.ios?.infoPlist,
        // Register the reverse client ID scheme so iOS routes the OAuth
        // redirect back to this app after Google authentication.
        ...(reverseIosClientId && {
          CFBundleURLTypes: [
            ...((config.ios?.infoPlist?.CFBundleURLTypes as object[]) ?? []),
            { CFBundleURLSchemes: [reverseIosClientId] },
          ],
        }),
      },
      // This privacyManifests is to get you started.
      // See Expo's guide on apple privacy manifests here:
      // https://docs.expo.dev/guides/apple-privacy/
      // You may need to add more privacy manifests depending on your app's usage of APIs.
      // More details and a list of "required reason" APIs can be found in the Apple Developer Documentation.
      // https://developer.apple.com/documentation/bundleresources/privacy-manifest-files
      privacyManifests: {
        NSPrivacyAccessedAPITypes: [
          {
            NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategoryUserDefaults",
            NSPrivacyAccessedAPITypeReasons: ["CA92.1"], // CA92.1 = "Access info from same app, per documentation"
          },
        ],
      },
    },
    extra: {
      ...config.extra,
      firebaseApiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
      firebaseAuthDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
      firebaseProjectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
      firebaseStorageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
      firebaseMessagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      firebaseAppId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
      googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      googleIosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
      googleAndroidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    },
    plugins: [
      ...existingPlugins,
      [
        "expo-location",
        {
          locationWhenInUsePermission: "$(PRODUCT_NAME) uses your location to show it on the map.",
          locationAlwaysAndWhenInUsePermission:
            "$(PRODUCT_NAME) records your location in the background to track waypoints on your activity.",
          locationAlwaysPermission:
            "$(PRODUCT_NAME) records your location in the background to track waypoints on your activity.",
          isIosBackgroundLocationEnabled: true,
          isAndroidBackgroundLocationEnabled: true,
        },
      ],
    ],
  }
}
