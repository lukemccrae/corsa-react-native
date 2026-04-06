import { storage } from "@/utils/storage"
import {
  appendWaypoint,
  clearWaypoints,
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
import { DEFAULT_INTERVAL_MINUTES } from "./waypointTypes"

const makeWaypoint = (overrides: Partial<Waypoint> = {}): Waypoint => ({
  streamId: "stream-1",
  lat: 47.123,
  lng: -122.456,
  altitude: 100,
  timestamp: "2024-01-01T00:00:00.000Z",
  ...overrides,
})

describe("waypointStorage", () => {
  beforeEach(() => {
    storage.clearAll()
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
      appendWaypoint(makeWaypoint({ timestamp: "2024-01-01T00:00:00.000Z" }))
      appendWaypoint(makeWaypoint({ timestamp: "2024-01-01T00:05:00.000Z" }))
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
      const w1 = makeWaypoint({ timestamp: "2024-01-01T00:00:00.000Z" })
      const w2 = makeWaypoint({ timestamp: "2024-01-01T00:05:00.000Z" })
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
      appendWaypoint(makeWaypoint({ timestamp: "2024-01-01T00:00:00.000Z" }))
      appendWaypoint(makeWaypoint({ timestamp: "2024-01-01T00:05:00.000Z" }))
      clearWaypoints()
      expect(getWaypointCount()).toBe(0)
      expect(getAllWaypoints()).toEqual([])
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
      expect(loadTrackingConfig()).toEqual({ intervalMinutes: DEFAULT_INTERVAL_MINUTES })
    })

    it("persists and retrieves a custom config", () => {
      saveTrackingConfig({ intervalMinutes: 10 })
      expect(loadTrackingConfig()).toEqual({ intervalMinutes: 10 })
    })
  })
})
