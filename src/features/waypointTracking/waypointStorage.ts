/**
 * Append-only MMKV storage for Waypoint records.
 *
 * Storage layout:
 *   waypoint:<id>       → JSON-serialised Waypoint
 *   waypoint_ids        → JSON-serialised string[] (ordered index)
 *   tracking_stream_id  → active streamId (UUID string)
 *   tracking_config     → JSON-serialised TrackingConfig
 */
import { storage } from "@/utils/storage"
import type { TrackingConfig, Waypoint } from "./waypointTypes"
import { DEFAULT_INTERVAL_MINUTES } from "./waypointTypes"

const WAYPOINT_IDS_KEY = "waypoint_ids"
const TRACKING_STREAM_ID_KEY = "tracking_stream_id"
const TRACKING_CONFIG_KEY = "tracking_config"

// ─── Index helpers ────────────────────────────────────────────────────────────

function getWaypointIds(): string[] {
  try {
    const raw = storage.getString(WAYPOINT_IDS_KEY)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

function setWaypointIds(ids: string[]): void {
  storage.set(WAYPOINT_IDS_KEY, JSON.stringify(ids))
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Persist a single waypoint. The waypoint's timestamp is used as its key so
 * duplicate deliveries from the OS are naturally de-duplicated.
 */
export function appendWaypoint(waypoint: Waypoint): void {
  const id = `${waypoint.streamId}_${waypoint.timestamp}`
  storage.set(`waypoint:${id}`, JSON.stringify(waypoint))
  const ids = getWaypointIds()
  if (!ids.includes(id)) {
    ids.push(id)
    setWaypointIds(ids)
  }
}

/**
 * Load a single waypoint by composite key (streamId_timestamp).
 */
export function getWaypoint(id: string): Waypoint | null {
  try {
    const raw = storage.getString(`waypoint:${id}`)
    return raw ? (JSON.parse(raw) as Waypoint) : null
  } catch {
    return null
  }
}

/**
 * Return all stored waypoints in insertion order.
 */
export function getAllWaypoints(): Waypoint[] {
  return getWaypointIds()
    .map((id) => getWaypoint(id))
    .filter((w): w is Waypoint => w !== null)
}

/**
 * Return the count of stored waypoints without loading the full records.
 */
export function getWaypointCount(): number {
  return getWaypointIds().length
}

/**
 * Delete all stored waypoints and reset the index.
 */
export function clearWaypoints(): void {
  const ids = getWaypointIds()
  ids.forEach((id) => storage.delete(`waypoint:${id}`))
  storage.delete(WAYPOINT_IDS_KEY)
}

// ─── Stream ID ────────────────────────────────────────────────────────────────

/**
 * Persist the active stream ID so background tasks can reference it.
 */
export function setActiveStreamId(streamId: string): void {
  storage.set(TRACKING_STREAM_ID_KEY, streamId)
}

/**
 * Retrieve the active stream ID, or null if tracking has never started.
 */
export function getActiveStreamId(): string | null {
  return storage.getString(TRACKING_STREAM_ID_KEY) ?? null
}

export function clearActiveStreamId(): void {
  storage.delete(TRACKING_STREAM_ID_KEY)
}

// ─── Tracking config ──────────────────────────────────────────────────────────

/**
 * Persist tracking configuration (e.g. interval).
 */
export function saveTrackingConfig(config: TrackingConfig): void {
  storage.set(TRACKING_CONFIG_KEY, JSON.stringify(config))
}

/**
 * Load tracking configuration, returning defaults if none is stored.
 */
export function loadTrackingConfig(): TrackingConfig {
  try {
    const raw = storage.getString(TRACKING_CONFIG_KEY)
    return raw ? (JSON.parse(raw) as TrackingConfig) : { intervalMinutes: DEFAULT_INTERVAL_MINUTES }
  } catch {
    return { intervalMinutes: DEFAULT_INTERVAL_MINUTES }
  }
}
