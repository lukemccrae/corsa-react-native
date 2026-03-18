# Welcome to your new ignited app!

> The latest and greatest boilerplate for Infinite Red opinions

This is the boilerplate that [Infinite Red](https://infinite.red) uses as a way to test bleeding-edge changes to our React Native stack.

- [Quick start documentation](https://github.com/infinitered/ignite/blob/master/docs/boilerplate/Boilerplate.md)
- [Full documentation](https://github.com/infinitered/ignite/blob/master/docs/README.md)

## Environment Setup

This app requires Firebase credentials. Copy `.env.example` to `.env` and fill in your Firebase project values:

```bash
cp .env.example .env
```

Then edit `.env`:

```
EXPO_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id

# Google Sign-In (Sign in with Google via Firebase Auth)
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your_google_web_client_id.apps.googleusercontent.com
# Optional – required for native builds (EAS / bare workflow):
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=your_google_ios_client_id.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=your_google_android_client_id.apps.googleusercontent.com
```

These are read at build time via `app.config.ts` and exposed through `expo-constants`. You can find the Firebase values in your [Firebase console](https://console.firebase.google.com/) under **Project Settings → Your apps → SDK setup and configuration**.

> **Note**: Enable **Email/Password** and **Google** sign-in in the Firebase console under **Authentication → Sign-in method**. For Google sign-in, the **Web client ID** is listed on that same page once Google is enabled.

### Google Sign-In Setup

Google sign-in uses `expo-auth-session/providers/google` to obtain an ID token, which is then exchanged for a Firebase credential. The redirect URI is generated **automatically by expo-auth-session** — do not override it with a custom scheme, as that causes `Error 400: invalid_request`.

#### 1. Create OAuth 2.0 Client IDs in Google Cloud Console

Go to **[Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials → Create Credentials → OAuth client ID**.

| Client type | When needed | Settings |
|---|---|---|
| **Web application** | Always required | Add `https://auth.expo.io/@<your-expo-username>/CorsaNative` to Authorized redirect URIs (needed when no platform client IDs are set) |
| **Android** | Standalone EAS builds / dev clients | Package: `com.corsanative`, SHA-1: your debug/release fingerprint |
| **iOS** | Standalone EAS builds / dev clients | Bundle ID: `com.corsanative` |

> **Tip**: Firebase Console → Authentication → Sign-in method → Google shows the **Web client ID** once Google sign-in is enabled. You can also create/view all OAuth credentials in the linked Google Cloud project.

#### 2. Android SHA-1 Fingerprint

The Android OAuth client requires your signing certificate SHA-1. For **debug / emulator** builds:

```bash
# macOS / Linux
keytool -keystore ~/.android/debug.keystore -list -v \
  -alias androiddebugkey -storepass android -keypass android
```

Register this SHA-1 in both:
- **Google Cloud Console** → the Android OAuth client you created above
- **Firebase Console** → Project Settings → Your Android app → Add fingerprint

#### 3. How redirect URIs work

Google's **WEB client type does not allow custom-scheme redirect URIs** (e.g. `corsanative://`). The app handles this automatically:

| Scenario | Redirect URI used | What you must do |
|---|---|---|
| **No platform client IDs set** (Expo Go / dev, Android or iOS) | `https://auth.expo.io/@<username>/CorsaNative` (Expo auth proxy) | Register this URL in the Web client's Authorized redirect URIs |
| **`androidClientId` set** (EAS Android build) | `com.googleusercontent.apps.<androidClientId>://oauth2redirect/android` | Nothing – auto-registered when you create the Android OAuth client |
| **`iosClientId` set** (EAS iOS build) | Reversed iOS client-ID scheme | Nothing – auto-registered when you create the iOS OAuth client |

> **In practice**: during development (Expo Go or Android/iOS emulator) only `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` is required — just register the Expo proxy URL in its Authorized redirect URIs. For standalone EAS builds, set the platform-specific client IDs; they use native OAuth flows and do not need the proxy.

## MapLibre Map Setup

This app uses [MapLibre React Native](https://github.com/maplibre/maplibre-react-native) (`@maplibre/maplibre-react-native`) for map rendering instead of `react-native-maps`, so **no Google Maps API key is required**.

### Tile Provider

The default style is [OpenFreeMap Liberty](https://openfreemap.org/) — a free, open-source vector tile service backed by OpenStreetMap data with no API key required.

The style URL is defined as `TILE_STYLE_URL` in `src/components/Map/MapLibreMap.tsx`. Swap it with any [MapLibre-compatible style URL](https://maplibre.org/maplibre-style-spec/) for production use (e.g., a MapTiler or Stadia Maps style with a free-tier API key).

> **Note:** OpenFreeMap and the public OSM raster tile servers are intended for development/low-traffic use. For a production app with many users, subscribe to a tile hosting provider or self-host tiles.

### Rebuilding the Dev Client

Because MapLibre includes native code, you must **rebuild the dev client** after adding the package:

```bash
# iOS simulator
pnpm run build:ios:sim

# Android device/emulator
pnpm run build:android:device
```



```bash
pnpm install
pnpm run start
```

To make things work on your local simulator, or on your phone, you need first to [run `eas build`](https://github.com/infinitered/ignite/blob/master/docs/expo/EAS.md). We have many shortcuts on `package.json` to make it easier:

```bash
pnpm run build:ios:sim # build for ios simulator
pnpm run build:ios:device # build for ios device
pnpm run build:ios:prod # build for ios device
```

### `./assets`

This directory is designed to organize and store various assets, making it easy for you to manage and use them in your application. The assets are further categorized into subdirectories, including `icons` and `images`:

```tree
assets
├── icons
└── images
```

**icons**
This is where your icon assets will live. These icons can be used for buttons, navigation elements, or any other UI components. The recommended format for icons is PNG, but other formats can be used as well.

Ignite comes with a built-in `Icon` component. You can find detailed usage instructions in the [docs](https://github.com/infinitered/ignite/blob/master/docs/boilerplate/app/components/Icon.md).

**images**
This is where your images will live, such as background images, logos, or any other graphics. You can use various formats such as PNG, JPEG, or GIF for your images.

Another valuable built-in component within Ignite is the `AutoImage` component. You can find detailed usage instructions in the [docs](https://github.com/infinitered/ignite/blob/master/docs/Components-AutoImage.md).

How to use your `icon` or `image` assets:

```typescript
import { Image } from 'react-native';

const MyComponent = () => {
  return (
    <Image source={require('assets/images/my_image.png')} />
  );
};
```

## Running Maestro end-to-end tests

Follow our [Maestro Setup](https://ignitecookbook.com/docs/recipes/MaestroSetup) recipe.

## Next Steps

### Ignite Cookbook

[Ignite Cookbook](https://ignitecookbook.com/) is an easy way for developers to browse and share code snippets (or “recipes”) that actually work.

### Upgrade Ignite boilerplate

Read our [Upgrade Guide](https://ignitecookbook.com/docs/recipes/UpdatingIgnite) to learn how to upgrade your Ignite project.

## Community

⭐️ Help us out by [starring on GitHub](https://github.com/infinitered/ignite), filing bug reports in [issues](https://github.com/infinitered/ignite/issues) or [ask questions](https://github.com/infinitered/ignite/discussions).

💬 Join us on [Slack](https://join.slack.com/t/infiniteredcommunity/shared_invite/zt-1f137np4h-zPTq_CbaRFUOR_glUFs2UA) to discuss.

📰 Make our Editor-in-chief happy by [reading the React Native Newsletter](https://reactnativenewsletter.com/).
