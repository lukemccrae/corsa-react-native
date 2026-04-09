import { FC, useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  ActivityIndicator,
  Alert,
  Image,
  ImageStyle,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  TextStyle,
  View,
  ViewStyle,
} from "react-native"
import * as Location from "expo-location"
import { useRouter } from "expo-router"

import {
  MapLibreMap,
  type MapLibreMapRef,
  type MapCoordinate,
  type StreamPostMarker,
  type StreamWaypointMarker,
} from "@/components/Map/MapLibreMap"
import { Button } from "@/components/Button"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import type { ChatMessage, LiveStream, Post, User, Waypoint } from "@/generated/schema"
import {
  fetchUserStreamById,
  fetchUserStreamChatMessagesPage,
  ingestNativeWaypoints,
  publishChatMessage,
} from "@/services/api/graphql"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"
import { useAuth } from "@/providers/AuthProvider"
import {
  isTrackingActive,
  requestLocationPermissions,
  startLocationTracking,
  stopLocationTracking,
  TRACKING_UNAVAILABLE_MESSAGE,
} from "@/features/waypointTracking/locationTask"
import {
  clearActiveStreamId,
  getAllWaypoints,
  getActiveStreamId,
  loadTrackingConfig,
  setActiveStreamId,
} from "@/features/waypointTracking/waypointStorage"

interface UserStreamScreenProps {
  username: string
  streamId: string
}

function formatDateTime(value: string | number | null | undefined) {
  if (!value) return null

  const parsedDate = new Date(value)
  if (Number.isNaN(parsedDate.getTime())) return null

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(parsedDate)
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
  media?: Array<{ path: string; type?: string | null; contentType?: string | null } | null> | null
}

function hasCoordinate(value: number | null | undefined): value is number {
  return Number.isFinite(value)
}

function toMapCoordinate(latitude: number | null | undefined, longitude: number | null | undefined) {
  if (!hasCoordinate(latitude) || !hasCoordinate(longitude)) return null

  return { latitude, longitude }
}

function hasValidWaypointCoordinate(waypoint: { lat: number | null | undefined; lng: number | null | undefined }) {
  return hasCoordinate(waypoint.lat) && hasCoordinate(waypoint.lng)
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

function getPostImageUrls(post: StreamPostEntry) {
  const imagePathsFromPhotoPost = post.images?.filter(Boolean).map((path) => path as string) ?? []
  const imagePathFromStatusPost = post.imagePath ? [post.imagePath] : []
  const imagePathsFromMedia =
    post.media
      ?.filter(Boolean)
      .filter((mediaItem) => {
        const normalizedType = mediaItem?.type?.toLowerCase()
        return normalizedType === "image" || mediaItem?.contentType?.toLowerCase().startsWith("image/")
      })
      .map((mediaItem) => mediaItem!.path)
      .filter(Boolean) ?? []

  return [...new Set([...imagePathsFromPhotoPost, ...imagePathFromStatusPost, ...imagePathsFromMedia])]
}

const DEFAULT_MAP_POST_IMAGE_ASPECT_RATIO = 4 / 3

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
  const { themed } = useAppTheme()
  return (
    <View style={$chatRow}>
      <View style={$chatAvatar}>
        {message.publicUser?.profilePicture ? (
          <Image source={{ uri: message.publicUser.profilePicture }} style={$chatAvatarImg} />
        ) : (
          <View style={themed($chatAvatarFallback)}>
            <Text
              text={(message.publicUser?.username ?? "?").charAt(0).toUpperCase()}
              size="xxs"
              weight="medium"
              style={themed($chatAvatarFallbackText)}
            />
          </View>
        )}
      </View>
      <View style={$chatBubble}>
        <View style={$chatByline}>
          <Text text={message.publicUser?.username ?? "Supporter"} weight="bold" size="xs" style={themed($chatUsername)} />
          <Text text={formatDateTime(message.createdAt) ?? ""} size="xxs" style={themed($chatTimestamp)} />
        </View>
        <Text text={message.text ?? ""} size="xs" style={themed($chatMessageText)} />
      </View>
    </View>
  )
}

type LiveChatSectionProps = {
  username: string
  streamId: string
  messages: ChatMessage[]
  nextToken: string | null
}

function sortMessagesChronologically(messages: ChatMessage[]) {
  return messages
    .slice()
    .sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime())
}

function mergeUniqueMessages(messages: ChatMessage[]) {
  const byKey = new Map<string, ChatMessage>()

  messages.forEach((message) => {
    byKey.set(`${message.createdAt}:${message.userId}:${message.text}`, message)
  })

  return sortMessagesChronologically([...byKey.values()])
}

function LiveChatSection({ username, streamId, messages: initialMessages, nextToken: initialNextToken }: LiveChatSectionProps) {
  const { themed } = useAppTheme()
  const { user, appUser } = useAuth()
  const router = useRouter()
  const [messages, setMessages] = useState<ChatMessage[]>(sortMessagesChronologically(initialMessages))
  const [nextToken, setNextToken] = useState<string | null>(initialNextToken)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [text, setText] = useState("")
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<ScrollView>(null)

  useEffect(() => {
    setMessages(sortMessagesChronologically(initialMessages))
    setNextToken(initialNextToken)
  }, [initialMessages, initialNextToken])

  useEffect(() => {
    if (messages.length > 0) {
      scrollRef.current?.scrollToEnd({ animated: false })
    }
  }, [initialMessages])

  const loadOlderMessages = useCallback(async () => {
    if (!nextToken || loadingOlder) return

    setLoadingOlder(true)
    try {
      const page = await fetchUserStreamChatMessagesPage({
        username,
        streamId,
        nextToken,
        limit: 30,
      })

      setMessages((prev) => mergeUniqueMessages([...page.messages, ...prev]))
      setNextToken(page.nextToken)
    } catch (loadError) {
      console.warn("Failed to load older chat messages", loadError)
    } finally {
      setLoadingOlder(false)
    }
  }, [loadingOlder, nextToken, streamId, username])

  const sendMessage = useCallback(async () => {
    const trimmed = text.trim()
    if (!trimmed || !user || !appUser) return

    const optimisticCreatedAt = new Date().toISOString()
    const optimistic: ChatMessage = {
      text: trimmed,
      createdAt: optimisticCreatedAt,
      userId: appUser.userId,
      streamId,
      publicUser: {
        username: appUser.username ?? "Me",
        profilePicture: appUser.profilePicture ?? "",
        userId: appUser.userId,
      },
    }

    setSending(true)
    setText("")
    setMessages((prev) => mergeUniqueMessages([...prev, optimistic]))
    scrollRef.current?.scrollToEnd({ animated: true })

    try {
      const idToken = await user.getIdToken()
      const saved = await publishChatMessage(
        {
          streamId,
          text: trimmed,
          userId: appUser.userId,
          username: appUser.username ?? "Me",
          profilePicture: appUser.profilePicture ?? "",
          createdAt: optimisticCreatedAt,
        },
        idToken,
      )
      setMessages((prev) =>
        mergeUniqueMessages(
          prev.map((m) => (m.createdAt === optimisticCreatedAt && m.text === trimmed ? saved : m)),
        ),
      )
    } catch {
      // rollback optimistic entry and restore text
      setMessages((prev) =>
        prev.filter((m) => !(m.createdAt === optimisticCreatedAt && m.text === trimmed)),
      )
      setText(trimmed)
    } finally {
      setSending(false)
    }
  }, [appUser, streamId, text, user])

  return (
    <View style={themed($chatCard)}>
      <Text text="Chat" preset="subheading" size="sm" style={themed($chatHeading)} />

      <ScrollView
        ref={scrollRef}
        style={$chatScrollArea}
        contentContainerStyle={$chatScrollContent}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={(event) => {
          if (event.nativeEvent.contentOffset.y <= 24) {
            void loadOlderMessages()
          }
        }}
      >
        {loadingOlder ? (
          <Text text="Loading older messages..." size="xxs" style={themed($chatTimestamp)} />
        ) : nextToken ? (
          <Text text="Scroll to top to load older messages" size="xxs" style={themed($chatTimestamp)} />
        ) : null}

        {messages.length === 0 ? (
          <Text text="Be the first to say hi!" size="xs" style={themed($chatEmpty)} />
        ) : (
          messages.map((message) => (
            <ChatMessageItem key={`${message.createdAt}:${message.userId}:${message.text}`} message={message} />
          ))
        )}
      </ScrollView>

      <View style={themed($chatFooter)}>
        {user && appUser ? (
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <View style={$chatInputRow}>
              <TextInput
                style={themed($chatInput)}
                value={text}
                onChangeText={setText}
                placeholder="Write a comment..."
                placeholderTextColor="#64748b"
                multiline
                editable={!sending}
                returnKeyType="send"
                blurOnSubmit
                onSubmitEditing={sendMessage}
              />
              <Pressable
                onPress={sendMessage}
                disabled={sending || !text.trim()}
                style={({ pressed }) => [
                  $sendButton,
                  (sending || !text.trim()) && $sendButtonDisabled,
                  pressed && $sendButtonPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Send message"
              >
                {sending ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text text="Send" size="xs" weight="medium" style={$sendButtonText} />
                )}
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        ) : (
          <View style={$guestRow}>
            <Text
              text="Sign in to post comments, interact with others, and stay updated."
              size="xs"
              style={themed($guestText)}
            />
            <Pressable
              style={$signInButton}
              onPress={() => router.push("/(auth)/login")}
              accessibilityRole="button"
            >
              <Text text="Sign in" size="xs" weight="bold" style={$signInButtonText} />
            </Pressable>
          </View>
        )}
      </View>
    </View>
  )
}

function PostCard({ post, onPressImage }: { post: StreamPostEntry; onPressImage: (imageUrl: string) => void }) {
  const latitude = post.location?.lat
  const longitude = post.location?.lng
  const postTypeLabel = post.type === "STATUS" ? null : post.type
  const createdAtLabel = formatDateTime(post.createdAt) || ""
  const coordinateLabel =
    hasCoordinate(latitude) && hasCoordinate(longitude)
      ? formatCoordinateLabel(latitude, longitude)
      : null
  const mediaLabel = getPostMediaLabel(post)
  const imageUrls = getPostImageUrls(post)
  const primaryImageUrl = imageUrls[0] ?? null
  const additionalImageUrls = imageUrls.slice(1)

  return (
    <View style={$postCard}>
      <View style={$postHeader}>
        <View style={$postHeaderLeft}>
          {postTypeLabel ? (
            <View style={$postTypePill}>
              <Text text={postTypeLabel} weight="medium" size="xxs" style={$postTypePillText} />
            </View>
          ) : null}
        </View>
        <Text text={createdAtLabel} size="xxs" style={$postTimestamp} />
      </View>
      {primaryImageUrl ? (
        <Pressable
          onPress={() => onPressImage(primaryImageUrl)}
          style={({ pressed }) => [$postHeroImageFrame, pressed && $postImageTilePressed]}
          accessibilityRole="button"
          accessibilityLabel="Open post photo"
        >
          <Image source={{ uri: primaryImageUrl }} style={$postImage} resizeMode="contain" />
        </Pressable>
      ) : null}
      <Text text={getPostText(post)} size="xs" style={$postText} />
      {additionalImageUrls.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={$postImageRow}
          accessibilityRole="image"
          accessibilityLabel="Additional post photos"
        >
          {additionalImageUrls.map((imageUrl, index) => (
            <Pressable
              key={`${post.userId}-${post.createdAt}-image-${index + 1}`}
              onPress={() => onPressImage(imageUrl)}
              style={({ pressed }) => [$postImageTile, pressed && $postImageTilePressed]}
              accessibilityRole="button"
              accessibilityLabel="Open post photo"
            >
              <Image source={{ uri: imageUrl }} style={$postImage} resizeMode="contain" />
            </Pressable>
          ))}
        </ScrollView>
      ) : null}
      <View style={$postFooter}>
        {coordinateLabel ? (
          <View style={$postMetaChip}>
            <Text text={`Pinned ${coordinateLabel}`} size="xxs" style={$postMetaChipText} />
          </View>
        ) : null}
        {mediaLabel ? (
          <View style={$postMetaChip}>
            <Text text={mediaLabel} size="xxs" style={$postMetaChipText} />
          </View>
        ) : null}
      </View>
    </View>
  )
}

export const UserStreamScreen: FC<UserStreamScreenProps> = function UserStreamScreen({
  username,
  streamId,
}) {
  const { themed } = useAppTheme()
  const { user, appUser } = useAuth()
  const router = useRouter()
  const streamMapRef = useRef<MapLibreMapRef>(null)
  const [routeUser, setRouteUser] = useState<User | null>(null)
  const [stream, setStream] = useState<LiveStream | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tracking, setTracking] = useState(false)
  const [activeTrackingStreamId, setActiveTrackingStreamId] = useState<string | null>(null)
  const [trackingBusy, setTrackingBusy] = useState(false)
  const [trackingError, setTrackingError] = useState<string | null>(null)
  const [uploadBusy, setUploadBusy] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [localWaypointRefreshTick, setLocalWaypointRefreshTick] = useState(0)
  const [selectedPostImageUrl, setSelectedPostImageUrl] = useState<string | null>(null)
  const [selectedMapPostMarker, setSelectedMapPostMarker] = useState<StreamPostMarker | null>(null)
  const [selectedMapWaypointMarker, setSelectedMapWaypointMarker] = useState<StreamWaypointMarker | null>(null)
  const [selectedMapPostImageAspectRatio, setSelectedMapPostImageAspectRatio] = useState(
    DEFAULT_MAP_POST_IMAGE_ASPECT_RATIO,
  )
  const [chatNextToken, setChatNextToken] = useState<string | null>(null)

  useEffect(() => {
    const photoUrl = selectedMapPostMarker?.photoUrl
    if (!photoUrl) {
      setSelectedMapPostImageAspectRatio(DEFAULT_MAP_POST_IMAGE_ASPECT_RATIO)
      return
    }

    let cancelled = false

    Image.getSize(
      photoUrl,
      (width, height) => {
        if (cancelled) return
        if (width > 0 && height > 0) {
          setSelectedMapPostImageAspectRatio(width / height)
          return
        }

        setSelectedMapPostImageAspectRatio(DEFAULT_MAP_POST_IMAGE_ASPECT_RATIO)
      },
      () => {
        if (cancelled) return
        setSelectedMapPostImageAspectRatio(DEFAULT_MAP_POST_IMAGE_ASPECT_RATIO)
      },
    )

    return () => {
      cancelled = true
    }
  }, [selectedMapPostMarker?.photoUrl])

  const mapPostModalImageFrameDynamicStyle = useMemo<ViewStyle>(
    () => ({ aspectRatio: selectedMapPostImageAspectRatio }),
    [selectedMapPostImageAspectRatio],
  )

  useEffect(() => {
    let isMounted = true

    void (async () => {
      try {
        const result = await fetchUserStreamById(username, streamId)
        if (!isMounted) return

        setRouteUser(result?.user ?? null)
        setStream(result?.stream ?? null)
        setChatNextToken(result?.chatNextToken ?? null)
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

  const refreshTrackingState = useCallback(async () => {
    const active = await isTrackingActive()
    setTracking(active)
    setActiveTrackingStreamId(getActiveStreamId())
  }, [])

  useEffect(() => {
    void refreshTrackingState()
  }, [refreshTrackingState])

  useEffect(() => {
    const intervalMs = tracking ? 4000 : 12000
    const timer = setInterval(() => setLocalWaypointRefreshTick((value) => value + 1), intervalMs)
    return () => clearInterval(timer)
  }, [tracking])

  const isOwnStream = useMemo(() => {
    const normalizedProfileUsername = username.trim().toLowerCase()
    const normalizedCurrentUsername = appUser?.username?.trim().toLowerCase()
    return Boolean(normalizedCurrentUsername) && normalizedProfileUsername === normalizedCurrentUsername
  }, [appUser?.username, username])

  const handleStartTracking = useCallback(async () => {
    setTrackingBusy(true)
    setTrackingError(null)

    try {
      const result = await requestLocationPermissions()
      if (result === "task_manager_unavailable") {
        setTrackingError(TRACKING_UNAVAILABLE_MESSAGE)
        return
      }
      if (result === "foreground_denied") {
        setTrackingError(
          "Foreground location permission is required. Please enable it in your device settings.",
        )
        return
      }
      if (result === "background_denied") {
        setTrackingError(
          "Background location permission is required to track while the app is closed. Please set location access to 'Always' in your device settings.",
        )
        return
      }

      if (tracking && activeTrackingStreamId && activeTrackingStreamId !== streamId) {
        await stopLocationTracking()
      }

      const config = loadTrackingConfig()
      setActiveStreamId(streamId)
      await startLocationTracking(config.intervalMinutes)
      await refreshTrackingState()
      setLocalWaypointRefreshTick((value) => value + 1)

      Alert.alert(
        "Tracking started",
        `Now recording waypoints for stream ${streamId} every ${config.intervalMinutes} minute(s).`,
      )
    } catch (trackingStartError) {
      setTrackingError(
        trackingStartError instanceof Error
          ? trackingStartError.message
          : "Could not start tracking for this stream.",
      )
      clearActiveStreamId()
    } finally {
      setTrackingBusy(false)
    }
  }, [activeTrackingStreamId, refreshTrackingState, streamId, tracking])

  const handleStopTracking = useCallback(async () => {
    setTrackingBusy(true)
    setTrackingError(null)

    try {
      await stopLocationTracking()
      clearActiveStreamId()
      await refreshTrackingState()
      setLocalWaypointRefreshTick((value) => value + 1)
    } catch (trackingStopError) {
      setTrackingError(
        trackingStopError instanceof Error
          ? trackingStopError.message
          : "Could not stop tracking.",
      )
    } finally {
      setTrackingBusy(false)
    }
  }, [refreshTrackingState])

  const handleLogLocalWaypoints = useCallback(() => {
    const points = getAllWaypoints()
      .filter((waypoint) => waypoint.streamId === streamId)
      .sort((left, right) => new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime())

    console.info(`[WaypointTracking] local points for ${streamId}: ${points.length}`)
    points.forEach((point, index) => {
      console.info(`[WaypointTracking] #${index + 1}`, {
        timestamp: point.timestamp,
        lat: point.lat,
        lng: point.lng,
        altitude: point.altitude,
      })
    })
  }, [streamId])

  const handleCenterOnCurrentLocation = useCallback(async () => {
    try {
      const permission = await Location.requestForegroundPermissionsAsync()
      if (permission.status !== "granted") {
        setTrackingError("Foreground location permission is required to center on your location.")
        return
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy:
          Platform.OS === "ios"
            ? Location.Accuracy.BestForNavigation
            : Location.Accuracy.High,
      })

      streamMapRef.current?.flyTo(
        position.coords.longitude,
        position.coords.latitude,
        700,
        15,
      )
    } catch (centerError) {
      setTrackingError(
        centerError instanceof Error
          ? centerError.message
          : "Could not center map on current location.",
      )
    }
  }, [])

  const chatMessages = useMemo(
    () => (stream?.chatMessages ?? []).filter((message): message is ChatMessage => Boolean(message)),
    [stream],
  )

  const publicWaypoints = useMemo(
    () =>
      (stream?.waypoints ?? [])
        .filter((waypoint): waypoint is Waypoint => Boolean(waypoint))
        .filter((waypoint) => waypoint.private !== true)
        .filter((waypoint) => hasValidWaypointCoordinate(waypoint))
        .sort((left, right) => new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime()),
    [stream],
  )

  const publicWaypointKeys = useMemo(
    () => new Set(publicWaypoints.map((waypoint) => `${waypoint.streamId}:${waypoint.timestamp}`)),
    [publicWaypoints],
  )

  const localWaypoints = useMemo(
    () =>
      getAllWaypoints()
        .filter((waypoint) => waypoint.streamId === streamId)
        .filter((waypoint) => hasValidWaypointCoordinate(waypoint))
        .sort((left, right) => new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime()),
    [localWaypointRefreshTick, streamId],
  )

  const pendingLocalWaypoints = useMemo(
    () => localWaypoints.filter((waypoint) => !publicWaypointKeys.has(`${waypoint.streamId}:${waypoint.timestamp}`)),
    [localWaypoints, publicWaypointKeys],
  )

  const mapWaypoints = useMemo(() => {
    const publicWaypointKeys = new Set(publicWaypoints.map((waypoint) => `${waypoint.streamId}:${waypoint.timestamp}`))

    const byKey = new Map<
      string,
      {
        streamId: string
        lat: number
        lng: number
        timestamp: string | number
        pointIndex?: number | null
        altitude?: number | null
        mileMarker?: number | null
        cumulativeVert?: number | null
        source: "public" | "local"
        synced: boolean
      }
    >()

    publicWaypoints.forEach((waypoint) => {
      byKey.set(`${waypoint.streamId}:${waypoint.timestamp}`, {
        streamId: waypoint.streamId,
        lat: waypoint.lat,
        lng: waypoint.lng,
        timestamp: waypoint.timestamp,
        pointIndex: waypoint.pointIndex,
        altitude: waypoint.altitude,
        mileMarker: waypoint.mileMarker,
        cumulativeVert: waypoint.cumulativeVert,
        source: "public",
        synced: true,
      })
    })

    localWaypoints.forEach((waypoint) => {
      const key = `${waypoint.streamId}:${waypoint.timestamp}`
      byKey.set(`${waypoint.streamId}:${waypoint.timestamp}`, {
        streamId: waypoint.streamId,
        lat: waypoint.lat,
        lng: waypoint.lng,
        timestamp: waypoint.timestamp,
        pointIndex: waypoint.pointIndex,
        altitude: waypoint.altitude,
        mileMarker: waypoint.mileMarker,
        cumulativeVert: waypoint.cumulativeVert,
        source: "local",
        synced: publicWaypointKeys.has(key),
      })
    })

    return [...byKey.values()].sort(
      (left, right) => new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime(),
    )
  }, [localWaypoints, publicWaypoints])

  const posts = useMemo(
    () =>
      (stream?.posts ?? [])
        .filter((post): post is StreamPostEntry => Boolean(post))
        .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()),
    [stream],
  )

  const trackCoordinates = useMemo<MapCoordinate[]>(
    () =>
      mapWaypoints.map((waypoint) => ({
        latitude: waypoint.lat,
        longitude: waypoint.lng,
      })),
    [mapWaypoints],
  )

  const waypointMarkers = useMemo<StreamWaypointMarker[]>(
    () =>
      mapWaypoints.map((waypoint, index) => ({
        id: `${waypoint.streamId}-${waypoint.pointIndex ?? index}`,
        latitude: waypoint.lat,
        longitude: waypoint.lng,
        recordedAt: formatDateTime(waypoint.timestamp) ?? String(waypoint.timestamp),
        locationLabel: formatCoordinateLabel(waypoint.lat, waypoint.lng),
        source: waypoint.source,
        synced: waypoint.synced,
        altitude: waypoint.altitude ?? null,
        mileMarker: waypoint.mileMarker ?? null,
        cumulativeVert: waypoint.cumulativeVert ?? null,
        pointIndex: waypoint.pointIndex ?? null,
      })),
    [mapWaypoints],
  )

  const pendingWaypointCount = useMemo(
    () => pendingLocalWaypoints.length,
    [pendingLocalWaypoints],
  )

  const syncedWaypointCount = useMemo(
    () => waypointMarkers.filter((waypoint) => waypoint.synced !== false).length,
    [waypointMarkers],
  )

  const postMarkers = useMemo<StreamPostMarker[]>(
    () =>
      posts.flatMap((post) => {
        const coordinate = toMapCoordinate(post.location?.lat, post.location?.lng)
        if (!coordinate) return []
        const firstPhotoUrl = getPostImageUrls(post)[0]

        return [
          {
            id: `${post.userId}-${post.createdAt}`,
            title: getPostText(post),
            createdAt: formatDateTime(post.createdAt) ?? post.createdAt,
            locationLabel: formatCoordinateLabel(coordinate.latitude, coordinate.longitude),
            latitude: coordinate.latitude,
            longitude: coordinate.longitude,
            photoUrl: firstPhotoUrl,
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

  const handleUploadPendingWaypoints = useCallback(async () => {
    if (!isOwnStream) return

    if (!user) {
      setUploadError("You must be signed in to upload waypoints.")
      return
    }

    if (pendingLocalWaypoints.length === 0) {
      Alert.alert("No pending points", "All local waypoints are already synced.")
      return
    }

    setUploadBusy(true)
    setUploadError(null)

    try {
      const idToken = await user.getIdToken()
      const result = await ingestNativeWaypoints(
        pendingLocalWaypoints.map((waypoint) => ({
          streamId: waypoint.streamId,
          lat: waypoint.lat,
          lng: waypoint.lng,
          timestamp: waypoint.timestamp,
        })),
        idToken,
      )

      const refreshed = await fetchUserStreamById(username, streamId)
      setStream(refreshed?.stream ?? null)
      setChatNextToken(refreshed?.chatNextToken ?? null)
      setLocalWaypointRefreshTick((value) => value + 1)

      if (result.failed > 0) {
        setUploadError(result.errors[0] ?? `${result.failed} waypoint upload request(s) failed.`)
      }

      Alert.alert(
        "Waypoint upload complete",
        `${result.uploaded} uploaded${result.failed > 0 ? `, ${result.failed} failed` : ""}.`,
      )
    } catch (uploadingError) {
      setUploadError(
        uploadingError instanceof Error ? uploadingError.message : "Could not upload pending waypoints.",
      )
    } finally {
      setUploadBusy(false)
    }
  }, [isOwnStream, pendingLocalWaypoints, streamId, user, username])

  const handleProfilePress = useCallback(() => {
    router.replace(`/(app)/user/${username}`)
  }, [router, username])
  const handleBackToMapPress = useCallback(() => {
    router.replace("/(app)")
  }, [router])

  return (
    <Screen preset="scroll" contentContainerStyle={themed($screenContainer)}>

      {loading ? (
        <View style={themed($stateBlock)}>
          <ActivityIndicator />
        </View>
      ) : error ? (
        <View style={themed($stateBlock)}>
          <Text text={error} style={themed($errorText)} />
        </View>
      ) : !routeUser || !stream ? (
        <View style={themed($stateBlock)}>
          <Text text="Stream not found" preset="subheading" />
        </View>
      ) : (
        <>
          <View style={themed($heroCard)}>
            <View style={themed($heroHeader)}>
              {routeUser.profilePicture ? (
                <Image source={{ uri: routeUser.profilePicture }} style={themed($avatar)} />
              ) : (
                <View style={themed($avatarFallback)}>
                  <Text text={username.charAt(0).toUpperCase()} preset="subheading" />
                </View>
              )}
              <View style={themed($heroCopy)}>
                <Text text={stream.title} preset="subheading" />
                <Pressable
                  onPress={handleProfilePress}
                  accessibilityRole="link"
                  accessibilityLabel={`View profile for ${username}`}
                  hitSlop={8}
                >
                  <Text text={`@${username}`} size="sm" weight="bold" style={themed($profileUsernameLink)} />
                </Pressable>
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

            {isOwnStream ? (
              <View style={themed($trackingCard)}>
                <Text text="Waypoint tracking" preset="formLabel" style={themed($trackingTitle)} />
                <Text
                  text={
                    tracking && activeTrackingStreamId === streamId
                      ? "Tracking is active for this stream."
                      : tracking && activeTrackingStreamId
                        ? `Tracking is active for another stream (${activeTrackingStreamId}).`
                        : "Tracking is currently stopped."
                  }
                  size="xs"
                  style={themed($subtleText)}
                />
                <Text
                  text={`Recorded on this device for this stream: ${localWaypoints.length}`}
                  size="xs"
                  style={themed($subtleText)}
                />
                {trackingError ? (
                  <Text text={trackingError} size="xs" style={themed($errorText)} />
                ) : null}
                {uploadError ? (
                  <Text text={uploadError} size="xs" style={themed($errorText)} />
                ) : null}
                <View style={themed($trackingButtons)}>
                  <Button
                    text={
                      tracking && activeTrackingStreamId === streamId
                        ? "Tracking active"
                        : "Start tracking this stream"
                    }
                    preset="filled"
                    onPress={() => void handleStartTracking()}
                    disabled={trackingBusy || (tracking && activeTrackingStreamId === streamId)}
                    style={themed($trackingButton)}
                  />
                  <Button
                    text="Stop tracking"
                    preset="default"
                    onPress={() => void handleStopTracking()}
                    disabled={trackingBusy || !tracking}
                    style={themed($trackingButton)}
                  />
                  <Button
                    text={uploadBusy ? "Uploading pending points..." : `Upload pending (${pendingWaypointCount})`}
                    preset="default"
                    onPress={() => void handleUploadPendingWaypoints()}
                    disabled={uploadBusy || pendingWaypointCount === 0}
                    style={themed($trackingButton)}
                  />
                  <Button
                    text="Log local points"
                    preset="default"
                    onPress={handleLogLocalWaypoints}
                    style={themed($trackingButton)}
                  />
                </View>
              </View>
            ) : null}
          </View>

          <View style={themed($section)}>
            <View style={themed($sectionHeader)}>
              <Text text="Map activity" preset="subheading" size="sm" />
              <Text
                text={`${mapWaypoints.length} points • ${syncedWaypointCount} synced • ${pendingWaypointCount} pending • ${postMarkers.length} posts`}
                size="xxs"
                style={themed($subtleText)}
              />
            </View>

            {hasMapData ? (
              <View style={themed($mapCard)}>
                <View style={themed($mapFrame)}>
                  <MapLibreMap
                    ref={streamMapRef}
                    initialCenter={initialCenter ?? undefined}
                    initialZoomLevel={initialZoomLevel}
                    trackCoordinates={trackCoordinates}
                    waypointMarkers={waypointMarkers}
                    onWaypointMarkerPress={(marker) => {
                      setSelectedMapPostMarker(null)
                      setSelectedMapWaypointMarker(marker)
                    }}
                    postMarkers={postMarkers}
                    onPostMarkerPress={(marker) => {
                      setSelectedMapWaypointMarker(null)
                      setSelectedMapPostMarker(marker)
                    }}
                    currentLocationMarker={currentLocationMarker}
                  />
                </View>
              </View>
            ) : (
              <View style={themed($emptyCard)}>
                <Text text="No waypoint or post locations are available for this stream yet." size="xs" />
              </View>
            )}
          </View>

          <LiveChatSection
            username={username}
            streamId={streamId}
            messages={chatMessages}
            nextToken={chatNextToken}
          />

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
                  <PostCard
                    key={`${post.userId}-${post.createdAt}`}
                    post={post}
                    onPressImage={(imageUrl) => setSelectedPostImageUrl(imageUrl)}
                  />
                ))}
              </View>
            )}
          </View>

          <Modal
            visible={Boolean(selectedMapWaypointMarker)}
            transparent
            animationType="fade"
            onRequestClose={() => setSelectedMapWaypointMarker(null)}
          >
            <Pressable
              style={themed($mapPostModalBackdrop)}
              onPress={() => setSelectedMapWaypointMarker(null)}
              accessibilityRole="button"
              accessibilityLabel="Close waypoint details"
            >
              {selectedMapWaypointMarker ? (
                <Pressable
                  style={themed($mapPostModalCard)}
                  onPress={(event) => event.stopPropagation()}
                  accessibilityRole="summary"
                  accessibilityLabel="Waypoint details"
                >
                  <Text text="Waypoint" size="xs" style={themed($mapPostModalBody)} />
                  {selectedMapWaypointMarker.recordedAt ? (
                    <Text
                      text={`Recorded ${selectedMapWaypointMarker.recordedAt}`}
                      size="xxs"
                      style={themed($mapPostModalMeta)}
                    />
                  ) : null}
                  {selectedMapWaypointMarker.locationLabel ? (
                    <Text
                      text={`Location ${selectedMapWaypointMarker.locationLabel}`}
                      size="xxs"
                      style={themed($mapPostModalMeta)}
                    />
                  ) : null}
                  <Text
                    text={`Source ${selectedMapWaypointMarker.source === "local" ? "This device" : "Stream data"}`}
                    size="xxs"
                    style={themed($mapPostModalMeta)}
                  />
                  {selectedMapWaypointMarker.synced === false ? (
                    <Text
                      text="Sync Pending upload"
                      size="xxs"
                      style={themed($mapPostModalMeta)}
                    />
                  ) : null}
                  {selectedMapWaypointMarker.altitude != null ? (
                    <Text
                      text={`Altitude ${selectedMapWaypointMarker.altitude.toFixed(1)} m`}
                      size="xxs"
                      style={themed($mapPostModalMeta)}
                    />
                  ) : null}
                  {selectedMapWaypointMarker.mileMarker != null ? (
                    <Text
                      text={`Distance ${formatDistance(selectedMapWaypointMarker.mileMarker, stream.unitOfMeasure)}`}
                      size="xxs"
                      style={themed($mapPostModalMeta)}
                    />
                  ) : null}
                  {selectedMapWaypointMarker.cumulativeVert != null ? (
                    <Text
                      text={`Vert ${selectedMapWaypointMarker.cumulativeVert.toFixed(1)} m`}
                      size="xxs"
                      style={themed($mapPostModalMeta)}
                    />
                  ) : null}
                  {selectedMapWaypointMarker.pointIndex != null ? (
                    <Text
                      text={`Point #${selectedMapWaypointMarker.pointIndex}`}
                      size="xxs"
                      style={themed($mapPostModalMeta)}
                    />
                  ) : null}
                </Pressable>
              ) : null}
            </Pressable>
          </Modal>

          <Modal
            visible={Boolean(selectedMapPostMarker)}
            transparent
            animationType="fade"
            onRequestClose={() => setSelectedMapPostMarker(null)}
          >
            <Pressable
              style={themed($mapPostModalBackdrop)}
              onPress={() => setSelectedMapPostMarker(null)}
              accessibilityRole="button"
              accessibilityLabel="Close post details"
            >
              {selectedMapPostMarker ? (
                <Pressable
                  style={themed($mapPostModalCard)}
                  onPress={(event) => event.stopPropagation()}
                  accessibilityRole="summary"
                  accessibilityLabel="Map post details"
                >
                  <Text text={selectedMapPostMarker.title} size="xs" style={themed($mapPostModalBody)} />
                  {selectedMapPostMarker.createdAt ? (
                    <Text
                      text={`Posted ${selectedMapPostMarker.createdAt}`}
                      size="xxs"
                      style={themed($mapPostModalMeta)}
                    />
                  ) : null}
                  {selectedMapPostMarker.locationLabel ? (
                    <Text
                      text={`Location ${selectedMapPostMarker.locationLabel}`}
                      size="xxs"
                      style={themed($mapPostModalMeta)}
                    />
                  ) : null}
                  {selectedMapPostMarker.photoUrl ? (
                    <Pressable
                      onPress={() => setSelectedPostImageUrl(selectedMapPostMarker.photoUrl ?? null)}
                      style={({ pressed }) => [
                        themed($mapPostModalImageFrame),
                        mapPostModalImageFrameDynamicStyle,
                        pressed && $mapPostModalImageFramePressed,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel="Open post photo full screen"
                    >
                      <Image
                        source={{ uri: selectedMapPostMarker.photoUrl }}
                        style={$mapPostModalImage}
                        resizeMode="contain"
                      />
                    </Pressable>
                  ) : null}
                </Pressable>
              ) : null}
            </Pressable>
          </Modal>

          <Modal
            visible={Boolean(selectedPostImageUrl)}
            transparent
            animationType="fade"
            onRequestClose={() => setSelectedPostImageUrl(null)}
          >
            <Pressable
              style={themed($postImageModalBackdrop)}
              onPress={() => setSelectedPostImageUrl(null)}
              accessibilityRole="button"
              accessibilityLabel="Close photo preview"
            >
              {selectedPostImageUrl ? (
                <Image source={{ uri: selectedPostImageUrl }} style={themed($postImageModalImage)} resizeMode="contain" />
              ) : null}
            </Pressable>
          </Modal>
        </>
      )}
    </Screen>
  )
}

const $postCard: ViewStyle = {
  borderWidth: 1,
  borderColor: "#D8DEE8",
  borderRadius: 18,
  padding: 16,
  gap: 10,
  backgroundColor: "#FFFFFF",
  shadowColor: "#0F172A",
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.08,
  shadowRadius: 16,
  elevation: 3,
}

const $postHeader: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 10,
}

const $postHeaderLeft: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  flexWrap: "wrap",
  gap: 8,
}

const $postText: TextStyle = {
  color: "#1F2937",
  lineHeight: 20,
}

const $postTimestamp: TextStyle = {
  color: "#6B7280",
}

const $postFooter: ViewStyle = {
  flexDirection: "row",
  flexWrap: "wrap",
  gap: 8,
}

const $postImageRow: ViewStyle = {
  gap: 10,
  paddingTop: 2,
}

const $postImageTile: ViewStyle = {
  width: 108,
  height: 132,
  borderRadius: 12,
  overflow: "hidden",
  backgroundColor: "#F8FAFC",
  borderWidth: 1,
  borderColor: "#E5E7EB",
}

const $postHeroImageFrame: ViewStyle = {
  width: "100%",
  height: 320,
  borderRadius: 16,
  overflow: "hidden",
  borderWidth: 1,
  borderColor: "#E5E7EB",
  backgroundColor: "#F8FAFC",
}

const $postImageTilePressed: ViewStyle = {
  opacity: 0.85,
}

const $postImage: ImageStyle = {
  width: "100%",
  height: "100%",
}

const $postTypePill: ViewStyle = {
  borderRadius: 999,
  paddingHorizontal: 10,
  paddingVertical: 4,
  backgroundColor: "#EEF2FF",
}

const $postTypePillText: TextStyle = {
  color: "#3730A3",
}

const $postMetaChip: ViewStyle = {
  borderRadius: 999,
  paddingHorizontal: 10,
  paddingVertical: 5,
  borderWidth: 1,
  borderColor: "#E5E7EB",
  backgroundColor: "#F9FAFB",
}

const $postMetaChipText: TextStyle = {
  color: "#4B5563",
}

const $postImageModalBackdrop: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flex: 1,
  backgroundColor: `${colors.palette.neutral900}E6`,
  alignItems: "center",
  justifyContent: "center",
  padding: 20,
})

const $postImageModalImage: ThemedStyle<ImageStyle> = () => ({
  width: "100%",
  height: "100%",
  maxHeight: "85%",
})

const $mapPostModalBackdrop: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flex: 1,
  backgroundColor: `${colors.palette.neutral900}99`,
  padding: 20,
  justifyContent: "center",
})

const $mapPostModalCard: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  borderRadius: 16,
  backgroundColor: colors.background,
  borderWidth: 1,
  borderColor: colors.palette.neutral300,
  padding: spacing.md,
  gap: spacing.xs,
})

const $mapPostModalHeading: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.text,
})

const $mapPostModalBody: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.text,
})

const $mapPostModalMeta: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
})

const $mapPostModalImageFrame: ThemedStyle<ViewStyle> = ({ colors }) => ({
  marginTop: 4,
  width: "100%",
  minHeight: 140,
  maxHeight: 320,
  borderRadius: 12,
  overflow: "hidden",
  borderWidth: 1,
  borderColor: colors.palette.neutral300,
  backgroundColor: colors.palette.neutral200,
})

const $mapPostModalImageFramePressed: ViewStyle = {
  opacity: 0.85,
}

const $mapPostModalImage: ImageStyle = {
  width: "100%",
  height: "100%",
}

const $screenContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing.md,
  paddingBottom: spacing.xxl,
  gap: spacing.md,
})

const $topActionsRow: ThemedStyle<ViewStyle> = () => ({
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

const $profileUsernameLink: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.tint,
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

const $mapActionButton: ThemedStyle<ViewStyle> = () => ({
  minHeight: 44,
  alignSelf: "flex-start",
})

const $trackingCard: ThemedStyle<ViewStyle> = ({ spacing, colors }) => ({
  borderWidth: 1,
  borderColor: colors.palette.neutral300,
  borderRadius: 16,
  padding: spacing.sm,
  gap: spacing.xs,
  backgroundColor: colors.background,
})

const $trackingTitle: ThemedStyle<TextStyle> = () => ({})

const $trackingButtons: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  flexWrap: "wrap",
  gap: spacing.sm,
})

const $trackingButton: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
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

const $postList: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  gap: spacing.sm,
})

const $subtleText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
})

// ── Chat styles ────────────────────────────────────────────────────────────────

const CHAT_SCROLL_HEIGHT = 280

const $chatCard: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  borderRadius: 20,
  overflow: "hidden",
  borderWidth: 1,
  borderColor: colors.palette.neutral300,
  backgroundColor: colors.background,
  paddingTop: spacing.md,
})

const $chatHeading: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.text,
  paddingHorizontal: 16,
  paddingBottom: 8,
})

const $chatScrollArea: ViewStyle = {
  height: CHAT_SCROLL_HEIGHT,
}

const $chatScrollContent: ViewStyle = {
  paddingHorizontal: 16,
  paddingBottom: 4,
}

const $chatEmpty: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
  paddingBottom: 8,
})

const $chatRow: ViewStyle = {
  flexDirection: "row",
  alignItems: "flex-start",
  gap: 10,
  paddingVertical: 10,
}

const $chatAvatar: ViewStyle = {
  width: 36,
  height: 36,
  borderRadius: 18,
  flexShrink: 0,
  overflow: "hidden",
}

const $chatAvatarImg: ImageStyle = {
  width: 36,
  height: 36,
  borderRadius: 18,
}

const $chatAvatarFallback: ThemedStyle<ViewStyle> = ({ colors }) => ({
  width: 36,
  height: 36,
  borderRadius: 18,
  backgroundColor: colors.palette.neutral300,
  alignItems: "center",
  justifyContent: "center",
})

const $chatAvatarFallbackText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
})

const $chatBubble: ViewStyle = {
  flex: 1,
  gap: 2,
}

const $chatByline: ViewStyle = {
  flexDirection: "row",
  alignItems: "baseline",
  gap: 8,
  flexWrap: "wrap",
}

const $chatUsername: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.text,
})

const $chatTimestamp: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
})

const $chatMessageText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.text,
})

const $chatFooter: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  borderTopWidth: 1,
  borderTopColor: colors.palette.neutral300,
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
  backgroundColor: colors.background,
})

const $chatInputRow: ViewStyle = {
  flexDirection: "row",
  alignItems: "flex-end",
  gap: 10,
}

const $chatInput: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flex: 1,
  minHeight: 40,
  maxHeight: 100,
  backgroundColor: colors.palette.neutral100,
  borderWidth: 1,
  borderColor: colors.palette.neutral300,
  borderRadius: 12,
  paddingHorizontal: 12,
  paddingVertical: 8,
  color: colors.text,
  fontSize: 13,
})

const $sendButton: ViewStyle = {
  height: 40,
  paddingHorizontal: 16,
  borderRadius: 12,
  backgroundColor: "#3b82f6",
  alignItems: "center",
  justifyContent: "center",
}

const $sendButtonDisabled: ViewStyle = {
  opacity: 0.45,
}

const $sendButtonPressed: ViewStyle = {
  opacity: 0.75,
}

const $sendButtonText: TextStyle = {
  color: "#ffffff",
}

const $guestRow: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  gap: 12,
}

const $guestText: ThemedStyle<TextStyle> = ({ colors }) => ({
  flex: 1,
  color: colors.textDim,
})

const $signInButton: ViewStyle = {
  backgroundColor: "#3b82f6",
  borderRadius: 12,
  paddingHorizontal: 18,
  paddingVertical: 10,
  alignItems: "center",
  justifyContent: "center",
}

const $signInButtonText: TextStyle = {
  color: "#ffffff",
}