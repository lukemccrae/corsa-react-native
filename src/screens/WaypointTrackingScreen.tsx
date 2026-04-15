import { FC, useCallback, useEffect, useState } from "react"
import { Alert, TextInput, TextStyle, View, ViewStyle } from "react-native"
import { useRouter } from "expo-router"

import { Button } from "@/components/Button"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

import {
  isTrackingActive,
  requestLocationPermissions,
  startLocationTracking,
  stopLocationTracking,
  TRACKING_UNAVAILABLE_MESSAGE,
} from "@/features/waypointTracking/locationTask"
import {
  clearActiveStreamId,
  clearWaypoints,
  getWaypointCount,
  loadTrackingConfig,
  saveTrackingConfig,
  setActiveStreamId,
} from "@/features/waypointTracking/waypointStorage"
import {
  DEFAULT_INTERVAL_MINUTES,
  MAX_TRACKING_INTERVAL_MINUTES,
  MIN_TRACKING_INTERVAL_MINUTES,
  clampTrackingIntervalMinutes,
} from "@/features/waypointTracking/waypointTypes"
import { getRandomValues } from "expo-crypto"

function parseTrackingIntervalInput(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null

  const parsed = Number.parseInt(trimmed, 10)
  if (!Number.isFinite(parsed)) return null
  if (parsed < MIN_TRACKING_INTERVAL_MINUTES || parsed > MAX_TRACKING_INTERVAL_MINUTES) return null

  return parsed
}

function confirmBackgroundLocationPrompt(): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(
      "Enable background waypoint tracking?",
      "If you continue, Corsa will request 'Always' location so your route can keep recording after you lock your phone or leave the app. This is only used for activity tracking and is not used for ads.",
      [
        { text: "Not now", style: "cancel", onPress: () => resolve(false) },
        { text: "Continue", onPress: () => resolve(true) },
      ],
    )
  })
}

/** Generate a UUID v4 using expo-crypto for managed-workflow compatibility. */
function generateUUID(): string {
  const bytes = new Uint8Array(16)
  getRandomValues(bytes)
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

export const WaypointTrackingScreen: FC = function WaypointTrackingScreen() {
  const { themed } = useAppTheme()
  const router = useRouter()

  const [tracking, setTracking] = useState(false)
  const [waypointCount, setWaypointCount] = useState(0)
  const [intervalMinutes, setIntervalMinutes] = useState(DEFAULT_INTERVAL_MINUTES)
  const [intervalInput, setIntervalInput] = useState(String(DEFAULT_INTERVAL_MINUTES))
  const [intervalError, setIntervalError] = useState<string | null>(null)
  const [permissionError, setPermissionError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async () => {
    const active = await isTrackingActive()
    setTracking(active)
    setWaypointCount(getWaypointCount())
    const config = loadTrackingConfig()
    setIntervalMinutes(config.intervalMinutes)
    setIntervalInput(String(config.intervalMinutes))
    setIntervalError(null)
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const handleStart = async () => {
    setBusy(true)
    setPermissionError(null)

    try {
      const shouldRequestBackground = await confirmBackgroundLocationPrompt()
      if (!shouldRequestBackground) return

      const result = await requestLocationPermissions({ requireBackground: true })
      if (result === "task_manager_unavailable") {
        setPermissionError(TRACKING_UNAVAILABLE_MESSAGE)
        return
      }
      if (result === "foreground_denied") {
        setPermissionError(
          "Foreground location permission is required. Please enable it in your device settings.",
        )
        return
      }
      if (result === "background_denied") {
        setPermissionError(
          "Background location permission is required to track while the app is closed. Please set location access to 'Always' in your device settings.",
        )
        return
      }

      const streamId = generateUUID()
      setActiveStreamId(streamId)
      await startLocationTracking(intervalMinutes)
      await refresh()
    } catch (error) {
      setPermissionError(
        error instanceof Error ? error.message : "Could not start waypoint tracking.",
      )
      clearActiveStreamId()
    } finally {
      setBusy(false)
    }
  }

  const handleStop = async () => {
    setBusy(true)

    try {
      await stopLocationTracking()
      clearActiveStreamId()
      await refresh()
    } catch (error) {
      setPermissionError(
        error instanceof Error ? error.message : "Could not stop waypoint tracking.",
      )
    } finally {
      setBusy(false)
    }
  }

  const handleClear = () => {
    Alert.alert(
      "Clear waypoints",
      "This will permanently delete all stored waypoints. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: () => {
            clearWaypoints()
            setWaypointCount(0)
          },
        },
      ],
    )
  }

  const handleIntervalChange = (minutes: number) => {
    const clamped = clampTrackingIntervalMinutes(minutes)
    setIntervalMinutes(clamped)
    setIntervalInput(String(clamped))
    setIntervalError(null)
    saveTrackingConfig({ intervalMinutes: clamped })
  }

  const applyIntervalInput = useCallback(() => {
    const parsed = parseTrackingIntervalInput(intervalInput)
    if (parsed == null) {
      setIntervalError(
        `Enter a number from ${MIN_TRACKING_INTERVAL_MINUTES} to ${MAX_TRACKING_INTERVAL_MINUTES} minutes.`,
      )
      return false
    }

    handleIntervalChange(parsed)
    return true
  }, [intervalInput])

  return (
    <Screen preset="scroll" contentContainerStyle={themed($container)}>
      <View style={themed($headerRow)}>
        <Text text="Waypoint Tracking" preset="subheading" />
        <Button
          text="Back"
          preset="default"
          onPress={() => router.back()}
          style={themed($backButton)}
        />
      </View>

      {/* Status */}
      <View style={themed($section)}>
        <Text text="Status" preset="formLabel" style={themed($sectionLabel)} />
        <View style={themed($statusRow)}>
          <View style={[themed($statusDot), tracking ? themed($dotActive) : themed($dotInactive)]} />
          <Text text={tracking ? "Tracking active" : "Tracking stopped"} />
        </View>
        <Text
          text={`Stored waypoints: ${waypointCount}`}
          size="xs"
          style={themed($subtleText)}
        />
      </View>

      {/* Permission error */}
      {permissionError ? (
        <View style={themed($errorBox)}>
          <Text text={permissionError} size="xs" style={themed($errorText)} />
        </View>
      ) : null}

      {/* Controls */}
      <View style={themed($section)}>
        <Text text="Controls" preset="formLabel" style={themed($sectionLabel)} />
        <View style={themed($buttonRow)}>
          <Button
            text="Start tracking"
            preset="filled"
            onPress={() => void handleStart()}
            disabled={tracking || busy}
            style={themed($controlButton)}
          />
          <Button
            text="Stop tracking"
            preset="default"
            onPress={() => void handleStop()}
            disabled={!tracking || busy}
            style={themed($controlButton)}
          />
        </View>
      </View>

      {/* Interval selector */}
      <View style={themed($section)}>
        <Text text="Tracking interval" preset="formLabel" style={themed($sectionLabel)} />
        <Text
          text="Set how often to record a waypoint in minutes. Whole numbers only."
          size="xs"
          style={themed($subtleText)}
        />
        <View style={themed($customIntervalRow)}>
          <Text text="Minutes" size="xs" weight="medium" style={themed($customIntervalLabel)} />
          <TextInput
            style={themed($customIntervalInput)}
            value={intervalInput}
            onChangeText={(value) => {
              const digitsOnly = value.replace(/[^0-9]/g, "")
              setIntervalInput(digitsOnly)
              setIntervalError(null)
            }}
            onBlur={() => {
              void applyIntervalInput()
            }}
            keyboardType="number-pad"
            returnKeyType="done"
            maxLength={2}
            placeholder="1 to 60"
            placeholderTextColor="#64748b"
            editable={!tracking}
            accessibilityLabel="Tracking interval in minutes, whole numbers only"
          />
          <Button
            text="Apply"
            preset="default"
            onPress={() => {
              void applyIntervalInput()
            }}
            disabled={tracking}
            style={themed($customIntervalApplyButton)}
          />
        </View>
        {intervalError ? (
          <Text text={intervalError} size="xs" style={themed($errorText)} />
        ) : (
          <Text text={`Custom interval: ${intervalMinutes} minute(s)`} size="xs" style={themed($subtleText)} />
        )}
        {tracking ? (
          <Text
            text="Stop tracking to change the interval."
            size="xs"
            style={themed($subtleText)}
          />
        ) : null}
      </View>

      {/* Data actions */}
      <View style={themed($section)}>
        <Text text="Data" preset="formLabel" style={themed($sectionLabel)} />
        <View style={themed($buttonRow)}>
          <Button
            text="Clear data"
            preset="default"
            onPress={handleClear}
            disabled={waypointCount === 0}
            style={themed($controlButton)}
          />
        </View>
      </View>
    </Screen>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const $container: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.md,
  paddingBottom: spacing.xxl,
  gap: spacing.lg,
})

const $headerRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  paddingTop: spacing.md,
})

const $backButton: ThemedStyle<ViewStyle> = () => ({
  minWidth: 80,
  minHeight: 44,
})

const $section: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  gap: spacing.sm,
})

const $sectionLabel: ThemedStyle<TextStyle> = () => ({})

const $statusRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.xs,
})

const $statusDot: ThemedStyle<ViewStyle> = () => ({
  width: 10,
  height: 10,
  borderRadius: 5,
})

const $dotActive: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.tint,
})

const $dotInactive: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.palette.neutral400,
})

const $subtleText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
})

const $errorBox: ThemedStyle<ViewStyle> = ({ spacing, colors }) => ({
  backgroundColor: colors.errorBackground,
  borderRadius: 8,
  padding: spacing.sm,
})

const $errorText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.error,
})

const $buttonRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  gap: spacing.sm,
  flexWrap: "wrap",
})

const $controlButton: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
  minHeight: 44,
})

const $customIntervalRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "column",
  alignItems: "stretch",
  gap: spacing.xs,
})

const $customIntervalLabel: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.text,
})

const $customIntervalInput: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  flex: 1,
  minHeight: 44,
  borderWidth: 1,
  borderRadius: 10,
  borderColor: colors.palette.neutral300,
  color: colors.text,
  backgroundColor: colors.background,
  paddingHorizontal: spacing.sm,
})

const $customIntervalApplyButton: ThemedStyle<ViewStyle> = () => ({
  minHeight: 44,
})
