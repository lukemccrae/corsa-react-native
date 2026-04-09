import { FC, useCallback, useEffect, useMemo, useState } from "react"
import {
  ActivityIndicator,
  Image,
  ImageStyle,
  Pressable,
  RefreshControl,
  TextStyle,
  View,
  ViewStyle,
} from "react-native"
import { useRouter } from "expo-router"

import type { LiveStream, Route, RouteProcessingStatus, User } from "@/generated/schema"
import { Button } from "@/components/Button"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { translate } from "@/i18n/translate"
import { useAuth } from "@/providers/AuthProvider"
import { fetchUserProfileByUsername } from "@/services/api/graphql"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

interface UserProfileScreenProps {
  username: string
}

type ProfileTab = "livestreams" | "routes"

function formatDate(value: string | null | undefined) {
  if (!value) return null

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
  return uom === "METRIC" ? `${(feet * 0.3048).toFixed(0)} m gain` : `${feet.toFixed(0)} ft gain`
}

function getStreamStatus(stream: LiveStream): "live" | "upcoming" | "finished" {
  if (stream.startTime && new Date(stream.startTime) > new Date()) return "upcoming"
  if (stream.live) return "live"
  return "finished"
}

function getRouteStatusTone(status: RouteProcessingStatus) {
  switch (status) {
    case "COMPLETED":
      return "success"
    case "FAILED":
      return "danger"
    case "PROCESSING":
    case "RECALIBRATING":
      return "warning"
    default:
      return "muted"
  }
}

function StreamCard({
  stream,
  username,
  onPress,
}: {
  stream: LiveStream
  username: string
  onPress: () => void
}) {
  const status = getStreamStatus(stream)
  const formattedDate = formatDate(stream.startTime)

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [pressed && $pressedCard]}>
      <View style={$card}>
        <View style={$cardHeaderRow}>
          <Text text={stream.title} weight="medium" numberOfLines={1} style={$cardTitle} />
          <View
            style={[
              $statusPill,
              status === "live"
                ? $livePill
                : status === "upcoming"
                  ? $upcomingPill
                  : $finishedPill,
            ]}
          >
            <Text
              text={status === "live" ? "LIVE" : status === "upcoming" ? "UPCOMING" : "FINISHED"}
              size="xxs"
              weight="medium"
              style={$statusPillText}
            />
          </View>
        </View>

        <View style={$metaRow}>
          {formattedDate ? <Text text={formattedDate} size="xs" style={$metaText} /> : null}
          {stream.mileMarker != null ? (
            <Text
              text={formatDistance(stream.mileMarker, stream.unitOfMeasure)}
              size="xs"
              style={$metaText}
            />
          ) : null}
        </View>

        <Text text={`Open ${username}'s livestream`} size="xs" style={$actionText} />
      </View>
    </Pressable>
  )
}

function RouteCard({ route, onPress }: { route: Route; onPress: () => void }) {
  const statusTone = getRouteStatusTone(route.processingStatus)

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [pressed && $pressedCard]}>
      <View style={$card}>
        <View style={$cardHeaderRow}>
          <Text text={route.name} weight="medium" numberOfLines={1} style={$cardTitle} />
          {route.processingStatus !== "COMPLETED" ? (
            <View
              style={[
                $statusPill,
                statusTone === "danger"
                  ? $dangerPill
                  : statusTone === "warning"
                    ? $warningPill
                    : $mutedPill,
              ]}
            >
              <Text text={route.processingStatus} size="xxs" weight="medium" style={$statusPillText} />
            </View>
          ) : null}
        </View>

        <View style={$metaRow}>
          <Text text={formatDistance(route.distanceInMiles, route.uom)} size="xs" style={$metaText} />
          <Text text={formatGain(route.gainInFeet, route.uom)} size="xs" style={$metaText} />
        </View>
      </View>
    </Pressable>
  )
}

export const UserProfileScreen: FC<UserProfileScreenProps> = function UserProfileScreen({
  username,
}) {
  const { themed } = useAppTheme()
  const { appUser } = useAuth()
  const router = useRouter()

  const [profileUser, setProfileUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<ProfileTab>("livestreams")

  const loadProfile = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      try {
        const result = await fetchUserProfileByUsername(username)
        setProfileUser(result)
        setError(null)
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load profile")
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [username],
  )

  useEffect(() => {
    void loadProfile()
  }, [loadProfile])

  const isOwnProfile = appUser?.username === username
  const liveStreams = useMemo(
    () => (profileUser?.liveStreams ?? []).filter((stream): stream is LiveStream => Boolean(stream)),
    [profileUser],
  )
  const routes = useMemo(
    () => (profileUser?.routes ?? []).filter((route): route is Route => Boolean(route)),
    [profileUser],
  )

  return (
    <Screen
      preset="scroll"
      contentContainerStyle={themed($container)}
      accessibilityLabel={translate("userProfileScreen:viewProfile", { username })}
      ScrollViewProps={{
        refreshControl: <RefreshControl refreshing={refreshing} onRefresh={() => void loadProfile(true)} />,
      }}
    >
      <View style={themed($hero)}>
        {profileUser?.coverImagePath ? (
          <Image source={{ uri: profileUser.coverImagePath }} style={themed($coverImage)} />
        ) : (
          <View style={themed($coverFallback)} />
        )}

        <View style={themed($avatarShell)}>
          {profileUser?.profilePicture ? (
            <Image
              source={{ uri: profileUser.profilePicture }}
              style={themed($avatar)}
              accessibilityRole="image"
              accessibilityLabel={username}
            />
          ) : (
            <View style={themed($avatarFallback)} accessibilityRole="image" accessibilityLabel={username}>
              <Text text={username.charAt(0).toUpperCase()} preset="subheading" />
            </View>
          )}
        </View>
      </View>

      <View style={themed($headerContent)}>
        <View style={themed($titleRow)}>
          <View style={themed($titleCopy)}>
            <Text text={`@${username}`} preset="subheading" />
            {isOwnProfile ? <Text text="Your profile" size="xs" style={themed($subtleText)} /> : null}
          </View>
          <View style={themed($headerActions)}>
            {isOwnProfile ? (
              <Button
                text="Settings"
                preset="default"
                onPress={() => router.push("/(app)/settings")}
                style={themed($backButton)}
              />
            ) : null}
          </View>
        </View>

        <View style={themed($bioSection)}>
          <Text tx="userProfileScreen:bio" preset="formLabel" style={themed($bioLabel)} />
          <Text
            text={profileUser?.bio || undefined}
            tx={profileUser?.bio ? undefined : "userProfileScreen:noBio"}
            style={themed($bioText)}
          />
        </View>

        <View style={themed($countsRow)}>
          <View style={themed($countBlock)}>
            <Text text={String(liveStreams.length)} weight="medium" />
            <Text text="Livestreams" size="xs" style={themed($subtleText)} />
          </View>
          <View style={themed($countBlock)}>
            <Text text={String(routes.length)} weight="medium" />
            <Text text="Routes" size="xs" style={themed($subtleText)} />
          </View>
        </View>
      </View>

      {loading ? (
        <View style={themed($stateBlock)}>
          <ActivityIndicator />
          <Text text="Loading profile..." size="xs" style={themed($subtleText)} />
        </View>
      ) : error ? (
        <View style={themed($stateBlock)}>
          <Text text={error} size="xs" style={themed($errorText)} />
          <Button text="Try again" onPress={() => void loadProfile()} style={themed($retryButton)} />
        </View>
      ) : !profileUser ? (
        <View style={themed($stateBlock)}>
          <Text text="Profile not found" preset="subheading" />
        </View>
      ) : (
        <>
          <View style={themed($tabRow)}>
            <Pressable onPress={() => setActiveTab("livestreams")} style={themed($tabButtonWrap)}>
              <View
                style={themed([
                  $tabButton,
                  activeTab === "livestreams" ? $tabButtonActive : $tabButtonInactive,
                ])}
              >
                <Text
                  text="Livestreams"
                  weight="medium"
                  size="xs"
                  style={themed(activeTab === "livestreams" ? $tabTextActive : $tabTextInactive)}
                />
              </View>
            </Pressable>
            <Pressable onPress={() => setActiveTab("routes")} style={themed($tabButtonWrap)}>
              <View
                style={themed([
                  $tabButton,
                  activeTab === "routes" ? $tabButtonActive : $tabButtonInactive,
                ])}
              >
                <Text
                  text="Routes"
                  weight="medium"
                  size="xs"
                  style={themed(activeTab === "routes" ? $tabTextActive : $tabTextInactive)}
                />
              </View>
            </Pressable>
          </View>

          <View style={themed($list)}>
            {activeTab === "livestreams"
              ? liveStreams.map((stream) => (
                  <StreamCard
                    key={stream.streamId}
                    stream={stream}
                    username={username}
                    onPress={() => router.push(`/(app)/user/${username}/stream/${stream.streamId}`)}
                  />
                ))
              : routes.map((route) => (
                  <RouteCard
                    key={route.routeId}
                    route={route}
                    onPress={() => router.push(`/(app)/user/${username}/route/${route.routeId}`)}
                  />
                ))}

            {activeTab === "livestreams" && liveStreams.length === 0 ? (
              <View style={themed($emptyState)}>
                <Text text="No livestreams yet." style={themed($subtleText)} />
              </View>
            ) : null}

            {activeTab === "routes" && routes.length === 0 ? (
              <View style={themed($emptyState)}>
                <Text text="No routes yet." style={themed($subtleText)} />
              </View>
            ) : null}
          </View>
        </>
      )}
    </Screen>
  )
}

const $card: ViewStyle = {
  borderWidth: 1,
  borderColor: "#D4D7DD",
  borderRadius: 16,
  padding: 16,
  gap: 12,
  backgroundColor: "#FFFFFF",
}

const $pressedCard: ViewStyle = {
  opacity: 0.84,
}

const $cardHeaderRow: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
}

const $cardTitle: TextStyle = {
  flex: 1,
}

const $metaRow: ViewStyle = {
  flexDirection: "row",
  flexWrap: "wrap",
  gap: 12,
}

const $metaText: TextStyle = {
  color: "#5B6472",
}

const $actionText: TextStyle = {
  color: "#3D6C8C",
}

const $statusPill: ViewStyle = {
  borderRadius: 999,
  paddingHorizontal: 10,
  paddingVertical: 4,
}

const $statusPillText: TextStyle = {
  color: "#FFFFFF",
}

const $livePill: ViewStyle = { backgroundColor: "#C43D3D" }
const $upcomingPill: ViewStyle = { backgroundColor: "#3D6C8C" }
const $finishedPill: ViewStyle = { backgroundColor: "#7A818C" }
const $warningPill: ViewStyle = { backgroundColor: "#A26720" }
const $dangerPill: ViewStyle = { backgroundColor: "#B54848" }
const $mutedPill: ViewStyle = { backgroundColor: "#7A818C" }

const $container: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingBottom: spacing.xxl,
})

const $hero: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  margin: spacing.md,
  marginBottom: 0,
})

const $coverImage: ThemedStyle<ImageStyle> = () => ({
  width: "100%",
  height: 180,
  borderRadius: 24,
})

const $coverFallback: ThemedStyle<ViewStyle> = ({ colors }) => ({
  width: "100%",
  height: 180,
  borderRadius: 24,
  backgroundColor: colors.palette.neutral200,
})

const $avatarShell: ThemedStyle<ViewStyle> = ({ colors }) => ({
  marginTop: -42,
  marginLeft: 20,
  width: 108,
  height: 108,
  borderRadius: 54,
  backgroundColor: colors.background,
  alignItems: "center",
  justifyContent: "center",
})

const $avatar: ThemedStyle<ImageStyle> = () => ({
  width: 96,
  height: 96,
  borderRadius: 48,
})

const $avatarFallback: ThemedStyle<ViewStyle> = ({ colors }) => ({
  width: 96,
  height: 96,
  borderRadius: 48,
  backgroundColor: colors.palette.neutral300,
  alignItems: "center",
  justifyContent: "center",
})

const $headerContent: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.md,
  gap: spacing.md,
})

const $titleRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: spacing.md,
})

const $titleCopy: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flex: 1,
  gap: spacing.xxs,
})

const $headerActions: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  gap: spacing.xs,
})

const $backButton: ThemedStyle<ViewStyle> = () => ({
  minWidth: 132,
  minHeight: 44,
})

const $bioSection: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  gap: spacing.xxs,
})

const $bioLabel: ThemedStyle<TextStyle> = () => ({})

const $bioText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
})

const $countsRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  gap: spacing.lg,
})

const $countBlock: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  gap: spacing.xxxs,
})

const $subtleText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
})

const $errorText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.error,
  textAlign: "center",
})

const $stateBlock: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.lg,
  paddingVertical: spacing.xl,
  alignItems: "center",
  gap: spacing.sm,
})

const $retryButton: ThemedStyle<ViewStyle> = () => ({
  minWidth: 140,
})

const $tabRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  gap: spacing.sm,
  paddingHorizontal: spacing.md,
  marginTop: spacing.md,
})

const $tabButtonWrap: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
})

const $tabButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  borderRadius: 999,
  paddingVertical: spacing.sm,
  alignItems: "center",
})

const $tabButtonActive: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.palette.neutral900,
})

const $tabButtonInactive: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.palette.neutral200,
})

const $tabTextActive: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.palette.neutral100,
})

const $tabTextInactive: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.text,
})

const $list: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  gap: spacing.sm,
  paddingHorizontal: spacing.md,
  paddingTop: spacing.md,
})

const $emptyState: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingVertical: spacing.xl,
  alignItems: "center",
})

