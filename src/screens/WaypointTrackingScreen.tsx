import { FC, useCallback, useEffect, useState } from "react"
import { Alert, Clipboard, ScrollView, TextStyle, View, ViewStyle } from "react-native"
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
} from "@/features/waypointTracking/locationTask"
import {
  clearActiveStreamId,
  clearWaypoints,
  getAllWaypoints,
  getWaypointCount,
  loadTrackingConfig,
  saveTrackingConfig,
  setActiveStreamId,
} from "@/features/waypointTracking/waypointStorage"
import { DEFAULT_INTERVAL_MINUTES } from "@/features/waypointTracking/waypointTypes"
import { getRandomValues } from "expo-crypto"

const INTERVAL_OPTIONS = [1, 2, 5, 10, 15, 30]

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
  const [permissionError, setPermissionError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async () => {
    const active = await isTrackingActive()
    setTracking(active)
    setWaypointCount(getWaypointCount())
    const config = loadTrackingConfig()
    setIntervalMinutes(config.intervalMinutes)
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const handleStart = async () => {
    setBusy(true)
    setPermissionError(null)
    const result = await requestLocationPermissions()
    if (result === "foreground_denied") {
      setPermissionError(
        "Foreground location permission is required. Please enable it in your device settings.",
      )
      setBusy(false)
      return
    }
    if (result === "background_denied") {
      setPermissionError(
        "Background location permission is required to track while the app is closed. Please set location access to 'Always' in your device settings.",
      )
      setBusy(false)
      return
    }
    const streamId = generateUUID()
    setActiveStreamId(streamId)
    await startLocationTracking(intervalMinutes)
    await refresh()
    setBusy(false)
  }

  const handleStop = async () => {
    setBusy(true)
    await stopLocationTracking()
    clearActiveStreamId()
    await refresh()
    setBusy(false)
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

  const handleExport = () => {
    const waypoints = getAllWaypoints()
    if (waypoints.length === 0) {
      Alert.alert("No waypoints", "There are no stored waypoints to export.")
      return
    }
    const json = JSON.stringify(waypoints, null, 2)
    Clipboard.setString(json)
    Alert.alert(
      "Exported",
      `${waypoints.length} waypoint(s) copied to clipboard as JSON.`,
    )
  }

  const handleIntervalChange = (minutes: number) => {
    setIntervalMinutes(minutes)
    saveTrackingConfig({ intervalMinutes: minutes })
  }

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
          text="How often to record a waypoint (minutes). Lower values use more battery."
          size="xs"
          style={themed($subtleText)}
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={themed($intervalRow)}
        >
          {INTERVAL_OPTIONS.map((opt) => (
            <Button
              key={opt}
              text={`${opt} min`}
              preset={intervalMinutes === opt ? "filled" : "default"}
              onPress={() => handleIntervalChange(opt)}
              style={themed($intervalButton)}
              disabled={tracking}
            />
          ))}
        </ScrollView>
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
            text="Export JSON"
            preset="default"
            onPress={handleExport}
            disabled={waypointCount === 0}
            style={themed($controlButton)}
          />
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

const $dotActive: ThemedStyle<ViewStyle> = () => ({
  backgroundColor: "#2DA44E",
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

const $intervalRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  gap: spacing.xs,
  paddingVertical: spacing.xxs,
})

const $intervalButton: ThemedStyle<ViewStyle> = () => ({
  minHeight: 44,
})
