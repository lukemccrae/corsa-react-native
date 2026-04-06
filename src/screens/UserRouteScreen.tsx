import { FC, useEffect, useState } from "react"
import { ActivityIndicator, Image, ImageStyle, TextStyle, View, ViewStyle } from "react-native"
import { useRouter } from "expo-router"

import type { Route, User } from "@/generated/schema"
import { Button } from "@/components/Button"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { fetchUserRouteById } from "@/services/api/graphql"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

interface UserRouteScreenProps {
  username: string
  routeId: string
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Unknown"

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
  return uom === "METRIC" ? `${(feet * 0.3048).toFixed(0)} m` : `${feet.toFixed(0)} ft`
}

export const UserRouteScreen: FC<UserRouteScreenProps> = function UserRouteScreen({
  username,
  routeId,
}) {
  const { themed } = useAppTheme()
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [route, setRoute] = useState<Route | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    void (async () => {
      try {
        const result = await fetchUserRouteById(username, routeId)
        if (!isMounted) return

        setUser(result?.user ?? null)
        setRoute(result?.route ?? null)
        setError(null)
      } catch (loadError) {
        if (!isMounted) return
        setError(loadError instanceof Error ? loadError.message : "Failed to load route")
      } finally {
        if (isMounted) setLoading(false)
      }
    })()

    return () => {
      isMounted = false
    }
  }, [routeId, username])

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
      ) : !user || !route ? (
        <View style={themed($stateBlock)}>
          <Text text="Route not found" preset="subheading" />
        </View>
      ) : (
        <View style={themed($routeCard)}>
          <View style={themed($headerRow)}>
            {user.profilePicture ? (
              <Image source={{ uri: user.profilePicture }} style={themed($avatar)} />
            ) : (
              <View style={themed($avatarFallback)}>
                <Text text={username.charAt(0).toUpperCase()} preset="subheading" />
              </View>
            )}
            <View style={themed($headerCopy)}>
              <Text text={route.name} preset="subheading" />
              <Text text={`by @${username}`} size="xs" style={themed($subtleText)} />
            </View>
          </View>

          <View style={themed($statGrid)}>
            <View style={themed($statBlock)}>
              <Text text="Distance" size="xxs" style={themed($subtleText)} />
              <Text text={formatDistance(route.distanceInMiles, route.uom)} size="xs" />
            </View>
            <View style={themed($statBlock)}>
              <Text text="Elevation gain" size="xxs" style={themed($subtleText)} />
              <Text text={formatGain(route.gainInFeet, route.uom)} size="xs" />
            </View>
            <View style={themed($statBlock)}>
              <Text text="Status" size="xxs" style={themed($subtleText)} />
              <Text text={route.processingStatus} size="xs" />
            </View>
            <View style={themed($statBlock)}>
              <Text text="Created" size="xxs" style={themed($subtleText)} />
              <Text text={formatDate(route.createdAt)} size="xs" />
            </View>
          </View>
        </View>
      )}
    </Screen>
  )
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

const $routeCard: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  borderRadius: 24,
  borderWidth: 1,
  borderColor: colors.palette.neutral300,
  backgroundColor: colors.background,
  padding: spacing.lg,
  gap: spacing.lg,
})

const $headerRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.sm,
})

const $headerCopy: ThemedStyle<ViewStyle> = ({ spacing }) => ({
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

const $statGrid: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  flexWrap: "wrap",
  gap: spacing.md,
})

const $statBlock: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  minWidth: "46%",
  gap: spacing.xxxs,
})

const $subtleText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
})