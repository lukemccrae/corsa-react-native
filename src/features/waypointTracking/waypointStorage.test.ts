import { getStorage } from "@/utils/storage"
import {
  appendWaypoint,
  clearWaypoints,
  removeWaypointsByIds,
  getAllWaypoints,
  getActiveStreamId,
  getWaypoint,
  getWaypointCount,
  loadTrackingConfig,
  saveTrackingConfig,
  setActiveStreamId,
  clearActiveStreamId,
} from "./waypointStorage"
import type { Waypoint } from "./waypointTypes"
import { DEFAULT_TRACKING_CONFIG } from "./waypointTypes"

const makeWaypoint = (overrides: Partial<Waypoint> = {}): Waypoint => ({
  streamId: "stream-1",
  lat: 47.123,
  lng: -122.456,
  altitude: 100,
  timestamp: 1704067200000,
  cumulativeVert: null,
  mileMarker: null,
  pointIndex: null,
  ...overrides,
})

describe("waypointStorage", () => {
  beforeEach(() => {
    getStorage().clearAll()
  })

  // ─── appendWaypoint / getWaypointCount ─────────────────────────────────────

  describe("appendWaypoint", () => {
    it("stores a waypoint and increments the count", () => {
      expect(getWaypointCount()).toBe(0)
      appendWaypoint(makeWaypoint())
      expect(getWaypointCount()).toBe(1)
    })

    it("does not duplicate a waypoint with the same streamId+timestamp", () => {
      const w = makeWaypoint()
      appendWaypoint(w)
      appendWaypoint(w) // same key
      expect(getWaypointCount()).toBe(1)
    })

    it("stores multiple distinct waypoints", () => {
      appendWaypoint(makeWaypoint({ timestamp: 1704067200000 }))
      appendWaypoint(makeWaypoint({ timestamp: 1704067500000 }))
      expect(getWaypointCount()).toBe(2)
    })
  })

  // ─── getWaypoint ──────────────────────────────────────────────────────────

  describe("getWaypoint", () => {
    it("retrieves a waypoint by composite id", () => {
      const w = makeWaypoint()
      appendWaypoint(w)
      const id = `${w.streamId}_${w.timestamp}`
      expect(getWaypoint(id)).toEqual(w)
    })

    it("returns null for an unknown id", () => {
      expect(getWaypoint("unknown_id")).toBeNull()
    })
  })

  // ─── getAllWaypoints ───────────────────────────────────────────────────────

  describe("getAllWaypoints", () => {
    it("returns waypoints in insertion order", () => {
      const w1 = makeWaypoint({ timestamp: 1704067200000 })
      const w2 = makeWaypoint({ timestamp: 1704067500000 })
      appendWaypoint(w1)
      appendWaypoint(w2)
      expect(getAllWaypoints()).toEqual([w1, w2])
    })

    it("returns an empty array when no waypoints are stored", () => {
      expect(getAllWaypoints()).toEqual([])
    })
  })

  // ─── clearWaypoints ───────────────────────────────────────────────────────

  describe("clearWaypoints", () => {
    it("removes all waypoints and resets the count to zero", () => {
      appendWaypoint(makeWaypoint({ timestamp: 1704067200000 }))
      appendWaypoint(makeWaypoint({ timestamp: 1704067500000 }))
      clearWaypoints()
      expect(getWaypointCount()).toBe(0)
      expect(getAllWaypoints()).toEqual([])
    })
  })

  describe("removeWaypointsByIds", () => {
    it("removes only the provided waypoint IDs", () => {
      const w1 = makeWaypoint({ timestamp: 1704067200000 })
      const w2 = makeWaypoint({ timestamp: 1704067500000 })
      const w3 = makeWaypoint({ timestamp: 1704067800000 })

      appendWaypoint(w1)
      appendWaypoint(w2)
      appendWaypoint(w3)

      removeWaypointsByIds([`${w2.streamId}_${w2.timestamp}`])

      expect(getAllWaypoints()).toEqual([w1, w3])
      expect(getWaypointCount()).toBe(2)
    })
  })

  // ─── stream id ────────────────────────────────────────────────────────────

  describe("stream id helpers", () => {
    it("stores and retrieves the active stream id", () => {
      setActiveStreamId("my-stream-uuid")
      expect(getActiveStreamId()).toBe("my-stream-uuid")
    })

    it("returns null when no stream id is set", () => {
      expect(getActiveStreamId()).toBeNull()
    })

    it("clears the active stream id", () => {
      setActiveStreamId("my-stream-uuid")
      clearActiveStreamId()
      expect(getActiveStreamId()).toBeNull()
    })
  })

  // ─── tracking config ──────────────────────────────────────────────────────

  describe("tracking config", () => {
    it("returns the default config when nothing is stored", () => {
      expect(loadTrackingConfig()).toEqual(DEFAULT_TRACKING_CONFIG)
    })

    it("persists and retrieves a custom config", () => {
      saveTrackingConfig({ intervalMinutes: 10 })
      expect(loadTrackingConfig()).toEqual({
        ...DEFAULT_TRACKING_CONFIG,
        intervalMinutes: 10,
      })
    })
  })
})
