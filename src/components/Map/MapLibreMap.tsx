import { forwardRef, useImperativeHandle, useRef } from "react"
import { StyleSheet } from "react-native"
import MapLibreGL, { CameraRef } from "@maplibre/maplibre-react-native"

// OpenStreetMap raster tile style — no API key required.
// NOTE: The public OSM tile server (tile.openstreetmap.org) has a usage policy and is
// intended for low-traffic development use only. For production, replace TILE_STYLE_URL
// with a hosted style from a provider such as MapTiler (free tier), Stadia Maps, or a
// self-hosted tile server. See https://wiki.openstreetmap.org/wiki/Tile_usage_policy
export const TILE_STYLE_URL = "https://tiles.openfreemap.org/styles/liberty"

// No Mapbox/MapTiler access token required when using MapLibre with OSM/OpenFreeMap tiles.
MapLibreGL.setAccessToken(null)

/** Default map zoom level — roughly equivalent to latitudeDelta: 0.01. */
const DEFAULT_ZOOM_LEVEL = 14

/** Public interface exposed via the component ref. */
export interface MapLibreMapRef {
  /** Animate the map camera to the given coordinates. */
  flyTo: (longitude: number, latitude: number, animationDurationMs?: number) => void
}

interface MapLibreMapProps {
  /** When true, renders the native user-location indicator (requires location permission). */
  showUserLocation?: boolean
}

/**
 * A full-screen MapLibre map backed by OpenFreeMap vector tiles.
 * Exposes `flyTo` via a forwarded ref for programmatic camera control.
 */
export const MapLibreMap = forwardRef<MapLibreMapRef, MapLibreMapProps>(function MapLibreMap(
  { showUserLocation = false },
  ref,
) {
  const cameraRef = useRef<CameraRef>(null)

  useImperativeHandle(
    ref,
    () => ({
      flyTo: (longitude: number, latitude: number, animationDurationMs = 500) => {
        cameraRef.current?.setCamera({
          centerCoordinate: [longitude, latitude],
          zoomLevel: DEFAULT_ZOOM_LEVEL,
          animationDuration: animationDurationMs,
        })
      },
    }),
    [],
  )

  return (
    <MapLibreGL.MapView style={styles.map} mapStyle={TILE_STYLE_URL} logoEnabled={false}>
      <MapLibreGL.Camera ref={cameraRef} zoomLevel={2} animationDuration={0} />
      {showUserLocation && <MapLibreGL.UserLocation visible />}
    </MapLibreGL.MapView>
  )
})

const styles = StyleSheet.create({
  map: {
    flex: 1,
  },
})
