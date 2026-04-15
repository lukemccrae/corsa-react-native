/**
 * Append-only MMKV storage for Waypoint records.
 *
 * Storage layout:
 *   waypoint:<id>       → JSON-serialised Waypoint
 *   waypoint_ids        → JSON-serialised string[] (ordered index)
 *   tracking_stream_id  → active streamId (UUID string)
 *   tracking_config     → JSON-serialised TrackingConfig
 */
import { getStorage } from "@/utils/storage"
import type { TrackingConfig, Waypoint } from "./waypointTypes"
import { clampTrackingIntervalMinutes } from "./waypointTypes"
import { DEFAULT_TRACKING_CONFIG } from "./waypointTypes"

const WAYPOINT_IDS_KEY = "waypoint_ids"
const TRACKING_STREAM_ID_KEY = "tracking_stream_id"
const TRACKING_CONFIG_KEY = "tracking_config"

// ─── Index helpers ────────────────────────────────────────────────────────────

function getWaypointIds(): string[] {
  try {
    const raw = getStorage().getString(WAYPOINT_IDS_KEY)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

function setWaypointIds(ids: string[]): void {
  getStorage().set(WAYPOINT_IDS_KEY, JSON.stringify(ids))
}

function normalizeWaypoint(waypoint: Waypoint): Waypoint {
  return {
    ...waypoint,
    mileMarker: waypoint.mileMarker ?? null,
    cumulativeVert: waypoint.cumulativeVert ?? null,
    pointIndex: waypoint.pointIndex ?? null,
  }
}

function normalizeTrackingConfig(config?: Partial<TrackingConfig> | null): TrackingConfig {
  return {
    ...DEFAULT_TRACKING_CONFIG,
    ...(config ?? {}),
    intervalMinutes: clampTrackingIntervalMinutes(
      typeof config?.intervalMinutes === "number"
        ? config.intervalMinutes
        : DEFAULT_TRACKING_CONFIG.intervalMinutes,
    ),
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Persist a single waypoint. The waypoint's timestamp is used as its key so
 * duplicate deliveries from the OS are naturally de-duplicated.
 */
export function appendWaypoint(waypoint: Waypoint): void {
  const normalized = normalizeWaypoint(waypoint)
  const id = `${normalized.streamId}_${normalized.timestamp}`
  getStorage().set(`waypoint:${id}`, JSON.stringify(normalized))
  const ids = getWaypointIds()
  if (!ids.includes(id)) {
    ids.push(id)
    setWaypointIds(ids)
    if (__DEV__) {
      console.info("[WaypointTracking] recorded", {
        streamId: normalized.streamId,
        timestamp: normalized.timestamp,
        lat: normalized.lat,
        lng: normalized.lng,
        altitude: normalized.altitude,
        cumulativeVert: normalized.cumulativeVert,
        mileMarker: normalized.mileMarker,
        pointIndex: normalized.pointIndex,
      })
    }
  }
}

/**
 * Load a single waypoint by composite key (streamId_timestamp).
 */
export function getWaypoint(id: string): Waypoint | null {
  try {
    const raw = getStorage().getString(`waypoint:${id}`)
    return raw ? normalizeWaypoint(JSON.parse(raw) as Waypoint) : null
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
  ids.forEach((id) => getStorage().delete(`waypoint:${id}`))
  getStorage().delete(WAYPOINT_IDS_KEY)
}

/**
 * Delete a subset of waypoints by composite IDs (streamId_timestamp).
 */
export function removeWaypointsByIds(idsToRemove: string[]): void {
  if (idsToRemove.length === 0) return

  const ids = getWaypointIds()
  const removeSet = new Set(idsToRemove)
  const remainingIds = ids.filter((id) => !removeSet.has(id))

  ids.forEach((id) => {
    if (removeSet.has(id)) {
      getStorage().delete(`waypoint:${id}`)
    }
  })

  if (remainingIds.length === 0) {
    getStorage().delete(WAYPOINT_IDS_KEY)
    return
  }

  setWaypointIds(remainingIds)
}

// ─── Stream ID ────────────────────────────────────────────────────────────────

/**
 * Persist the active stream ID so background tasks can reference it.
 */
export function setActiveStreamId(streamId: string): void {
  getStorage().set(TRACKING_STREAM_ID_KEY, streamId)
}

/**
 * Retrieve the active stream ID, or null if tracking has never started.
 */
export function getActiveStreamId(): string | null {
  return getStorage().getString(TRACKING_STREAM_ID_KEY) ?? null
}

export function clearActiveStreamId(): void {
  getStorage().delete(TRACKING_STREAM_ID_KEY)
}

// ─── Tracking config ──────────────────────────────────────────────────────────

/**
 * Persist tracking configuration (e.g. interval).
 */
export function saveTrackingConfig(config: Partial<TrackingConfig>): void {
  const nextConfig = normalizeTrackingConfig({
    ...loadTrackingConfig(),
    ...config,
  })

  getStorage().set(TRACKING_CONFIG_KEY, JSON.stringify(nextConfig))
}

/**
 * Load tracking configuration, returning defaults if none is stored.
 */
export function loadTrackingConfig(): TrackingConfig {
  try {
    const raw = getStorage().getString(TRACKING_CONFIG_KEY)
    return raw ? normalizeTrackingConfig(JSON.parse(raw) as Partial<TrackingConfig>) : DEFAULT_TRACKING_CONFIG
  } catch {
    return DEFAULT_TRACKING_CONFIG
  }
}
