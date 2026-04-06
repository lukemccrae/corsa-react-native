/**
 * Background location task registration and start/stop helpers.
 *
 * The task MUST be defined (via TaskManager.defineTask) before the app can be
 * suspended.  Import this module in the root layout to ensure early
 * registration.
 */
import { Platform } from "react-native"
import * as Location from "expo-location"
import * as TaskManager from "expo-task-manager"

import { appendWaypoint } from "./waypointStorage"
import { getActiveStreamId } from "./waypointStorage"
import type { Waypoint } from "./waypointTypes"
import { IOS_DISTANCE_INTERVAL_M, TRACKING_TASK_NAME } from "./waypointTypes"

// ─── Task definition ──────────────────────────────────────────────────────────

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
      timestamp: new Date(loc.timestamp).toISOString(),
    }
    appendWaypoint(waypoint)
  })
})

// ─── Permission helpers ───────────────────────────────────────────────────────

export type PermissionResult = "granted" | "foreground_denied" | "background_denied"

/**
 * Request foreground then background location permissions.
 * Returns a PermissionResult describing the outcome.
 */
export async function requestLocationPermissions(): Promise<PermissionResult> {
  const fg = await Location.requestForegroundPermissionsAsync()
  if (fg.status !== "granted") return "foreground_denied"

  const bg = await Location.requestBackgroundPermissionsAsync()
  if (bg.status !== "granted") return "background_denied"

  return "granted"
}

// ─── Start / stop ─────────────────────────────────────────────────────────────

/**
 * Start background location updates at the given interval (minutes).
 * Throws if permissions have not been granted.
 */
export async function startLocationTracking(intervalMinutes: number): Promise<void> {
  const msInterval = intervalMinutes * 60 * 1000

  const options: Location.LocationTaskOptions = {
    accuracy: Location.Accuracy.Balanced,
    showsBackgroundLocationIndicator: true,
    pausesUpdatesAutomatically: false,
    ...(Platform.OS === "android"
      ? { timeInterval: msInterval, distanceInterval: 0 }
      : {
          // iOS does not support timeInterval reliably; use distance + deferred
          distanceInterval: IOS_DISTANCE_INTERVAL_M,
          deferredUpdatesInterval: msInterval,
          deferredUpdatesDistance: IOS_DISTANCE_INTERVAL_M,
        }),
  }

  await Location.startLocationUpdatesAsync(TRACKING_TASK_NAME, options)
}

/**
 * Stop background location updates if they are running.
 */
export async function stopLocationTracking(): Promise<void> {
  const isRunning = await Location.hasStartedLocationUpdatesAsync(TRACKING_TASK_NAME)
  if (isRunning) {
    await Location.stopLocationUpdatesAsync(TRACKING_TASK_NAME)
  }
}

/**
 * Returns true if the background location task is currently running.
 */
export async function isTrackingActive(): Promise<boolean> {
  return Location.hasStartedLocationUpdatesAsync(TRACKING_TASK_NAME)
}
