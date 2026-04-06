import { FC, useEffect, useMemo, useState } from "react"
import { ActivityIndicator, Image, ImageStyle, TextStyle, View, ViewStyle } from "react-native"
import { useRouter } from "expo-router"

import type { ChatMessage, LiveStream, User } from "@/generated/schema"
import { Button } from "@/components/Button"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
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

function ChatMessageItem({ message }: { message: ChatMessage }) {
  return (
    <View style={$chatCard}>
      <Text text={message.publicUser?.username || "Supporter"} weight="medium" size="xs" />
      <Text text={message.text || ""} size="xs" style={$chatText} />
      <Text text={formatDateTime(message.createdAt) || ""} size="xxs" style={$chatMeta} />
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
            <Text text="Chat" preset="subheading" size="sm" />
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

const $chatList: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  gap: spacing.sm,
})

const $subtleText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
})