/**
 * Background location task registration and start/stop helpers.
 *
 * Call registerTrackingTaskIfNeeded() from the root layout's useEffect to
 * register the background task after the native bridge is ready.  Defining
 * the task at module-import time (i.e. at the top level) can trigger native
 * ObjCTurboModule calls before the bridge is initialised, causing a SIGABRT
 * crash on TestFlight.
 */
import { Platform } from "react-native"
import * as Location from "expo-location"
import * as TaskManager from "expo-task-manager"

import { appendWaypoint } from "./waypointStorage"
import { getActiveStreamId } from "./waypointStorage"
import type { Waypoint } from "./waypointTypes"
import type { TrackingPowerMode } from "./waypointTypes"
import { TRACKING_TASK_NAME } from "./waypointTypes"

export const TRACKING_UNAVAILABLE_MESSAGE =
  "Background location tracking requires a development build or standalone app. Expo Go and web do not support Expo Task Manager background execution for this feature."

async function isTaskManagerAvailable(): Promise<boolean> {
  if (Platform.OS === "web") return false

  return TaskManager.isAvailableAsync()
}

async function ensureTaskManagerAvailable(): Promise<void> {
  if (!(await isTaskManagerAvailable())) {
    throw new Error(TRACKING_UNAVAILABLE_MESSAGE)
  }
}

function getAccuracy(powerMode: TrackingPowerMode): Location.Accuracy {
  if (powerMode === "battery_saver") {
    return Location.Accuracy.Balanced
  }

  return Platform.OS === "ios" ? Location.Accuracy.BestForNavigation : Location.Accuracy.High
}

function getIosDistanceIntervalM(intervalMinutes: number, powerMode: TrackingPowerMode): number {
  const minutesScaled = Math.max(25, Math.min(250, Math.round(intervalMinutes * 8)))
  if (powerMode === "battery_saver") {
    return Math.max(60, minutesScaled)
  }

  return minutesScaled
}

async function captureCurrentWaypoint(
  streamId: string,
  powerMode: TrackingPowerMode = "balanced",
): Promise<Waypoint> {
  const current = await Location.getCurrentPositionAsync({
    accuracy: getAccuracy(powerMode),
  })

  const waypoint: Waypoint = {
    streamId,
    lat: current.coords.latitude,
    lng: current.coords.longitude,
    altitude: current.coords.altitude ?? null,
    timestamp: current.timestamp,
    cumulativeVert: null,
    mileMarker: null,
    pointIndex: null,
  }

  appendWaypoint(waypoint)
  return waypoint
}

// ─── Task registration ────────────────────────────────────────────────────────

/**
 * Register the background location task with the OS if it hasn't been
 * registered yet.
 *
 * This MUST be called from a useEffect (i.e. after the native bridge is
 * fully initialised) rather than at module scope.  Calling TaskManager APIs
 * synchronously during JS module evaluation causes ObjCTurboModule to throw
 * before the bridge is ready, resulting in a SIGABRT crash on TestFlight.
 */
export async function registerTrackingTaskIfNeeded(): Promise<void> {
  // TaskManager is not available on web or in Expo Go.
  if (Platform.OS === "web") return
  if (!(await TaskManager.isAvailableAsync())) return

  if (!TaskManager.isTaskDefined(TRACKING_TASK_NAME)) {
    TaskManager.defineTask(TRACKING_TASK_NAME, async ({ data, error }) => {
      if (error) {
        console.warn("[WaypointTracking] task error", error)
        return
      }

      const streamId = getActiveStreamId()
      if (!streamId) return

      const { locations } = data as { locations: Location.LocationObject[] }
      locations.forEach((loc) => {
        const waypoint: Waypoint = {
          streamId,
          lat: loc.coords.latitude,
          lng: loc.coords.longitude,
          altitude: loc.coords.altitude ?? null,
          timestamp: loc.timestamp,
          cumulativeVert: null,
          mileMarker: null,
          pointIndex: null,
        }
        appendWaypoint(waypoint)
      })
    })
  }
}

// ─── Permission helpers ───────────────────────────────────────────────────────

export type PermissionResult =
  | "granted"
  | "foreground_denied"
  | "background_denied"
  | "task_manager_unavailable"

/**
 * Request location permissions.
 *
 * Foreground permission is always requested first. Background permission is
 * only requested when requireBackground=true.
 * Returns a PermissionResult describing the outcome.
 */
export async function requestLocationPermissions(options?: {
  requireBackground?: boolean
}): Promise<PermissionResult> {
  if (!(await isTaskManagerAvailable())) return "task_manager_unavailable"

  const requireBackground = options?.requireBackground ?? false

  const fg = await Location.requestForegroundPermissionsAsync()
  if (fg.status !== "granted") return "foreground_denied"

  if (!requireBackground) return "granted"

  const bg = await Location.requestBackgroundPermissionsAsync()
  if (bg.status !== "granted") return "background_denied"

  return "granted"
}

// ─── Start / stop ─────────────────────────────────────────────────────────────

/**
 * Start background location updates at the given interval (minutes).
 * Throws if permissions have not been granted.
 */
export async function startLocationTracking(
  intervalMinutes: number,
  powerMode: TrackingPowerMode = "balanced",
): Promise<void> {
  await ensureTaskManagerAvailable()

  const msInterval = intervalMinutes * 60 * 1000
  const iosDistanceIntervalM = getIosDistanceIntervalM(intervalMinutes, powerMode)

  const options: Location.LocationTaskOptions = {
    accuracy: getAccuracy(powerMode),
    showsBackgroundLocationIndicator: true,
    pausesUpdatesAutomatically: true,
    ...(Platform.OS === "android"
      ? { timeInterval: msInterval, distanceInterval: 0 }
      : {
          // iOS does not support timeInterval reliably; use distance + deferred
          distanceInterval: iosDistanceIntervalM,
          deferredUpdatesInterval: msInterval,
          deferredUpdatesDistance: iosDistanceIntervalM,
        }),
  }

  await Location.startLocationUpdatesAsync(TRACKING_TASK_NAME, options)

  // Seed one waypoint immediately so users can verify tracking started.
  const streamId = getActiveStreamId()
  if (streamId) {
    try {
      await captureCurrentWaypoint(streamId, powerMode)
    } catch {
      // If we cannot get an immediate fix, background updates will still continue.
    }
  }
}

/**
 * Capture one foreground waypoint immediately for the active stream (or a provided stream ID).
 */
export async function recordCurrentWaypointNow(streamIdOverride?: string): Promise<Waypoint> {
  const streamId = streamIdOverride ?? getActiveStreamId()
  if (!streamId) {
    throw new Error("No active stream selected for waypoint tracking.")
  }

  return captureCurrentWaypoint(streamId)
}

/**
 * Stop background location updates if they are running.
 */
export async function stopLocationTracking(): Promise<void> {
  if (!(await isTaskManagerAvailable())) return

  const isRunning = await Location.hasStartedLocationUpdatesAsync(TRACKING_TASK_NAME)
  if (isRunning) {
    await Location.stopLocationUpdatesAsync(TRACKING_TASK_NAME)
  }
}

/**
 * Returns true if the background location task is currently running.
 */
export async function isTrackingActive(): Promise<boolean> {
  if (!(await isTaskManagerAvailable())) return false

  return Location.hasStartedLocationUpdatesAsync(TRACKING_TASK_NAME)
}
