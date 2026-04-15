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
  const existingExtra = config.extra ?? {}

  // Compute the reverse client ID URL scheme so iOS can route the OAuth
  // callback back to the app. e.g. com.googleusercontent.apps.183920355653-xxxx
  const iosClientId =
    process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ??
    (existingExtra.googleIosClientId as string | undefined) ??
    ""
  const googleWebClientId =
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ??
    (existingExtra.googleWebClientId as string | undefined)
  const googleAndroidClientId =
    process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ??
    (existingExtra.googleAndroidClientId as string | undefined)
  const reverseIosClientId = iosClientId
    ? iosClientId.split(".").reverse().join(".")
    : undefined

  return {
    ...config,
    ios: {
      ...config.ios,
      infoPlist: {
        ...config.ios?.infoPlist,
        UIBackgroundModes: [
          ...(((config.ios?.infoPlist?.UIBackgroundModes as string[] | undefined) ?? []).filter(
            (mode) => mode !== "location",
          )),
          "location",
        ],
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
        NSPrivacyCollectedDataTypes: [
          {
            NSPrivacyCollectedDataType: "NSPrivacyCollectedDataTypeEmailAddress",
            NSPrivacyCollectedDataTypeLinked: true,
            NSPrivacyCollectedDataTypeTracking: false,
            NSPrivacyCollectedDataTypePurposes: ["NSPrivacyCollectedDataTypePurposeAppFunctionality"],
          },
          {
            NSPrivacyCollectedDataType: "NSPrivacyCollectedDataTypeUserID",
            NSPrivacyCollectedDataTypeLinked: true,
            NSPrivacyCollectedDataTypeTracking: false,
            NSPrivacyCollectedDataTypePurposes: ["NSPrivacyCollectedDataTypePurposeAppFunctionality"],
          },
        ],
      },
    },
    extra: {
      ...existingExtra,
      firebaseApiKey:
        process.env.EXPO_PUBLIC_FIREBASE_API_KEY ??
        (existingExtra.firebaseApiKey as string | undefined),
      firebaseAuthDomain:
        process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ??
        (existingExtra.firebaseAuthDomain as string | undefined),
      firebaseProjectId:
        process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ??
        (existingExtra.firebaseProjectId as string | undefined),
      firebaseStorageBucket:
        process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ??
        (existingExtra.firebaseStorageBucket as string | undefined),
      firebaseMessagingSenderId:
        process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ??
        (existingExtra.firebaseMessagingSenderId as string | undefined),
      firebaseAppId:
        process.env.EXPO_PUBLIC_FIREBASE_APP_ID ??
        (existingExtra.firebaseAppId as string | undefined),
      googleWebClientId,
      googleIosClientId: iosClientId || undefined,
      googleAndroidClientId,
    },
    plugins: [
      ...existingPlugins,
      [
        "expo-location",
        {
            locationWhenInUsePermission:
              "$(PRODUCT_NAME) uses your location to show your position and route while you use map and activity features.",
          locationAlwaysAndWhenInUsePermission:
              "If you start waypoint tracking, $(PRODUCT_NAME) records your location in the background to save your activity route even when the app is closed.",
          locationAlwaysPermission:
              "If you start waypoint tracking, $(PRODUCT_NAME) records your location in the background to save your activity route even when the app is closed.",
          isIosBackgroundLocationEnabled: true,
          isAndroidBackgroundLocationEnabled: true,
        },
      ],
    ],
  }
}
