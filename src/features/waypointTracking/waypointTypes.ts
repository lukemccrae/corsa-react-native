/**
 * Matches the GraphQL Waypoint type used by the backend.
 * Optional fields not computable locally are omitted (null/undefined) until synced.
 */
export interface Waypoint {
  streamId: string
  lat: number
  lng: number
  altitude: number | null
  timestamp: string // ISO 8601 / AWSDateTime
  mileMarker?: number | null
  cumulativeVert?: number | null
  pointIndex?: number | null
  private?: boolean | null
}

/** Tracking configuration stored in MMKV. */
export interface TrackingConfig {
  /** Interval between waypoint captures, in minutes. */
  intervalMinutes: number
}

export const TRACKING_TASK_NAME = "BACKGROUND_LOCATION_TASK"

export const DEFAULT_INTERVAL_MINUTES = 5

/** Distance threshold used on iOS (metres). Approximates the time interval. */
export const IOS_DISTANCE_INTERVAL_M = 200
