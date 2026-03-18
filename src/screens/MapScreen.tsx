import { FC, useCallback, useEffect, useRef, useState } from "react"
import { Linking, Platform, StyleSheet, TextStyle, View, ViewStyle } from "react-native"
import * as Location from "expo-location"
import MapView, { MapViewProps, Region } from "react-native-maps"

import { Button } from "@/components/Button"
import { Text } from "@/components/Text"
import { useAuth } from "@/providers/AuthProvider"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

const DEFAULT_DELTA = { latitudeDelta: 0.01, longitudeDelta: 0.01 }

export const MapScreen: FC = function MapScreen() {
  const { themed } = useAppTheme()
  const { signOut } = useAuth()
  const mapRef = useRef<MapView>(null)

  const [region, setRegion] = useState<Region | null>(null)
  const [permissionStatus, setPermissionStatus] = useState<Location.PermissionStatus | null>(null)
  const [locationError, setLocationError] = useState(false)

  const requestPermission = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync()
    setPermissionStatus(status)

    if (status === Location.PermissionStatus.GRANTED) {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      })
      const newRegion: Region = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        ...DEFAULT_DELTA,
      }
      setRegion(newRegion)
    }
  }, [])

  useEffect(() => {
    requestPermission()
  }, [requestPermission])

  const handleCenterOnMe = useCallback(async () => {
    if (permissionStatus !== Location.PermissionStatus.GRANTED) return
    setLocationError(false)
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      })
      const newRegion: Region = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        ...DEFAULT_DELTA,
      }
      setRegion(newRegion)
      mapRef.current?.animateToRegion(newRegion, 500)
    } catch {
      setLocationError(true)
    }
  }, [permissionStatus])

  const handleOpenSettings = useCallback(() => {
    if (Platform.OS === "ios") {
      Linking.openURL("app-settings:")
    } else {
      Linking.openSettings()
    }
  }, [])

  const mapProps: MapViewProps = region
    ? { region, showsUserLocation: true, showsMyLocationButton: false }
    : { showsUserLocation: true, showsMyLocationButton: false }

  return (
    <View style={styles.container}>
      <MapView ref={mapRef} style={styles.map} {...mapProps} />

      {/* Overlay buttons */}
      <View style={themed($buttonContainer)}>
        <Button
          tx="mapScreen:centerOnMe"
          preset="reversed"
          onPress={handleCenterOnMe}
          style={themed($mapButton)}
          disabled={permissionStatus !== Location.PermissionStatus.GRANTED}
        />
        <Button
          tx="mapScreen:signOut"
          preset="default"
          onPress={signOut}
          style={themed($mapButton)}
        />
      </View>

      {/* Permission denied banner */}
      {permissionStatus === Location.PermissionStatus.DENIED && (
        <View style={themed($permissionBanner)}>
          <Text tx="mapScreen:locationPermissionDenied" preset="subheading" size="sm" />
          <Text
            tx="mapScreen:locationPermissionMessage"
            size="xs"
            style={themed($permissionMessage)}
          />
          <View style={themed($permissionActions)}>
            <Button
              tx="mapScreen:openSettings"
              preset="filled"
              onPress={handleOpenSettings}
              style={themed($permissionButton)}
            />
            <Button
              tx="mapScreen:retry"
              preset="default"
              onPress={requestPermission}
              style={themed($permissionButton)}
            />
          </View>
        </View>
      )}

      {/* Location fetch error toast */}
      {locationError && (
        <View style={themed($errorToast)}>
          <Text tx="mapScreen:locationError" size="xs" style={themed($errorToastText)} />
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
})

const $buttonContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  position: "absolute",
  bottom: spacing.xxl,
  left: spacing.md,
  right: spacing.md,
  flexDirection: "row",
  justifyContent: "space-between",
  gap: spacing.sm,
})

const $mapButton: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
})

const $permissionBanner: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  position: "absolute",
  top: spacing.xxl,
  left: spacing.md,
  right: spacing.md,
  backgroundColor: colors.background,
  borderRadius: 12,
  padding: spacing.md,
  shadowColor: colors.palette.neutral900,
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.15,
  shadowRadius: 8,
  elevation: 4,
})

const $permissionMessage: ThemedStyle<TextStyle> = ({ spacing }) => ({
  marginTop: spacing.xs,
})

const $permissionActions: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  gap: spacing.sm,
  marginTop: spacing.md,
})

const $permissionButton: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
  minHeight: 40,
})

const $errorToast: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  position: "absolute",
  bottom: spacing.xxl + 70,
  left: spacing.md,
  right: spacing.md,
  backgroundColor: colors.errorBackground,
  borderRadius: 8,
  padding: spacing.sm,
  alignItems: "center",
})

const $errorToastText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.error,
  textAlign: "center",
})
