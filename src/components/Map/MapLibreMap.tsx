import { forwardRef, useImperativeHandle, useMemo, useRef } from "react"
import { Image, Pressable, StyleSheet, View } from "react-native"
import MapLibreGL, { CameraRef, MapViewRef } from "@maplibre/maplibre-react-native"
import type { Feature, FeatureCollection, LineString, Point } from "geojson"

// OpenStreetMap raster tile style — no API key required.
// NOTE: The public OSM tile server (tile.openstreetmap.org) has a usage policy and is
// intended for low-traffic development use only. For production, replace TILE_STYLE_URL
// with a hosted style from a provider such as MapTiler (free tier), Stadia Maps, or a
// self-hosted tile server. See https://wiki.openstreetmap.org/wiki/Tile_usage_policy
export const TILE_STYLE_URL = "https://tiles.openfreemap.org/styles/liberty"

// No Mapbox/MapTiler access token required when using MapLibre with OSM/OpenFreeMap tiles.
MapLibreGL.setAccessToken(null)

/** Public interface exposed via the component ref. */
export interface MapLibreMapRef {
  /** Animate the map camera to the given coordinates. */
  flyTo: (
    longitude: number,
    latitude: number,
    animationDurationMs?: number,
    zoomLevel?: number,
  ) => void
  zoomIn: () => Promise<void>
  zoomOut: () => Promise<void>
}

interface MapLibreMapProps {
  /** When true, renders the native user-location indicator (requires location permission). */
  showUserLocation?: boolean
  markers?: SocialMapMarker[]
  onMarkerPress?: (marker: SocialMapMarker) => void
  trackCoordinates?: MapCoordinate[]
  waypointMarkers?: StreamWaypointMarker[]
  postMarkers?: StreamPostMarker[]
  onPostMarkerPress?: (marker: StreamPostMarker) => void
  currentLocationMarker?: MapCoordinate | null
  initialCenter?: MapCoordinate
  initialZoomLevel?: number
}

export interface MapCoordinate {
  latitude: number
  longitude: number
}

export interface SocialMapMarker {
  id: string
  latitude: number
  longitude: number
  username: string
  title: string
  profilePicture?: string | null
  isLive: boolean
}

export interface StreamWaypointMarker extends MapCoordinate {
  id: string
}

export interface StreamPostMarker extends MapCoordinate {
  id: string
  title: string
  createdAt?: string
  locationLabel?: string
  photoUrl?: string
}

/**
 * A full-screen MapLibre map backed by OpenFreeMap vector tiles.
 * Exposes `flyTo` via a forwarded ref for programmatic camera control.
 */
export const MapLibreMap = forwardRef<MapLibreMapRef, MapLibreMapProps>(function MapLibreMap(
  {
    showUserLocation = false,
    markers = [],
    onMarkerPress,
    trackCoordinates = [],
    waypointMarkers = [],
    postMarkers = [],
    onPostMarkerPress,
    currentLocationMarker = null,
    initialCenter,
    initialZoomLevel = 2,
  },
  ref,
) {
  const cameraRef = useRef<CameraRef>(null)
  const mapViewRef = useRef<MapViewRef>(null)

  const trackShape = useMemo<FeatureCollection<LineString> | null>(() => {
    if (trackCoordinates.length < 2) return null

    return {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: trackCoordinates.map((coordinate) => [coordinate.longitude, coordinate.latitude]),
          },
        },
      ],
    }
  }, [trackCoordinates])

  const waypointShape = useMemo<FeatureCollection<Point> | null>(() => {
    if (waypointMarkers.length === 0) return null

    return {
      type: "FeatureCollection",
      features: waypointMarkers.map<Feature<Point>>((marker) => ({
        type: "Feature",
        properties: { id: marker.id },
        geometry: {
          type: "Point",
          coordinates: [marker.longitude, marker.latitude],
        },
      })),
    }
  }, [waypointMarkers])

  useImperativeHandle(
    ref,
    () => ({
      flyTo: (longitude: number, latitude: number, animationDurationMs = 500, zoomLevel = 14) => {
        cameraRef.current?.setCamera({
          centerCoordinate: [longitude, latitude],
          zoomLevel,
          animationDuration: animationDurationMs,
        })
      },
      zoomIn: async () => {
        const currentZoom = await mapViewRef.current?.getZoom()
        if (typeof currentZoom !== "number") return

        cameraRef.current?.setCamera({
          zoomLevel: Math.min(18, currentZoom + 1),
          animationDuration: 200,
        })
      },
      zoomOut: async () => {
        const currentZoom = await mapViewRef.current?.getZoom()
        if (typeof currentZoom !== "number") return

        cameraRef.current?.setCamera({
          zoomLevel: Math.max(1, currentZoom - 1),
          animationDuration: 200,
        })
      },
    }),
    [],
  )

  return (
    <MapLibreGL.MapView
      style={styles.map}
      ref={mapViewRef}
      mapStyle={TILE_STYLE_URL}
      logoEnabled={false}
      zoomEnabled={true}
      scrollEnabled={true}
      rotateEnabled={true}
      pitchEnabled={true}
    >
      <MapLibreGL.Camera
        ref={cameraRef}
        zoomLevel={initialZoomLevel}
        centerCoordinate={
          initialCenter ? [initialCenter.longitude, initialCenter.latitude] : undefined
        }
        minZoomLevel={1}
        maxZoomLevel={18}
        animationDuration={0}
      />
      {/* animated={false} avoids AnimatedPoint creation which crashes on RN 0.83
          due to AnimatedNode._listeners changing from plain object to Map. */}
      {showUserLocation && <MapLibreGL.UserLocation visible animated={false} />}

      {trackShape ? (
        <MapLibreGL.ShapeSource id="stream-track" shape={trackShape}>
          <MapLibreGL.LineLayer id="stream-track-line" style={styles.trackLine} />
        </MapLibreGL.ShapeSource>
      ) : null}

      {waypointShape ? (
        <MapLibreGL.ShapeSource id="stream-waypoints" shape={waypointShape}>
          <MapLibreGL.CircleLayer id="stream-waypoint-circles" style={styles.waypointCircle} />
        </MapLibreGL.ShapeSource>
      ) : null}

      {currentLocationMarker ? (
        <MapLibreGL.MarkerView
          key="stream-current-location"
          coordinate={[currentLocationMarker.longitude, currentLocationMarker.latitude]}
          allowOverlap={true}
          anchor={{ x: 0.5, y: 0.5 }}
        >
          <View style={styles.currentLocationMarker} />
        </MapLibreGL.MarkerView>
      ) : null}

      {postMarkers.map((marker) => (
        <MapLibreGL.MarkerView
          key={marker.id}
          coordinate={[marker.longitude, marker.latitude]}
          allowOverlap={true}
          anchor={{ x: 0.5, y: 0.5 }}
        >
          <Pressable
            onPress={() => onPostMarkerPress?.(marker)}
            accessibilityRole="button"
            accessibilityLabel={`Open post: ${marker.title}`}
            style={styles.postMarkerPressable}
          >
            {marker.photoUrl ? (
              <Image source={{ uri: marker.photoUrl }} style={styles.postPhotoMarker} />
            ) : (
              <View style={styles.postMarker} />
            )}
          </Pressable>
        </MapLibreGL.MarkerView>
      ))}

      {markers.map((marker) => (
        <MapLibreGL.MarkerView
          key={marker.id}
          coordinate={[marker.longitude, marker.latitude]}
          allowOverlap={true}
          anchor={{ x: 0.5, y: 0.5 }}
        >
          <Pressable
            onPress={() => onMarkerPress?.(marker)}
            accessibilityRole="button"
            accessibilityLabel={`Open ${marker.username}'s tracker`}
            style={styles.markerPressable}
          >
            {marker.profilePicture ? (
              <Image source={{ uri: marker.profilePicture }} style={styles.markerAvatar} />
            ) : (
              <View style={styles.markerFallback} />
            )}
            {marker.isLive ? <View style={styles.liveDot} /> : null}
          </Pressable>
        </MapLibreGL.MarkerView>
      ))}
    </MapLibreGL.MapView>
  )
})

const styles = StyleSheet.create({
  map: {
    flex: 1,
  },
  trackLine: {
    lineColor: "#0f172a",
    lineWidth: 4,
    lineOpacity: 0.9,
    lineCap: "round",
    lineJoin: "round",
  },
  waypointCircle: {
    circleRadius: 3,
    circleColor: "#f8fafc",
    circleStrokeWidth: 1.5,
    circleStrokeColor: "#0f172a",
    circleOpacity: 0.95,
  },
  currentLocationMarker: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#2563eb",
    borderWidth: 3,
    borderColor: "#ffffff",
  },
  postMarker: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#f97316",
    borderWidth: 2,
    borderColor: "#ffffff",
  },
  postMarkerPressable: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  postPhotoMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: "#ffffff",
    backgroundColor: "#f1f5f9",
  },
  markerPressable: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: "center",
    alignItems: "center",
  },
  markerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: "#ffffff",
    backgroundColor: "#f4f4f5",
  },
  markerFallback: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: "#ffffff",
    backgroundColor: "#2563eb",
  },
  liveDot: {
    position: "absolute",
    top: 2,
    right: 2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#ef4444",
    borderWidth: 1.5,
    borderColor: "#ffffff",
  },
})
