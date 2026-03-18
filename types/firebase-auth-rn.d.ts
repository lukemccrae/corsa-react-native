/**
 * Module augmentation for Firebase Auth in a React Native context.
 *
 * `getReactNativePersistence` is exported by the `react-native` conditional bundle
 * of `@firebase/auth` (resolved by Metro at runtime), but is absent from the
 * general TypeScript declarations used by `tsc`.  This declaration fills that gap
 * so the project can compile cleanly.
 */

import { ReactNativeAsyncStorage, Persistence } from "@firebase/auth"

declare module "firebase/auth" {
  /**
   * Returns a persistence object backed by the provided `AsyncStorage`
   * implementation, suitable for use with `initializeAuth()` in a React
   * Native project.
   */
  export function getReactNativePersistence(storage: ReactNativeAsyncStorage): Persistence
}
