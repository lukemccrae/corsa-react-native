import { MMKV } from "react-native-mmkv"

let _storage: MMKV | null = null

/** Returns (or lazily creates) the shared MMKV instance. */
function getStorage(): MMKV {
  if (!_storage) {
    _storage = new MMKV()
  }
  return _storage
}

/**
 * Lazy MMKV storage proxy – the native MMKV instance is not constructed until
 * the first property access. This avoids initialising the native module at
 * import time, which can cause a SIGABRT in TestFlight / release builds before
 * the React Native runtime is fully ready.
 */
export const storage: MMKV = new Proxy({} as MMKV, {
  get(_target, prop: string | symbol) {
    const instance = getStorage()
    const val = (instance as unknown as Record<string | symbol, unknown>)[prop]
    return typeof val === "function" ? (val as (...args: unknown[]) => unknown).bind(instance) : val
  },
  set(_target, prop: string | symbol, value: unknown) {
    ;(getStorage() as unknown as Record<string | symbol, unknown>)[prop] = value
    return true
  },
})

/**
 * Loads a string from storage.
 *
 * @param key The key to fetch.
 */
export function loadString(key: string): string | null {
  try {
    return storage.getString(key) ?? null
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
    storage.set(key, value)
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
    storage.delete(key)
  } catch {}
}

/**
 * Burn it all to the ground.
 */
export function clear(): void {
  try {
    storage.clearAll()
  } catch {}
}
