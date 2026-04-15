import { MMKV } from "react-native-mmkv"

// Lazy singleton – the MMKV constructor is NOT called when this module is
// imported.  Eager initialisation (new MMKV() at module scope) can trigger
// ObjCTurboModule native calls before the JS bridge is fully initialised,
// causing a SIGABRT crash on TestFlight.
let _storage: MMKV | null = null

/**
 * Returns the shared MMKV storage instance, creating it on first call.
 * Use this instead of importing `storage` directly.
 */
export function getStorage(): MMKV {
  if (!_storage) _storage = new MMKV()
  return _storage
}

/**
 * Loads a string from storage.
 *
 * @param key The key to fetch.
 */
export function loadString(key: string): string | null {
  try {
    return getStorage().getString(key) ?? null
  } catch {
    // not sure why this would fail... even reading the RN docs I'm unclear
    return null
  }
}

/**
 * Saves a string to storage.
 *
 * @param key The key to fetch.
 * @param value The value to store.
 */
export function saveString(key: string, value: string): boolean {
  try {
    getStorage().set(key, value)
    return true
  } catch {
    return false
  }
}

/**
 * Loads something from storage and runs it thru JSON.parse.
 *
 * @param key The key to fetch.
 */
export function load<T>(key: string): T | null {
  let almostThere: string | null = null
  try {
    almostThere = loadString(key)
    return JSON.parse(almostThere ?? "") as T
  } catch {
    return (almostThere as T) ?? null
  }
}

/**
 * Saves an object to storage.
 *
 * @param key The key to fetch.
 * @param value The value to store.
 */
export function save(key: string, value: unknown): boolean {
  try {
    saveString(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

/**
 * Removes something from storage.
 *
 * @param key The key to kill.
 */
export function remove(key: string): void {
  try {
    getStorage().delete(key)
  } catch {}
}

/**
 * Burn it all to the ground.
 */
export function clear(): void {
  try {
    getStorage().clearAll()
  } catch {}
}
