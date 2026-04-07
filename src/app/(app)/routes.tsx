import { FC, useCallback, useEffect, useMemo, useState } from "react"
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  TextInput,
  TextStyle,
  View,
  ViewStyle,
} from "react-native"
import { useRouter } from "expo-router"

import { Button } from "@/components/Button"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import type { Route, RouteProcessingStatus } from "@/generated/schema"
import { useAuth } from "@/providers/AuthProvider"
import { deleteRoute, fetchUserProfileByUsername, recalibrateRoute } from "@/services/api/graphql"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

const statusColors: Record<RouteProcessingStatus, string> = {
  COMPLETED: "#10B981",
  PROCESSING: "#F59E0B",
  PENDING: "#6B7280",
  FAILED: "#EF4444",
  RECALIBRATING: "#F59E0B",
}

function getStatusColor(status: RouteProcessingStatus): string {
  return statusColors[status] || "#6B7280"
}

function formatDistance(route: Route) {
  if (route.uom === "METRIC") return `${(route.distanceInMiles * 1.60934).toFixed(2)} km`
  return `${route.distanceInMiles.toFixed(2)} mi`
}

function formatGain(route: Route) {
  if (route.uom === "METRIC") return `${Math.round(route.gainInFeet * 0.3048)} m gain`
  return `${route.gainInFeet.toFixed(0)} ft gain`
}

export const RoutesScreen: FC = function RoutesScreen() {
  const { themed } = useAppTheme()
  const router = useRouter()
  const { user, appUser } = useAuth()
  const [routes, setRoutes] = useState<Route[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showManageModal, setShowManageModal] = useState(false)
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null)
  const [targetDistance, setTargetDistance] = useState("")
  const [targetGain, setTargetGain] = useState("")

  const closeManageModal = useCallback(() => {
    setShowManageModal(false)
    setSelectedRoute(null)
    setTargetDistance("")
    setTargetGain("")
  }, [])

  const loadRoutes = useCallback(async () => {
    if (!appUser?.username) {
      setRoutes([])
      setLoading(false)
      return
    }

    try {
      const profile = await fetchUserProfileByUsername(appUser.username)
      const fetchedRoutes = (profile?.routes ?? []).filter((entry): entry is Route => Boolean(entry))
      setRoutes(fetchedRoutes)
    } catch (error) {
      console.error("Error loading routes:", error)
      Alert.alert("Error", "Could not fetch your routes.")
    } finally {
      setLoading(false)
    }
  }, [appUser?.username])

  useEffect(() => {
    void loadRoutes()
  }, [loadRoutes])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await loadRoutes()
    setRefreshing(false)
  }, [loadRoutes])

  const openManageModal = useCallback((route: Route) => {
    setSelectedRoute(route)
    setTargetDistance(route.distanceInMiles.toFixed(2))
    setTargetGain(String(route.gainInFeet))
    setShowManageModal(true)
  }, [])

  const handleOpenRoute = useCallback(
    (route: Route) => {
      if (!appUser?.username) return
      router.push(`/(app)/user/${appUser.username}/route/${route.routeId}`)
    },
    [appUser?.username, router],
  )

  const handleBackToMap = useCallback(() => {
    router.replace("/(app)/settings")
  }, [router])

  const handleRecalibrate = useCallback(async () => {
    if (!user || !appUser?.userId || !selectedRoute) {
      Alert.alert("Error", "You must be signed in to edit routes.")
      return
    }

    const parsedDistance = Number(targetDistance)
    const parsedGain = Number(targetGain)
    if (!Number.isFinite(parsedDistance) || !Number.isFinite(parsedGain)) {
      Alert.alert("Error", "Enter valid target distance and gain values.")
      return
    }

    setSaving(true)
    try {
      const idToken = await user.getIdToken()
      await recalibrateRoute(
        {
          createdAt: selectedRoute.createdAt,
          routeId: selectedRoute.routeId,
          targetDistanceInMiles: parsedDistance,
          targetGainInFeet: Math.round(parsedGain),
          userId: appUser.userId,
        },
        idToken,
      )
      closeManageModal()
      await loadRoutes()
    } catch (error) {
      console.error("Error recalibrating route:", error)
      Alert.alert("Error", "Failed to recalibrate route.")
    } finally {
      setSaving(false)
    }
  }, [appUser?.userId, closeManageModal, loadRoutes, selectedRoute, targetDistance, targetGain, user])

  const handleDeleteRoute = useCallback(() => {
    if (!selectedRoute || !user) return

    Alert.alert("Delete Route", `Delete ${selectedRoute.name}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const idToken = await user.getIdToken()
            const success = await deleteRoute(
              { createdAt: selectedRoute.createdAt, routeId: selectedRoute.routeId },
              idToken,
            )
            if (!success) throw new Error("Delete failed")
            closeManageModal()
            await loadRoutes()
          } catch (error) {
            console.error("Error deleting route:", error)
            Alert.alert("Error", "Failed to delete route.")
          }
        },
      },
    ])
  }, [closeManageModal, loadRoutes, selectedRoute, user])

  const sortedRoutes = useMemo(
    () =>
      routes
        .slice()
        .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()),
    [routes],
  )

  return (
    <Screen preset="fixed" safeAreaEdges={["top"]} contentContainerStyle={themed($container)}>
      <View style={themed($header)}>
        <View style={themed($headerRow)}>
          <Text preset="heading" text="Routes" />
          <Button
            text="Back to settings"
            preset="default"
            onPress={handleBackToMap}
            style={themed($backButton)}
          />
        </View>
      </View>

      <Button
        text="Upload Route"
        preset="filled"
        onPress={() => Alert.alert("Coming Soon", "Route upload wiring is still in progress.")}
        style={themed($uploadButton)}
      />

      <Modal visible={showManageModal} transparent animationType="slide" onRequestClose={closeManageModal}>
        <Screen preset="fixed" safeAreaEdges={["top"]} contentContainerStyle={themed($modalContainer)}>
          <View style={themed($modalHeader)}>
            <Text preset="heading" text={selectedRoute?.name ?? "Manage Route"} />
            <Pressable onPress={closeManageModal} accessibilityRole="button" accessibilityLabel="Close route editor">
              <Text text="✕" style={themed($closeButton)} />
            </Pressable>
          </View>

          <ScrollView style={themed($formContent)}>
            <View style={themed($infoCard)}>
              <Text text={`Status: ${selectedRoute?.processingStatus ?? "UNKNOWN"}`} size="sm" weight="medium" />
              {selectedRoute ? (
                <Text text={`${formatDistance(selectedRoute)} • ${formatGain(selectedRoute)}`} size="xs" style={themed($helperText)} />
              ) : null}
            </View>

            <View style={themed($formField)}>
              <Text text="Target Distance (miles)" size="sm" weight="medium" style={themed($label)} />
              <TextInput
                style={themed($textInput)}
                value={targetDistance}
                onChangeText={setTargetDistance}
                editable={!saving}
                keyboardType="decimal-pad"
                placeholder="e.g., 13.10"
                placeholderTextColor="#999"
              />
            </View>

            <View style={themed($formField)}>
              <Text text="Target Gain (feet)" size="sm" weight="medium" style={themed($label)} />
              <TextInput
                style={themed($textInput)}
                value={targetGain}
                onChangeText={setTargetGain}
                editable={!saving}
                keyboardType="number-pad"
                placeholder="e.g., 1500"
                placeholderTextColor="#999"
              />
            </View>

            <View style={themed($formActions)}>
              <Button
                text={saving ? "Saving..." : "Recalibrate Route"}
                preset="filled"
                onPress={handleRecalibrate}
                disabled={saving}
                style={themed($submitButton)}
              />
              <Button text="View Route" preset="default" onPress={() => selectedRoute && handleOpenRoute(selectedRoute)} />
            </View>

            <Button
              text="Delete Route"
              preset="reversed"
              onPress={handleDeleteRoute}
              disabled={saving}
              style={themed($deleteButton)}
            />
          </ScrollView>
        </Screen>
      </Modal>

      {loading ? (
        <View style={themed($centered)}>
          <ActivityIndicator />
        </View>
      ) : sortedRoutes.length === 0 ? (
        <View style={themed($centered)}>
          <Text size="sm">No routes yet</Text>
          <Text size="xs" style={themed($emptyText)}>
            Upload your first route to get started
          </Text>
        </View>
      ) : (
        <FlatList
          data={sortedRoutes}
          keyExtractor={(item) => item.routeId}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => handleOpenRoute(item)}
              onLongPress={() => openManageModal(item)}
              style={({ pressed }) => [themed($routeItem), pressed ? themed($routeItemPressed) : null]}
            >
              <View style={themed($itemHeader)}>
                <Text text={item.name || "Untitled Route"} weight="medium" numberOfLines={1} style={themed($routeName)} />
                <View style={[themed($statusBadge), { backgroundColor: getStatusColor(item.processingStatus as RouteProcessingStatus) }]}>
                  <Text size="xs" style={themed($statusText)}>
                    {item.processingStatus}
                  </Text>
                </View>
              </View>

              <View style={themed($routeDetails)}>
                <Text size="xs" style={themed($detailText)}>
                  {formatDistance(item)}
                </Text>
                <Text size="xs" style={themed($detailText)}>
                  {formatGain(item)}
                </Text>
              </View>

              <View style={themed($routeActions)}>
                <Button text="View" preset="default" onPress={() => handleOpenRoute(item)} style={themed($miniButton)} />
                <Button text="Manage" preset="filled" onPress={() => openManageModal(item)} style={themed($miniButton)} />
              </View>
            </Pressable>
          )}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={themed($listContent)}
        />
      )}
    </Screen>
  )
}

export default RoutesScreen

const $container: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flex: 1,
  padding: spacing.md,
})

const $header: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom: spacing.lg,
})

const $headerRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  gap: spacing.sm,
})

const $backButton: ThemedStyle<ViewStyle> = () => ({
  flexShrink: 1,
})

const $uploadButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom: spacing.md,
})

const $modalContainer: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flex: 1,
  backgroundColor: colors.background,
})

const $modalHeader: ThemedStyle<ViewStyle> = ({ spacing, colors }) => ({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.md,
  borderBottomWidth: 1,
  borderBottomColor: colors.palette?.neutral100,
})

const $closeButton: ThemedStyle<TextStyle> = ({ spacing }) => ({
  fontSize: 24,
  paddingHorizontal: spacing.sm,
})

const $formContent: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing.md,
})

const $infoCard: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  padding: spacing.md,
  borderRadius: 8,
  backgroundColor: colors.palette?.neutral100,
  marginBottom: spacing.lg,
  gap: spacing.xs,
})

const $formField: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom: spacing.lg,
})

const $label: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.text,
  marginBottom: 8,
})

const $textInput: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  borderWidth: 1,
  borderColor: colors.palette?.neutral200,
  borderRadius: 8,
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
  color: colors.text,
  fontSize: 16,
})

const $helperText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
})

const $formActions: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  gap: spacing.sm,
  marginTop: spacing.md,
  marginBottom: spacing.md,
})

const $submitButton: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
})

const $deleteButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom: spacing.xl,
})

const $centered: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  gap: spacing.sm,
})

const $emptyText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
})

const $listContent: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  gap: spacing.sm,
})

const $routeItem: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  padding: spacing.md,
  backgroundColor: colors.palette?.neutral100,
  borderRadius: 8,
})

const $routeItemPressed: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.palette?.neutral200,
})

const $itemHeader: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  gap: spacing.sm,
  marginBottom: spacing.sm,
})

const $routeName: ThemedStyle<TextStyle> = () => ({
  flex: 1,
})

const $statusBadge: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xs,
  borderRadius: 4,
})

const $statusText: ThemedStyle<TextStyle> = () => ({
  color: "#FFFFFF",
  fontWeight: "600",
})

const $routeDetails: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  gap: spacing.md,
  marginBottom: spacing.md,
})

const $detailText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
})

const $routeActions: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  gap: spacing.sm,
})

const $miniButton: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
})
