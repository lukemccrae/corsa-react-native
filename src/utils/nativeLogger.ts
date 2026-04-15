import { NativeModules, Platform } from "react-native"

const nativeLogger = NativeModules.CorsaNativeLogger as
  | {
      log: (message: string) => void
    }
  | undefined

function serializeDetails(details?: Record<string, unknown>) {
  if (!details) return ""

  try {
    return ` ${JSON.stringify(details)}`
  } catch {
    return " [unserializable-details]"
  }
}

export function logToNativeConsole(
  level: "log" | "warn",
  prefix: string,
  message: string,
  details?: Record<string, unknown>,
) {
  const formattedMessage = `${prefix} ${message}${serializeDetails(details)}`

  if (Platform.OS === "ios" && nativeLogger?.log) {
    nativeLogger.log(formattedMessage)
  }

  if (level === "warn") {
    console.warn(formattedMessage)
    return
  }

  console.log(formattedMessage)
}