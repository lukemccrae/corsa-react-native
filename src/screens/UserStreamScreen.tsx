import { FC, useEffect, useMemo, useState } from "react"
import { ActivityIndicator, Image, ImageStyle, TextStyle, View, ViewStyle } from "react-native"
import { useRouter } from "expo-router"

import {
  MapLibreMap,
  type MapCoordinate,
  type StreamPostMarker,
  type StreamWaypointMarker,
} from "@/components/Map/MapLibreMap"
import { Button } from "@/components/Button"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import type { ChatMessage, LiveStream, Post, User, Waypoint } from "@/generated/schema"
import { fetchUserStreamById } from "@/services/api/graphql"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

interface UserStreamScreenProps {
  username: string
  streamId: string
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return null

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value))
}

function formatDistance(miles: number, uom?: string | null) {
  return uom === "METRIC" ? `${(miles * 1.60934).toFixed(2)} km` : `${miles.toFixed(2)} mi`
}

function getStatus(stream: LiveStream) {
  if (stream.startTime && new Date(stream.startTime) > new Date()) return "Upcoming"
  if (stream.live) return "Live"
  return "Finished"
}

type StreamPostEntry = Post & {
  __typename?: string
  text?: string | null
  imagePath?: string | null
  images?: Array<string | null> | null
  media?: Array<{ path: string } | null> | null
}

function hasCoordinate(value: number | null | undefined): value is number {
  return Number.isFinite(value)
}

function toMapCoordinate(latitude: number | null | undefined, longitude: number | null | undefined) {
  if (!hasCoordinate(latitude) || !hasCoordinate(longitude)) return null

  return { latitude, longitude }
}

function formatCoordinateLabel(latitude: number, longitude: number) {
  return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
}

function getPostText(post: StreamPostEntry) {
  return post.text?.trim() || "Shared an update from the route."
}

function getPostMediaLabel(post: StreamPostEntry) {
  const photoCount = post.images?.filter(Boolean).length ?? 0
  const mediaCount = post.media?.filter(Boolean).length ?? 0

  if (photoCount > 0) return `${photoCount} photo${photoCount === 1 ? "" : "s"}`
  if (mediaCount > 0) return `${mediaCount} attachment${mediaCount === 1 ? "" : "s"}`
  if (post.imagePath) return "1 photo"

  return null
}

function getInitialZoomLevel(points: MapCoordinate[]) {
  if (points.length <= 1) return 11

  const latitudes = points.map((point) => point.latitude)
  const longitudes = points.map((point) => point.longitude)
  const span = Math.max(
    Math.max(...latitudes) - Math.min(...latitudes),
    Math.max(...longitudes) - Math.min(...longitudes),
  )

  if (span <= 0.02) return 12
  if (span <= 0.08) return 10.5
  if (span <= 0.3) return 9
  if (span <= 1) return 7
  if (span <= 3) return 5.5
  if (span <= 10) return 4.5

  return 3
}

function getInitialCenter(points: MapCoordinate[]) {
  if (points.length === 0) return null

  const latitudes = points.map((point) => point.latitude)
  const longitudes = points.map((point) => point.longitude)

  return {
    latitude: (Math.min(...latitudes) + Math.max(...latitudes)) / 2,
    longitude: (Math.min(...longitudes) + Math.max(...longitudes)) / 2,
  }
}

function ChatMessageItem({ message }: { message: ChatMessage }) {
  return (
    <View style={$chatCard}>
      <Text text={message.publicUser?.username || "Supporter"} weight="medium" size="xs" />
      <Text text={message.text || ""} size="xs" style={$chatText} />
      <Text text={formatDateTime(message.createdAt) || ""} size="xxs" style={$chatMeta} />
    </View>
  )
}

function PostCard({ post }: { post: StreamPostEntry }) {
  const latitude = post.location?.lat
  const longitude = post.location?.lng
  const coordinateLabel =
    hasCoordinate(latitude) && hasCoordinate(longitude)
      ? formatCoordinateLabel(latitude, longitude)
      : null
  const mediaLabel = getPostMediaLabel(post)

  return (
    <View style={$postCard}>
      <View style={$postHeader}>
        <Text text={post.type} weight="medium" size="xs" />
        <Text text={formatDateTime(post.createdAt) || ""} size="xxs" style={$postMeta} />
      </View>
      <Text text={getPostText(post)} size="xs" style={$postText} />
      <View style={$postFooter}>
        {coordinateLabel ? <Text text={`Pinned to map • ${coordinateLabel}`} size="xxs" style={$postMeta} /> : null}
        {mediaLabel ? <Text text={mediaLabel} size="xxs" style={$postMeta} /> : null}
      </View>
    </View>
  )
}

export const UserStreamScreen: FC<UserStreamScreenProps> = function UserStreamScreen({
  username,
  streamId,
}) {
  const { themed } = useAppTheme()
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [stream, setStream] = useState<LiveStream | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    void (async () => {
      try {
        const result = await fetchUserStreamById(username, streamId)
        if (!isMounted) return

        setUser(result?.user ?? null)
        setStream(result?.stream ?? null)
        setError(null)
      } catch (loadError) {
        if (!isMounted) return
        setError(loadError instanceof Error ? loadError.message : "Failed to load stream")
      } finally {
        if (isMounted) setLoading(false)
      }
    })()

    return () => {
      isMounted = false
    }
  }, [streamId, username])

  const chatMessages = useMemo(
    () => (stream?.chatMessages ?? []).filter((message): message is ChatMessage => Boolean(message)),
    [stream],
  )

  const publicWaypoints = useMemo(
    () =>
      (stream?.waypoints ?? [])
        .filter((waypoint): waypoint is Waypoint => Boolean(waypoint) && waypoint.private !== true)
        .sort((left, right) => new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime()),
    [stream],
  )

  const posts = useMemo(
    () =>
      (stream?.posts ?? [])
        .filter((post): post is StreamPostEntry => Boolean(post))
        .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()),
    [stream],
  )

  const trackCoordinates = useMemo<MapCoordinate[]>(
    () =>
      publicWaypoints.map((waypoint) => ({
        latitude: waypoint.lat,
        longitude: waypoint.lng,
      })),
    [publicWaypoints],
  )

  const waypointMarkers = useMemo<StreamWaypointMarker[]>(
    () =>
      publicWaypoints.map((waypoint, index) => ({
        id: `${waypoint.streamId}-${waypoint.pointIndex ?? index}`,
        latitude: waypoint.lat,
        longitude: waypoint.lng,
      })),
    [publicWaypoints],
  )

  const postMarkers = useMemo<StreamPostMarker[]>(
    () =>
      posts.flatMap((post) => {
        const coordinate = toMapCoordinate(post.location?.lat, post.location?.lng)
        if (!coordinate) return []

        return [
          {
            id: `${post.userId}-${post.createdAt}`,
            title: getPostText(post),
            latitude: coordinate.latitude,
            longitude: coordinate.longitude,
          },
        ]
      }),
    [posts],
  )

  const currentLocationMarker = useMemo(
    () => toMapCoordinate(stream?.currentLocation?.lat, stream?.currentLocation?.lng),
    [stream],
  )

  const mapPoints = useMemo(
    () => [
      ...trackCoordinates,
      ...postMarkers.map((marker) => ({ latitude: marker.latitude, longitude: marker.longitude })),
      ...(currentLocationMarker ? [currentLocationMarker] : []),
    ],
    [currentLocationMarker, postMarkers, trackCoordinates],
  )

  const initialCenter = useMemo(() => getInitialCenter(mapPoints), [mapPoints])
  const initialZoomLevel = useMemo(() => getInitialZoomLevel(mapPoints), [mapPoints])
  const hasMapData = mapPoints.length > 0

  return (
    <Screen preset="scroll" contentContainerStyle={themed($screenContainer)}>
      <View style={themed($topRow)}>
        <Button text="Back to profile" onPress={() => router.replace(`/(app)/user/${username}`)} />
      </View>

      {loading ? (
        <View style={themed($stateBlock)}>
          <ActivityIndicator />
        </View>
      ) : error ? (
        <View style={themed($stateBlock)}>
          <Text text={error} style={themed($errorText)} />
        </View>
      ) : !user || !stream ? (
        <View style={themed($stateBlock)}>
          <Text text="Stream not found" preset="subheading" />
        </View>
      ) : (
        <>
          <View style={themed($heroCard)}>
            <View style={themed($heroHeader)}>
              {user.profilePicture ? (
                <Image source={{ uri: user.profilePicture }} style={themed($avatar)} />
              ) : (
                <View style={themed($avatarFallback)}>
                  <Text text={username.charAt(0).toUpperCase()} preset="subheading" />
                </View>
              )}
              <View style={themed($heroCopy)}>
                <Text text={stream.title} preset="subheading" />
                <Text text={`@${username}`} size="xs" style={themed($subtleText)} />
              </View>
              <View style={themed($statusBadge)}>
                <Text text={getStatus(stream)} size="xxs" weight="medium" style={themed($statusText)} />
              </View>
            </View>

            <View style={themed($detailsGrid)}>
              <View style={themed($detailBlock)}>
                <Text text="Started" size="xxs" style={themed($subtleText)} />
                <Text text={formatDateTime(stream.startTime) || "Unknown"} size="xs" />
              </View>
              <View style={themed($detailBlock)}>
                <Text text="Finished" size="xxs" style={themed($subtleText)} />
                <Text text={formatDateTime(stream.finishTime) || "Still active"} size="xs" />
              </View>
              <View style={themed($detailBlock)}>
                <Text text="Progress" size="xxs" style={themed($subtleText)} />
                <Text
                  text={
                    stream.mileMarker != null
                      ? formatDistance(stream.mileMarker, stream.unitOfMeasure)
                      : "No distance yet"
                  }
                  size="xs"
                />
              </View>
              <View style={themed($detailBlock)}>
                <Text text="Timezone" size="xxs" style={themed($subtleText)} />
                <Text text={stream.timezone || "Unknown"} size="xs" />
              </View>
            </View>

            {stream.route ? (
              <Button
                text={`View route: ${stream.route.name}`}
                onPress={() => router.push(`/(app)/user/${username}/route/${stream.route!.routeId}`)}
                style={themed($ctaButton)}
              />
            ) : null}
          </View>

          <View style={themed($section)}>
            <View style={themed($sectionHeader)}>
              <Text text="Map activity" preset="subheading" size="sm" />
              <Text
                text={`${publicWaypoints.length} points • ${postMarkers.length} posts`}
                size="xxs"
                style={themed($subtleText)}
              />
            </View>

            {hasMapData ? (
              <View style={themed($mapCard)}>
                <View style={themed($mapFrame)}>
                  <MapLibreMap
                    initialCenter={initialCenter ?? undefined}
                    initialZoomLevel={initialZoomLevel}
                    trackCoordinates={trackCoordinates}
                    waypointMarkers={waypointMarkers}
                    postMarkers={postMarkers}
                    currentLocationMarker={currentLocationMarker}
                  />
                </View>
                <View style={themed($mapLegend)}>
                  <View style={themed($legendItem)}>
                    <View style={themed($legendSwatchTrack)} />
                    <Text text="Track points" size="xxs" />
                  </View>
                  <View style={themed($legendItem)}>
                    <View style={themed($legendSwatchPost)} />
                    <Text text="Posts" size="xxs" />
                  </View>
                  {currentLocationMarker ? (
                    <View style={themed($legendItem)}>
                      <View style={themed($legendSwatchCurrent)} />
                      <Text text="Current location" size="xxs" />
                    </View>
                  ) : null}
                </View>
              </View>
            ) : (
              <View style={themed($emptyCard)}>
                <Text text="No waypoint or post locations are available for this stream yet." size="xs" />
              </View>
            )}
          </View>

          <View style={themed($section)}>
            <View style={themed($sectionHeader)}>
              <Text text="Posts" preset="subheading" size="sm" />
              <Text text={`${posts.length} updates`} size="xxs" style={themed($subtleText)} />
            </View>
            {posts.length === 0 ? (
              <Text text="No posts yet." size="xs" style={themed($subtleText)} />
            ) : (
              <View style={themed($postList)}>
                {posts.map((post) => (
                  <PostCard key={`${post.userId}-${post.createdAt}`} post={post} />
                ))}
              </View>
            )}
          </View>

          <View style={themed($section)}>
            <View style={themed($sectionHeader)}>
              <Text text="Chat" preset="subheading" size="sm" />
              <Text text={`${chatMessages.length} messages`} size="xxs" style={themed($subtleText)} />
            </View>
            {chatMessages.length === 0 ? (
              <Text text="No chat messages yet." size="xs" style={themed($subtleText)} />
            ) : (
              <View style={themed($chatList)}>
                {chatMessages.map((message) => (
                  <ChatMessageItem key={`${message.createdAt}-${message.text}`} message={message} />
                ))}
              </View>
            )}
          </View>
        </>
      )}
    </Screen>
  )
}

const $chatCard: ViewStyle = {
  borderWidth: 1,
  borderColor: "#D4D7DD",
  borderRadius: 14,
  padding: 14,
  gap: 6,
  backgroundColor: "#FFFFFF",
}

const $chatText: TextStyle = {
  color: "#212731",
}

const $chatMeta: TextStyle = {
  color: "#5B6472",
}

const $postCard: ViewStyle = {
  borderWidth: 1,
  borderColor: "#D4D7DD",
  borderRadius: 14,
  padding: 14,
  gap: 8,
  backgroundColor: "#FFFFFF",
}

const $postHeader: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
}

const $postText: TextStyle = {
  color: "#212731",
}

const $postMeta: TextStyle = {
  color: "#5B6472",
}

const $postFooter: ViewStyle = {
  flexDirection: "row",
  flexWrap: "wrap",
  gap: 12,
}

const $screenContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing.md,
  paddingBottom: spacing.xxl,
  gap: spacing.md,
})

const $topRow: ThemedStyle<ViewStyle> = () => ({
  alignItems: "flex-start",
})

const $stateBlock: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  alignItems: "center",
  justifyContent: "center",
  paddingVertical: spacing.xl,
  gap: spacing.sm,
})

const $errorText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.error,
})

const $heroCard: ThemedStyle<ViewStyle> = ({ spacing, colors }) => ({
  borderRadius: 24,
  padding: spacing.lg,
  gap: spacing.md,
  backgroundColor: colors.background,
  borderWidth: 1,
  borderColor: colors.palette.neutral300,
})

const $heroHeader: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.sm,
})

const $heroCopy: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flex: 1,
  gap: spacing.xxxs,
})

const $avatar: ThemedStyle<ImageStyle> = () => ({
  width: 56,
  height: 56,
  borderRadius: 28,
})

const $avatarFallback: ThemedStyle<ViewStyle> = ({ colors }) => ({
  width: 56,
  height: 56,
  borderRadius: 28,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: colors.palette.neutral300,
})

const $statusBadge: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  borderRadius: 999,
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xxs,
  backgroundColor: colors.palette.neutral900,
})

const $statusText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.palette.neutral100,
})

const $detailsGrid: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  flexWrap: "wrap",
  gap: spacing.md,
})

const $detailBlock: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  minWidth: "46%",
  gap: spacing.xxxs,
})

const $ctaButton: ThemedStyle<ViewStyle> = () => ({
  minHeight: 44,
})

const $section: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  gap: spacing.sm,
})

const $sectionHeader: ThemedStyle<ViewStyle> = () => ({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
})

const $mapCard: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  gap: spacing.sm,
  borderWidth: 1,
  borderColor: colors.palette.neutral300,
  borderRadius: 20,
  padding: spacing.sm,
  backgroundColor: colors.background,
})

const $mapFrame: ThemedStyle<ViewStyle> = () => ({
  height: 320,
  overflow: "hidden",
  borderRadius: 16,
})

const $mapLegend: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  flexWrap: "wrap",
  gap: spacing.md,
})

const $legendItem: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.xxs,
})

const $legendSwatchTrack: ThemedStyle<ViewStyle> = () => ({
  width: 10,
  height: 10,
  borderRadius: 5,
  backgroundColor: "#0f172a",
})

const $legendSwatchPost: ThemedStyle<ViewStyle> = () => ({
  width: 10,
  height: 10,
  borderRadius: 5,
  backgroundColor: "#f97316",
})

const $legendSwatchCurrent: ThemedStyle<ViewStyle> = () => ({
  width: 10,
  height: 10,
  borderRadius: 5,
  backgroundColor: "#2563eb",
})

const $emptyCard: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  borderWidth: 1,
  borderColor: colors.palette.neutral300,
  borderRadius: 16,
  padding: spacing.md,
  backgroundColor: colors.background,
})

const $chatList: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  gap: spacing.sm,
})

const $postList: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  gap: spacing.sm,
})

const $subtleText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
})