import { FC, useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  ActivityIndicator,
  Image,
  ImageStyle,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextStyle,
  View,
  ViewStyle,
} from "react-native"
import * as Location from "expo-location"
import { useRouter } from "expo-router"

import { Button } from "@/components/Button"
import {
  MapLibreMap,
  MapLibreMapRef,
  type SocialMapMarker,
} from "@/components/Map/MapLibreMap"
import { ProfileMenu } from "@/components/ProfileMenu"
import { Text } from "@/components/Text"
import type { LiveStream } from "@/generated/schema"
import { translate } from "@/i18n/translate"
import { useAuth } from "@/providers/AuthProvider"
import { fetchPublicStreamsByEntity } from "@/services/api/graphql"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

function hasStreamLocation(stream: LiveStream) {
  const lat = stream.currentLocation?.lat
  const lng = stream.currentLocation?.lng

  return Number.isFinite(lat) && Number.isFinite(lng)
}

function getStreamStatus(stream: LiveStream): "live" | "upcoming" | "finished" {
  if (stream.startTime && new Date(stream.startTime) > new Date()) return "upcoming"
  if (stream.live) return "live"
  return "finished"
}

function formatEventDate(value: string | null | undefined) {
  if (!value) return "Unknown date"

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Unknown date"

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date)
}

function formatDistance(miles: number, uom?: string | null) {
  return uom === "METRIC" ? `${(miles * 1.60934).toFixed(2)} km` : `${miles.toFixed(2)} mi`
}

function toTimestamp(value: string | null | undefined) {
  if (!value) return 0
  const timestamp = new Date(value).getTime()
  return Number.isFinite(timestamp) ? timestamp : 0
}

function getStatusLabel(stream: LiveStream) {
  return getStreamStatus(stream) === "live" ? "Live" : "Completed"
}

export const MapScreen: FC = function MapScreen() {
  const { themed } = useAppTheme()
  const { user, appUser, signOut } = useAuth()
  const router = useRouter()
  const mapRef = useRef<MapLibreMapRef>(null)

  const [permissionStatus, setPermissionStatus] = useState<Location.PermissionStatus | null>(null)
  const [locationError] = useState(false)
  const [socialStreams, setSocialStreams] = useState<LiveStream[]>([])
  const [socialLoading, setSocialLoading] = useState(true)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const requestPermission = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync()
    setPermissionStatus(status)
  }, [])

  useEffect(() => {
    requestPermission()
  }, [requestPermission])

  useEffect(() => {
    let active = true

    const loadSocialStreams = async () => {
      try {
        const streams = await fetchPublicStreamsByEntity()
        if (!active) return
        setSocialStreams(streams.filter((stream) => stream.published === true && hasStreamLocation(stream)))
      } catch (error) {
        if (__DEV__) console.warn("Failed to load social streams:", error)
        if (!active) return
        setSocialStreams([])
      } finally {
        if (active) setSocialLoading(false)
      }
    }

    void loadSocialStreams()

    return () => {
      active = false
    }
  }, [])

  const streamMarkers = useMemo<SocialMapMarker[]>(
    () =>
      socialStreams.map((stream) => ({
        id: stream.streamId,
        latitude: stream.currentLocation!.lat,
        longitude: stream.currentLocation!.lng,
        username: stream.publicUser?.username || "unknown",
        title: stream.title,
        profilePicture: stream.publicUser?.profilePicture,
        isLive: getStreamStatus(stream) === "live",
      })),
    [socialStreams],
  )

  const discoverStreams = useMemo(
    () =>
      socialStreams
        .slice()
        .sort(
          (a, b) => {
            const aIsLive = getStreamStatus(a) === "live" ? 1 : 0
            const bIsLive = getStreamStatus(b) === "live" ? 1 : 0
            if (aIsLive !== bIsLive) return bIsLive - aIsLive
            return toTimestamp(b.finishTime ?? b.startTime) - toTimestamp(a.finishTime ?? a.startTime)
          },
        ),
    [socialStreams],
  )

  const profileBadgeStyle = useMemo(
    () => themed(sidebarCollapsed ? $profileBadgeCollapsed : $profileBadgeSidebarOpen),
    [sidebarCollapsed, themed],
  )

  useEffect(() => {
    if (!streamMarkers.length) return

    const firstLiveMarker = streamMarkers.find((marker) => marker.isLive)
    const markerToCenter = firstLiveMarker ?? streamMarkers[0]

    mapRef.current?.flyTo(markerToCenter.longitude, markerToCenter.latitude, 500, 3.5)
  }, [permissionStatus, streamMarkers])

  const handleOpenSettings = useCallback(() => {
    if (Platform.OS === "ios") {
      Linking.openURL("app-settings:")
    } else {
      Linking.openSettings()
    }
  }, [])

  const displayUsername = appUser?.username
  const profilePictureUri = appUser?.profilePicture
  const handleOpenStream = useCallback(
    (stream: LiveStream) => {
      const username = stream.publicUser?.username
      if (!username) return

      router.push(`/(app)/user/${username}/stream/${stream.streamId}`)
    },
    [router],
  )

  const handleSelectDiscoverStream = useCallback((stream: LiveStream) => {
    const lat = stream.currentLocation?.lat
    const lng = stream.currentLocation?.lng
    if (typeof lat !== "number" || typeof lng !== "number") return

    mapRef.current?.flyTo(lng, lat, 450, 6)
  }, [])

  const handleZoomIn = useCallback(() => {
    void mapRef.current?.zoomIn()
  }, [])

  const handleZoomOut = useCallback(() => {
    void mapRef.current?.zoomOut()
  }, [])

  const defaultInitialCenter = useMemo(
    () => ({ latitude: 39.8283, longitude: -98.5795 }),
    [],
  )

  return (
    <View style={styles.container}>
      <MapLibreMap
        ref={mapRef}
        showUserLocation={false}
        initialCenter={defaultInitialCenter}
        initialZoomLevel={3}
        markers={streamMarkers}
        onMarkerPress={(marker) => {
          const stream = socialStreams.find((entry) => entry.streamId === marker.id)
          if (!stream) return
          handleOpenStream(stream)
        }}
      />

      {!sidebarCollapsed ? (
        <View style={themed($discoverSidebar)}>
          <View style={themed($discoverHeader)}>
            <Text text="Discover" preset="heading" style={themed($discoverTitle)} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Collapse discover sidebar"
              onPress={() => setSidebarCollapsed(true)}
              style={({ pressed }) => [themed($collapseButton), pressed ? themed($collapseButtonPressed) : null]}
            >
              <Text text="‹" style={themed($collapseButtonText)} />
            </Pressable>
          </View>
          <Text text="Live activity" size="xs" style={themed($discoverSubTitle)} />
          <View style={themed($discoverDivider)} />

          <Text text="Individuals" weight="medium" style={themed($sectionTitle)} />

          {socialLoading ? (
            <View style={themed($eventsLoading)}>
              <ActivityIndicator color="#f8fafc" />
            </View>
          ) : null}

          {!socialLoading && discoverStreams.length === 0 ? (
            <Text text="No tracker events yet." size="xs" style={themed($eventsEmpty)} />
          ) : null}

          <ScrollView showsVerticalScrollIndicator={false} style={themed($eventsList)}>
            {discoverStreams.map((stream) => {
              const isLive = getStreamStatus(stream) === "live"
              const username = stream.publicUser?.username || "unknown"
              const subtitle = stream.title || formatEventDate(stream.finishTime ?? stream.startTime)

              return (
                <Pressable
                  key={stream.streamId}
                  onPress={() => handleOpenStream(stream)}
                  onLongPress={() => handleSelectDiscoverStream(stream)}
                  style={({ pressed }) => [themed($discoverItem), pressed ? themed($discoverItemPressed) : null]}
                >
                  {stream.publicUser?.profilePicture ? (
                    <Image source={{ uri: stream.publicUser.profilePicture }} style={themed($discoverAvatar)} />
                  ) : (
                    <View style={themed($discoverAvatarFallback)} />
                  )}

                  <View style={themed($discoverTextCol)}>
                    <Text text={username} weight="medium" numberOfLines={1} style={themed($discoverUsername)} />
                    <Text text={subtitle} size="xs" numberOfLines={1} style={themed($discoverSubtitle)} />
                  </View>

                  <View style={themed($discoverStatusCol)}>
                    {isLive ? <View style={themed($liveDot)} /> : null}
                    <Text text={getStatusLabel(stream)} size="xs" style={themed($discoverStatusText)} />
                  </View>
                </Pressable>
              )
            })}
          </ScrollView>
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Expand discover sidebar"
          onPress={() => setSidebarCollapsed(false)}
          style={({ pressed }) => [themed($expandSidebarButton), pressed ? themed($collapseButtonPressed) : null]}
        >
          <Text text="›" style={themed($collapseButtonText)} />
        </Pressable>
      )}

      {user && appUser ? (
        <ProfileMenu
          profilePictureUri={profilePictureUri}
          username={displayUsername}
          containerStyle={profileBadgeStyle}
        />
      ) : (
        <Pressable
          style={[themed($profileBadge), profileBadgeStyle]}
          onPress={() => router.push("/(auth)/sign-in")}
          accessibilityRole="button"
          accessibilityLabel={translate("mapScreen:signIn")}
        >
          <Text tx="mapScreen:signIn" size="xs" weight="medium" style={themed($profileName)} />
        </Pressable>
      )}

      <View style={themed($zoomControls)}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Zoom in"
          onPress={handleZoomIn}
          style={({ pressed }) => [themed($zoomButton), pressed ? themed($zoomButtonPressed) : null]}
        >
          <Text text="+" style={themed($zoomButtonText)} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Zoom out"
          onPress={handleZoomOut}
          style={({ pressed }) => [themed($zoomButton), pressed ? themed($zoomButtonPressed) : null]}
        >
          <Text text="-" style={themed($zoomButtonText)} />
        </Pressable>
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

const $zoomControls: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  position: "absolute",
  top: spacing.xxxl + 48,
  right: spacing.md,
  gap: spacing.xs,
})

const $zoomButton: ThemedStyle<ViewStyle> = ({ colors }) => ({
  width: 40,
  height: 40,
  borderRadius: 8,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: colors.background,
  borderWidth: 1,
  borderColor: colors.border,
})

const $zoomButtonPressed: ThemedStyle<ViewStyle> = () => ({
  opacity: 0.7,
})

const $zoomButtonText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.text,
  fontSize: 22,
  lineHeight: 24,
})

const $profileBadge: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  position: "absolute",
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

const $profileBadgeCollapsed: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  top: spacing.xxxl,
})

const $profileBadgeSidebarOpen: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  top: spacing.xxxl + spacing.xxl,
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

const $discoverSidebar: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  position: "absolute",
  top: 0,
  bottom: 0,
  left: 0,
  width: "72%",
  maxWidth: 420,
  minWidth: 280,
  backgroundColor: "#071839",
  paddingHorizontal: spacing.md,
  paddingTop: spacing.xxxl,
  paddingBottom: spacing.xxl + 70,
})

const $discoverHeader: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: spacing.xxxs,
})

const $discoverTitle: ThemedStyle<TextStyle> = () => ({
  color: "#f8fafc",
  fontSize: 40,
  lineHeight: 44,
})

const $discoverSubTitle: ThemedStyle<TextStyle> = ({ spacing }) => ({
  color: "#a8b6d3",
  marginBottom: spacing.md,
})

const $discoverDivider: ThemedStyle<ViewStyle> = () => ({
  marginHorizontal: -16,
  borderBottomWidth: 1,
  borderBottomColor: "#1d335f",
  marginBottom: 14,
})

const $sectionTitle: ThemedStyle<TextStyle> = ({ spacing }) => ({
  color: "#c4d0e7",
  marginBottom: spacing.sm,
})

const $collapseButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  width: 34,
  height: 34,
  borderRadius: 17,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "rgba(255,255,255,0.06)",
  marginRight: -spacing.xs,
})

const $collapseButtonPressed: ThemedStyle<ViewStyle> = () => ({
  opacity: 0.7,
})

const $collapseButtonText: ThemedStyle<TextStyle> = () => ({
  color: "#d6e2ff",
  fontSize: 24,
  lineHeight: 24,
})

const $expandSidebarButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  position: "absolute",
  top: spacing.xxxl,
  left: spacing.sm,
  width: 34,
  height: 34,
  borderRadius: 17,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "rgba(7,24,57,0.88)",
})

const $eventsLoading: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingVertical: spacing.sm,
})

const $eventsEmpty: ThemedStyle<TextStyle> = () => ({
  color: "#9fb0cf",
})

const $eventsList: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
})

const $discoverItem: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  paddingVertical: spacing.xs,
  paddingHorizontal: spacing.xxxs,
  marginBottom: spacing.xs,
})

const $discoverItemPressed: ThemedStyle<ViewStyle> = () => ({
  backgroundColor: "rgba(147, 197, 253, 0.12)",
  borderRadius: 10,
})

const $discoverAvatar: ThemedStyle<ImageStyle> = () => ({
  width: 44,
  height: 44,
  borderRadius: 22,
  marginRight: 10,
})

const $discoverAvatarFallback: ThemedStyle<ViewStyle> = () => ({
  width: 44,
  height: 44,
  borderRadius: 22,
  marginRight: 10,
  backgroundColor: "#2a4f90",
})

const $discoverTextCol: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
})

const $discoverUsername: ThemedStyle<TextStyle> = () => ({
  color: "#f8fafc",
  fontSize: 28,
  lineHeight: 32,
})

const $discoverSubtitle: ThemedStyle<TextStyle> = () => ({
  color: "#a8b6d3",
})

const $discoverStatusCol: ThemedStyle<ViewStyle> = () => ({
  minWidth: 76,
  alignItems: "flex-end",
})

const $discoverStatusText: ThemedStyle<TextStyle> = () => ({
  color: "#aab7d1",
})

const $liveDot: ThemedStyle<ViewStyle> = () => ({
  width: 10,
  height: 10,
  borderRadius: 5,
  backgroundColor: "#f87171",
  marginBottom: 6,
})
