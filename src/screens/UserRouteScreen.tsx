import { FC, useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  ActivityIndicator,
  Dimensions,
  Image,
  ImageStyle,
  PanResponder,
  Pressable,
  StyleSheet,
  TextStyle,
  View,
  ViewStyle,
} from "react-native"
import * as Location from "expo-location"
import { useRouter } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import type { Route, User } from "@/generated/schema"
import { Button } from "@/components/Button"
import { Text } from "@/components/Text"
import {
  MapLibreMap,
  type MapCoordinate,
  type MapLibreMapRef,
} from "@/components/Map/MapLibreMap"
import { fetchUserRouteById } from "@/services/api/graphql"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

// ── Types ──────────────────────────────────────────────────────────────────────
interface UserRouteScreenProps {
  username: string
  routeId: string
}

type ElevCoord = {
  idx: number
  lng: number
  lat: number
  elevation: number
  distance: number
  cumulativeVert: number
}

const CHART_BAR_COUNT = 260
const CHART_SMOOTHING_RADIUS = 4
const SCREEN_HEIGHT = Dimensions.get("window").height
const PROFILE_PANEL_HEIGHT = Math.round(SCREEN_HEIGHT * 0.56)
const MAP_SECTION_HEIGHT = SCREEN_HEIGHT - PROFILE_PANEL_HEIGHT
const CHART_HEIGHT = Math.max(180, PROFILE_PANEL_HEIGHT - 118)
const CHART_MIN_BAR_HEIGHT = 6
const CHART_MAX_FILL_RATIO = 0.92

// ── GeoJSON parsing ────────────────────────────────────────────────────────────
function parseGeoJsonCoords(json: unknown): ElevCoord[] {
  const fc = json as {
    type: string
    features: Array<{ geometry: { type: string; coordinates: number[][] } }>
  }
  if (!fc || fc.type !== "FeatureCollection" || !Array.isArray(fc.features)) {
    throw new Error("Invalid GeoJSON")
  }
  for (const feature of fc.features) {
    if (feature?.geometry?.type === "LineString") {
      return feature.geometry.coordinates.map((c, i) => ({
        idx: i,
        lng: c[0] ?? 0,
        lat: c[1] ?? 0,
        elevation: c[2] ?? 0,
        distance: c[3] ?? 0,
        cumulativeVert: c[4] ?? 0,
      }))
    }
  }
  throw new Error("No LineString found in GeoJSON")
}

// ── Map helpers ────────────────────────────────────────────────────────────────
function getCenterAndZoom(coords: ElevCoord[]): { center: MapCoordinate; zoom: number } | null {
  if (coords.length === 0) return null
  const lats = coords.map((c) => c.lat)
  const lngs = coords.map((c) => c.lng)
  const center: MapCoordinate = {
    latitude: (Math.min(...lats) + Math.max(...lats)) / 2,
    longitude: (Math.min(...lngs) + Math.max(...lngs)) / 2,
  }
  const span = Math.max(
    Math.max(...lats) - Math.min(...lats),
    Math.max(...lngs) - Math.min(...lngs),
  )
  let zoom = 3.5
  if (span <= 0.02) zoom = 13
  else if (span <= 0.08) zoom = 11
  else if (span <= 0.3) zoom = 9.5
  else if (span <= 1) zoom = 7.5
  else if (span <= 3) zoom = 6
  else if (span <= 10) zoom = 5
  return { center, zoom }
}

// ── Format helpers ─────────────────────────────────────────────────────────────
function formatDate(value: string | null | undefined) {
  if (!value) return "Unknown"
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value))
}

function formatDistance(miles: number, uom?: string | null) {
  return uom === "METRIC" ? `${(miles * 1.60934).toFixed(2)} km` : `${miles.toFixed(2)} mi`
}

function formatGain(feet: number, uom?: string | null) {
  return uom === "METRIC" ? `${(feet * 0.3048).toFixed(0)} m` : `${feet.toFixed(0)} ft`
}

function formatElevationFeet(meters: number) {
  return (meters * 3.28084).toFixed(0)
}

// ── ElevationChart ─────────────────────────────────────────────────────────────
type ElevationChartProps = {
  coords: ElevCoord[]
  uom?: string | null
  onScrub: (coord: ElevCoord | null) => void
}

function ElevationChart({ coords, uom, onScrub }: ElevationChartProps) {
  const containerRef = useRef<View>(null)
  const screenXRef = useRef(0)
  const [containerWidth, setContainerWidth] = useState(0)
  const [containerHeight, setContainerHeight] = useState(CHART_HEIGHT)
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  const bars = useMemo<ElevCoord[]>(() => {
    if (coords.length === 0) return []
    if (coords.length <= CHART_BAR_COUNT) return coords
    const step = (coords.length - 1) / (CHART_BAR_COUNT - 1)
    return Array.from(
      { length: CHART_BAR_COUNT },
      (_, i) => coords[Math.round(i * step)] as ElevCoord,
    )
  }, [coords])

  const { minElev, elevRange } = useMemo(() => {
    if (bars.length === 0) return { minElev: 0, elevRange: 1 }
    const elevs = bars.map((_, i) => {
      const start = Math.max(0, i - CHART_SMOOTHING_RADIUS)
      const end = Math.min(bars.length - 1, i + CHART_SMOOTHING_RADIUS)
      let total = 0
      for (let j = start; j <= end; j += 1) total += bars[j]!.elevation
      return total / (end - start + 1)
    })
    const min = Math.min(...elevs)
    const max = Math.max(...elevs)
    return { minElev: min, elevRange: max - min || 1 }
  }, [bars])

  const smoothedElevations = useMemo(() => {
    if (bars.length === 0) return [] as number[]
    return bars.map((_, i) => {
      const start = Math.max(0, i - CHART_SMOOTHING_RADIUS)
      const end = Math.min(bars.length - 1, i + CHART_SMOOTHING_RADIUS)
      let total = 0
      for (let j = start; j <= end; j += 1) total += bars[j]!.elevation
      return total / (end - start + 1)
    })
  }, [bars])

  const barWidth = containerWidth > 0 && bars.length > 0 ? containerWidth / bars.length : 2

  const getIndexFromScreenX = useCallback(
    (sx: number) => {
      const relX = sx - screenXRef.current
      const t = Math.max(0, Math.min(1, relX / (containerWidth || 1)))
      return Math.round(t * (bars.length - 1))
    },
    [bars.length, containerWidth],
  )

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (_, gs) => {
          const idx = getIndexFromScreenX(gs.x0)
          setActiveIndex(idx)
          onScrub(bars[idx] ?? null)
        },
        onPanResponderMove: (_, gs) => {
          const idx = getIndexFromScreenX(gs.moveX)
          setActiveIndex(idx)
          onScrub(bars[idx] ?? null)
        },
        onPanResponderRelease: () => {
          setActiveIndex(null)
          onScrub(null)
        },
        onPanResponderTerminate: () => {
          setActiveIndex(null)
          onScrub(null)
        },
      }),
    [bars, getIndexFromScreenX, onScrub],
  )

  const activeBar = activeIndex != null ? (bars[activeIndex] ?? null) : null

  const activeLineX =
    activeIndex != null && bars.length > 1 && containerWidth > 0
      ? (activeIndex / (bars.length - 1)) * containerWidth
      : null

  const getBarHeight = useCallback(
    (elevation: number) => {
      const normalized = (elevation - minElev) / elevRange
      const maxBarHeight = Math.max(
        CHART_MIN_BAR_HEIGHT,
        containerHeight * CHART_MAX_FILL_RATIO,
      )
      return CHART_MIN_BAR_HEIGHT + normalized * (maxBarHeight - CHART_MIN_BAR_HEIGHT)
    },
    [containerHeight, elevRange, minElev],
  )

  const activeDotY =
    activeBar != null && activeIndex != null
      ? containerHeight - getBarHeight(smoothedElevations[activeIndex] ?? activeBar.elevation)
      : null

  const distUnit = uom === "METRIC" ? "km" : "mi"
  const elevUnit = "ft"
  const firstDist = (bars[0]?.distance ?? 0).toFixed(1)
  const midDist = (bars[Math.floor(bars.length / 2)]?.distance ?? 0).toFixed(1)
  const lastDist = (bars[bars.length - 1]?.distance ?? 0).toFixed(1)

  return (
    <View style={$chartBlock}>
      <View
        ref={containerRef}
        style={$chartContainer}
        onLayout={() => {
          containerRef.current?.measureInWindow((x, _y, width, height) => {
            screenXRef.current = x
            setContainerWidth(width)
            if (height > 0) setContainerHeight(height)
          })
        }}
        {...panResponder.panHandlers}
      >
        {/* Static bars – memoized, never re-render on scrub */}
        <View style={$barsRow} pointerEvents="none">
          {bars.map((bar, i) => (
            <View
              key={i}
              style={[
                $bar,
                {
                  width: barWidth,
                  height: getBarHeight(smoothedElevations[i] ?? bar.elevation),
                },
              ]}
            />
          ))}
        </View>

        {/* Vertical scrub line */}
        {activeLineX != null && (
          <View
            style={[StyleSheet.absoluteFillObject, $scrubLine, { left: activeLineX }]}
            pointerEvents="none"
          />
        )}

        {/* Dot at the active elevation */}
        {activeLineX != null && activeDotY != null && (
          <View
            style={[$scrubDot, { left: activeLineX - 5, top: activeDotY - 5 }]}
            pointerEvents="none"
          />
        )}
      </View>

      {/* Distance labels + active tooltip */}
      <View style={$distanceRow}>
        <Text text={`${firstDist} ${distUnit}`} size="xxs" style={$dimText} />
        <Text
          text={
            activeBar
              ? `${activeBar.distance.toFixed(1)} ${distUnit} · ${formatElevationFeet(activeBar.elevation)} ${elevUnit}`
              : `${midDist} ${distUnit}`
          }
          size="xxs"
          style={activeBar ? $activeLabel : $dimText}
        />
        <Text text={`${lastDist} ${distUnit}`} size="xxs" style={$dimText} />
      </View>
    </View>
  )
}

// ── Main screen ────────────────────────────────────────────────────────────────
export const UserRouteScreen: FC<UserRouteScreenProps> = function UserRouteScreen({
  username,
  routeId,
}) {
  const { themed } = useAppTheme()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const mapRef = useRef<MapLibreMapRef>(null)

  // Route metadata
  const [user, setUser] = useState<User | null>(null)
  const [route, setRoute] = useState<Route | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // GeoJSON elevation data
  const [elevCoords, setElevCoords] = useState<ElevCoord[]>([])
  const [geoLoading, setGeoLoading] = useState(false)
  const [geoError, setGeoError] = useState<string | null>(null)

  // Elevation scrub hover
  const [scrubCoord, setScrubCoord] = useState<ElevCoord | null>(null)

  // Location permission
  const [locationGranted, setLocationGranted] = useState(false)
  const [currentLocation, setCurrentLocation] = useState<MapCoordinate | null>(null)

  // Fetch route metadata
  useEffect(() => {
    let isMounted = true
    void (async () => {
      try {
        const result = await fetchUserRouteById(username, routeId)
        if (!isMounted) return
        setUser(result?.user ?? null)
        setRoute(result?.route ?? null)
        setError(null)
      } catch (loadError) {
        if (!isMounted) return
        setError(loadError instanceof Error ? loadError.message : "Failed to load route")
      } finally {
        if (isMounted) setLoading(false)
      }
    })()
    return () => {
      isMounted = false
    }
  }, [routeId, username])

  // Fetch GeoJSON from storagePath once route metadata is loaded
  useEffect(() => {
    if (!route?.storagePath) {
      setElevCoords([])
      setGeoError(null)
      return
    }
    let active = true
    setGeoLoading(true)
    setGeoError(null)
    void (async () => {
      try {
        const response = await fetch(route.storagePath as string)
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const json: unknown = await response.json()
        if (!active) return
        setElevCoords(parseGeoJsonCoords(json))
      } catch (err) {
        if (!active) return
        setElevCoords([])
        setGeoError(err instanceof Error ? err.message : "Failed to load route map data")
        if (__DEV__) console.warn("Failed to load route GeoJSON:", err)
      } finally {
        if (active) setGeoLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [route?.storagePath])

  // Fly map to route bounds after GeoJSON loads
  useEffect(() => {
    if (elevCoords.length === 0) return
    const cz = getCenterAndZoom(elevCoords)
    if (cz) {
      mapRef.current?.flyTo(cz.center.longitude, cz.center.latitude, 400, cz.zoom)
    }
  }, [elevCoords])

  // Request foreground location permission on mount
  useEffect(() => {
    let active = true
    let locationSubscription: Location.LocationSubscription | null = null
    void (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (!active) return

      const granted = status === Location.PermissionStatus.GRANTED
      setLocationGranted(granted)

      if (!granted) {
        setCurrentLocation(null)
        return
      }

      const initialPosition = await Location.getCurrentPositionAsync({})
      if (active) {
        setCurrentLocation({
          latitude: initialPosition.coords.latitude,
          longitude: initialPosition.coords.longitude,
        })
      }

      locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 5000,
          distanceInterval: 10,
        },
        (position) => {
          if (!active) return
          setCurrentLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          })
        },
      )
    })()
    return () => {
      active = false
      locationSubscription?.remove()
    }
  }, [])

  const trackCoordinates = useMemo<MapCoordinate[]>(
    () => elevCoords.map((c) => ({ latitude: c.lat, longitude: c.lng })),
    [elevCoords],
  )

  // When scrubbing the elevation chart, show a marker on the map
  const hoverMarker = useMemo<MapCoordinate | null>(
    () => (scrubCoord ? { latitude: scrubCoord.lat, longitude: scrubCoord.lng } : null),
    [scrubCoord],
  )

  const activeMapMarker = useMemo<MapCoordinate | null>(
    () => hoverMarker ?? currentLocation,
    [currentLocation, hoverMarker],
  )

  const handleScrub = useCallback((coord: ElevCoord | null) => {
    setScrubCoord(coord)
  }, [])

  return (
    <View style={screenStyles.root}>
      <View style={[screenStyles.mapSection, { height: MAP_SECTION_HEIGHT }]}>
        <MapLibreMap
          ref={mapRef}
          trackCoordinates={trackCoordinates}
          showUserLocation={locationGranted}
          currentLocationMarker={activeMapMarker}
          initialZoomLevel={3}
        />

        <View style={[screenStyles.backButtonOverlay, { top: insets.top + 12 }]} pointerEvents="box-none">
          <Button
            text="← Back"
            onPress={() => router.replace(`/(app)/user/${username}`)}
            style={screenStyles.backButton}
            textStyle={screenStyles.backButtonText}
          />
        </View>

        {geoLoading && (
          <View style={[screenStyles.geoLoadingOverlay, { top: insets.top + 12 }]}>
            <ActivityIndicator color="#ffffff" />
          </View>
        )}

      </View>

      {loading ? (
        <View style={[screenStyles.centerStateOverlay, { paddingBottom: PROFILE_PANEL_HEIGHT / 2 }]}>
          <View style={themed($stateCard)}>
            <ActivityIndicator />
          </View>
        </View>
      ) : error ? (
        <View style={[screenStyles.centerStateOverlay, { paddingBottom: PROFILE_PANEL_HEIGHT / 2 }]}>
          <View style={themed($stateCard)}>
            <Text text={error} style={themed($errorText)} />
          </View>
        </View>
      ) : !user || !route ? (
        <View style={[screenStyles.centerStateOverlay, { paddingBottom: PROFILE_PANEL_HEIGHT / 2 }]}>
          <View style={themed($stateCard)}>
            <Text text="Route not found" preset="subheading" />
          </View>
        </View>
      ) : (
        <View
          style={[
            screenStyles.profilePanel,
            { height: PROFILE_PANEL_HEIGHT, paddingBottom: insets.bottom + 18 },
          ]}
        >
          <View style={themed($elevSection)}>
            <View style={themed($userHeaderRow)}>
              {user.profilePicture ? (
                <Image source={{ uri: user.profilePicture }} style={themed($avatar)} />
              ) : (
                <View style={themed($avatarFallback)}>
                  <Text text={username.charAt(0).toUpperCase()} size="xs" weight="medium" />
                </View>
              )}
              <View style={themed($userHeaderMetaRow)}>
                <Pressable
                  onPress={() => router.push(`/(app)/user/${username}`)}
                  accessibilityRole="link"
                  accessibilityLabel={`Open @${username} profile`}
                >
                  <Text
                    text={`@${username}`}
                    size="sm"
                    weight="medium"
                    style={themed($userLinkText)}
                    numberOfLines={1}
                  />
                </Pressable>
                <Text
                  text={`  -  ${formatDistance(route.distanceInMiles, route.uom)}  -  +${formatGain(route.gainInFeet, route.uom)}`}
                  size="sm"
                  weight="medium"
                  style={themed($userHeaderText)}
                  numberOfLines={1}
                />
              </View>
            </View>

            <View style={themed($elevHeader)}>
              <View style={themed($elevHeaderTextWrap)}>
                <Text text={route.name} size="sm" style={themed($elevMeta)} numberOfLines={1} />
              </View>
            </View>

            {geoError ? (
              <View style={themed($geoErrorCard)}>
                <Text text="Route map data failed to load" size="xs" weight="medium" />
                <Text text={geoError} size="xxs" style={themed($subtleText)} />
                <Text text={route.storagePath} size="xxs" style={themed($subtleText)} />
              </View>
            ) : elevCoords.length > 0 ? (
              <ElevationChart coords={elevCoords} uom={route.uom} onScrub={handleScrub} />
            ) : (
              <View style={themed($stateBlock)}>
                <Text text="Elevation data will appear here once the route geometry loads." size="xs" style={themed($subtleText)} />
              </View>
            )}
          </View>
        </View>
      )}
    </View>
  )
}

// ── Static screen styles ───────────────────────────────────────────────────────
const screenStyles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#0b1120",
  },
  mapSection: {
    overflow: "hidden",
  },
  backButtonOverlay: {
    position: "absolute",
    left: 12,
    zIndex: 30,
  },
  backButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 0,
    backgroundColor: "rgba(15,23,42,0.78)",
  },
  backButtonText: {
    color: "#ffffff",
  },
  geoLoadingOverlay: {
    position: "absolute",
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(15,23,42,0.62)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 30,
  },
  centerStateOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    zIndex: 20,
  },
  profilePanel: {
    flex: 1,
    paddingHorizontal: 10,
    paddingTop: 10,
  },
})

// ── Elevation chart styles ─────────────────────────────────────────────────────
const $chartBlock: ViewStyle = {
  flex: 1,
}

const $chartContainer: ViewStyle = {
  flex: 1,
  width: "100%",
  overflow: "hidden",
  borderRadius: 16,
  backgroundColor: "#171a29",
  position: "relative",
}

const $barsRow: ViewStyle = {
  position: "absolute",
  bottom: 0,
  left: 0,
  right: 0,
  top: 0,
  flexDirection: "row",
  alignItems: "flex-end",
}

const $bar: ViewStyle = {
  backgroundColor: "rgba(58,138,255,0.9)",
  borderTopLeftRadius: 2,
  borderTopRightRadius: 2,
}

const $scrubLine: ViewStyle = {
  width: 1.5,
  backgroundColor: "rgba(255,255,255,0.35)",
}

const $scrubDot: ViewStyle = {
  position: "absolute",
  width: 10,
  height: 10,
  borderRadius: 5,
  backgroundColor: "#3a8aff",
  borderWidth: 2,
  borderColor: "#c7dbff",
}

const $distanceRow: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  marginTop: 12,
}

const $dimText: TextStyle = {
  color: "rgba(160,172,194,0.95)",
}

const $activeLabel: TextStyle = {
  color: "#8eb7ff",
  fontWeight: "600",
}

// ── Themed styles ──────────────────────────────────────────────────────────────
const $stateBlock: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  alignItems: "center",
  justifyContent: "center",
  paddingVertical: spacing.xl,
  gap: spacing.sm,
})

const $stateCard: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  minWidth: "82%",
  alignItems: "center",
  justifyContent: "center",
  padding: spacing.lg,
  borderRadius: 20,
  borderWidth: 1,
  borderColor: colors.palette.neutral300,
  backgroundColor: colors.background,
})

const $errorText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.error,
})

const $headerRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.sm,
})

const $badgeCopy: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flex: 1,
  gap: spacing.xxxs,
})

const $avatar: ThemedStyle<ImageStyle> = () => ({
  width: 28,
  height: 28,
  borderRadius: 14,
})

const $avatarFallback: ThemedStyle<ViewStyle> = ({ colors }) => ({
  width: 28,
  height: 28,
  borderRadius: 14,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: colors.palette.neutral300,
})

const $subtleText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
})

const $elevTitle: ThemedStyle<TextStyle> = () => ({
  color: "#eef2ff",
})

const $elevMeta: ThemedStyle<TextStyle> = () => ({
  color: "#a7b0c8",
})

const $userHeaderText: ThemedStyle<TextStyle> = () => ({
  color: "#d8e3ff",
})

const $userLinkText: ThemedStyle<TextStyle> = () => ({
  color: "#9ec4ff",
})

const $userHeaderMetaRow: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
  flexDirection: "row",
  alignItems: "center",
})

const $userHeaderRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.xs,
  minHeight: 34,
})

const $elevSection: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flex: 1,
  gap: spacing.md,
  paddingHorizontal: spacing.md,
  paddingTop: spacing.md,
  paddingBottom: spacing.sm,
  borderTopLeftRadius: 24,
  borderTopRightRadius: 24,
  borderWidth: 1,
  borderColor: "#252a3f",
  backgroundColor: "#101423",
})

const $elevHeader: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: spacing.xs,
})

const $elevHeaderTextWrap: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flex: 1,
  gap: spacing.xxs,
})

const $profileCopy: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flex: 1,
  gap: spacing.xxxs,
})

const $statsRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  flexWrap: "wrap",
  gap: spacing.sm,
})

const $statChip: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  minWidth: "47%",
  gap: spacing.xxxs,
  paddingVertical: spacing.sm,
  paddingHorizontal: spacing.sm,
  borderRadius: 14,
  backgroundColor: colors.palette.neutral100,
})

const $geoErrorCard: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  gap: spacing.xs,
  padding: spacing.md,
  borderRadius: 16,
  borderWidth: 1,
  borderColor: colors.error,
  backgroundColor: colors.background,
})
