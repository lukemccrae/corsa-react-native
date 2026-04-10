/**
 * Matches the GraphQL Waypoint type used by the backend.
 * Optional fields not computable locally are omitted (null/undefined) until synced.
 */
export interface Waypoint {
  streamId: string
  lat: number
  lng: number
  altitude: number | null
  timestamp: number | string // ms epoch locally, AWSDateTime when loaded from backend
  mileMarker: number | null
  cumulativeVert: number | null
  pointIndex: number | null
  private?: boolean | null
}

/** Tracking configuration stored in MMKV. */
export type TrackingCaptureMode = "auto" | "manual"
export type TrackingPowerMode = "balanced" | "battery_saver"
export type TrackingSyncMode = "auto" | "manual"

export interface TrackingConfig {
  /** Interval between waypoint captures, in minutes. */
  intervalMinutes: number
  /** Whether points are captured automatically in the background or only on user action. */
  captureMode: TrackingCaptureMode
  /** Power profile applied to background location options. */
  powerMode: TrackingPowerMode
  /** Whether pending points are synced automatically or only via manual upload. */
  syncMode: TrackingSyncMode
  /** Optional stream ID selected by the user for the next session. */
  streamId?: string
}

export const TRACKING_TASK_NAME = "BACKGROUND_LOCATION_TASK"

export const DEFAULT_INTERVAL_MINUTES = 5

export const DEFAULT_TRACKING_CONFIG: TrackingConfig = {
  intervalMinutes: DEFAULT_INTERVAL_MINUTES,
  captureMode: "auto",
  powerMode: "balanced",
  syncMode: "manual",
}
