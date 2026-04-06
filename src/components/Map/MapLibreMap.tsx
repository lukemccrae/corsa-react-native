import { forwardRef, useImperativeHandle, useRef } from "react"
import { Image, Pressable, StyleSheet, View } from "react-native"
import MapLibreGL, { CameraRef, MapViewRef } from "@maplibre/maplibre-react-native"

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

/**
 * A full-screen MapLibre map backed by OpenFreeMap vector tiles.
 * Exposes `flyTo` via a forwarded ref for programmatic camera control.
 */
export const MapLibreMap = forwardRef<MapLibreMapRef, MapLibreMapProps>(function MapLibreMap(
  { showUserLocation = false, markers = [], onMarkerPress },
  ref,
) {
  const cameraRef = useRef<CameraRef>(null)
  const mapViewRef = useRef<MapViewRef>(null)

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
        zoomLevel={2}
        minZoomLevel={1}
        maxZoomLevel={18}
        animationDuration={0}
      />
      {/* animated={false} avoids AnimatedPoint creation which crashes on RN 0.83
          due to AnimatedNode._listeners changing from plain object to Map. */}
      {showUserLocation && <MapLibreGL.UserLocation visible animated={false} />}

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
