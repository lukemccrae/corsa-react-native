import { FC, useCallback, useEffect, useRef, useState } from "react"
import {
  Image,
  ImageStyle,
  Linking,
  Platform,
  StyleSheet,
  TextStyle,
  View,
  ViewStyle,
} from "react-native"
import * as Location from "expo-location"
import { useRouter } from "expo-router"

import { Button } from "@/components/Button"
import { MapLibreMap, MapLibreMapRef } from "@/components/Map/MapLibreMap"
import { Text } from "@/components/Text"
import { useAuth } from "@/providers/AuthProvider"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

export const MapScreen: FC = function MapScreen() {
  const { themed } = useAppTheme()
  const { user, appUser, signOut } = useAuth()
  const router = useRouter()
  const mapRef = useRef<MapLibreMapRef>(null)

  const [permissionStatus, setPermissionStatus] = useState<Location.PermissionStatus | null>(null)
  const [locationError, setLocationError] = useState(false)

  const requestPermission = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync()
    setPermissionStatus(status)

    if (status === Location.PermissionStatus.GRANTED) {
      try {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        })
        // MapLibre uses [longitude, latitude] (GeoJSON) coordinate ordering.
        mapRef.current?.flyTo(location.coords.longitude, location.coords.latitude)
      } catch (error) {
        if (__DEV__) console.warn("Location unavailable on startup:", error)
        setLocationError(true)
      }
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
      // MapLibre uses [longitude, latitude] (GeoJSON) coordinate ordering.
      mapRef.current?.flyTo(location.coords.longitude, location.coords.latitude, 500)
    } catch (error) {
      if (__DEV__) console.warn("Location unavailable on center-on-me:", error)
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

  const displayUsername = appUser?.username
  const profilePictureUri = appUser?.profilePicture

  return (
    <View style={styles.container}>
      <MapLibreMap
        ref={mapRef}
        showUserLocation={permissionStatus === Location.PermissionStatus.GRANTED}
      />

      {user && appUser ? (
        <View style={themed($profileBadge)}>
          {profilePictureUri ? (
            <Image source={{ uri: profilePictureUri }} style={themed($avatar)} />
          ) : (
            <View style={themed($avatarFallback)} />
          )}
          {displayUsername ? (
            <Text text={displayUsername} size="xs" numberOfLines={1} style={themed($profileName)} />
          ) : null}
        </View>
      ) : null}

      {/* Overlay buttons */}
      <View style={themed($buttonContainer)}>
        <Button
          tx="mapScreen:centerOnMe"
          preset="reversed"
          onPress={handleCenterOnMe}
          style={themed($mapButton)}
          disabled={permissionStatus !== Location.PermissionStatus.GRANTED}
        />
        {user ? (
          <Button
            tx="mapScreen:signOut"
            preset="default"
            onPress={signOut}
            style={themed($mapButton)}
          />
        ) : (
          <Button
            tx="mapScreen:signIn"
            preset="default"
            onPress={() => router.push("/(auth)/sign-in")}
            style={themed($mapButton)}
          />
        )}
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

const $profileBadge: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  position: "absolute",
  top: spacing.xl,
  right: spacing.md,
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.xs,
  maxWidth: 220,
  backgroundColor: colors.background,
  borderRadius: 999,
  paddingVertical: spacing.xs,
  paddingHorizontal: spacing.sm,
  shadowColor: colors.palette.neutral900,
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.15,
  shadowRadius: 8,
  elevation: 4,
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
  backgroundColor: colors.palette.neutral300,
})

const $profileName: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.text,
  flexShrink: 1,
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
