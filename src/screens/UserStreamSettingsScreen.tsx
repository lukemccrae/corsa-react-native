import { FC, useCallback, useEffect, useMemo, useState } from "react"
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Switch,
  TextInput,
  TextStyle,
  View,
  ViewStyle,
} from "react-native"
import { useRouter } from "expo-router"

import { Button } from "@/components/Button"
import { Icon } from "@/components/Icon"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import type { Device, LiveStream, Route, User } from "@/generated/schema"
import { useAuth } from "@/providers/AuthProvider"
import { fetchUserProfileByUsername, upsertLiveStream } from "@/services/api/graphql"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

interface UserStreamSettingsScreenProps {
  username: string
  streamId: string
}

const TIMEZONE_OPTIONS = [
  "UTC",
  "America/Los_Angeles",
  "America/Denver",
  "America/Chicago",
  "America/New_York",
  "Europe/London",
  "Europe/Paris",
  "Asia/Tokyo",
  "Australia/Sydney",
]

function buildDefaultLocation(stream: LiveStream) {
  if (stream.currentLocation) {
    return {
      lat: stream.currentLocation.lat,
      lng: stream.currentLocation.lng,
    }
  }

  return { lat: 0, lng: 0 }
}

function formatDeviceLabel(device: Device) {
  const name = device.name?.trim()
  const makeModel = [device.make, device.model].filter(Boolean).join(" ").trim()
  if (name && makeModel) return `${name} • ${makeModel}`
  if (name) return name
  if (makeModel) return makeModel
  return "Unnamed device"
}

function formatRouteLabel(route: Route) {
  return route.name?.trim() || "Untitled route"
}

function formatStartTimeInput(value: string | null | undefined) {
  if (!value) return ""

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value

  const year = parsed.getFullYear()
  const month = String(parsed.getMonth() + 1).padStart(2, "0")
  const day = String(parsed.getDate()).padStart(2, "0")
  const hours = String(parsed.getHours()).padStart(2, "0")
  const minutes = String(parsed.getMinutes()).padStart(2, "0")

  return `${year}-${month}-${day} ${hours}:${minutes}`
}

function parseStartTimeInput(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return null

  const normalized = trimmed.replace(" ", "T")
  const parsed = new Date(normalized)
  if (Number.isNaN(parsed.getTime())) return null

  return parsed.toISOString()
}

export const UserStreamSettingsScreen: FC<UserStreamSettingsScreenProps> = function UserStreamSettingsScreen({
  username,
  streamId,
}) {
  const { themed } = useAppTheme()
  const { user, appUser } = useAuth()
  const router = useRouter()

  const [profileUser, setProfileUser] = useState<User | null>(null)
  const [stream, setStream] = useState<LiveStream | null>(null)
  const [title, setTitle] = useState("")
  const [timezone, setTimezone] = useState("")
  const [live, setLive] = useState(false)
  const [published, setPublished] = useState(true)
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null)
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null)
  const [startTimeText, setStartTimeText] = useState("")
  const [deviceDropdownVisible, setDeviceDropdownVisible] = useState(false)
  const [routeDropdownVisible, setRouteDropdownVisible] = useState(false)
  const [timezoneDropdownVisible, setTimezoneDropdownVisible] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isOwnStream = useMemo(() => {
    const normalizedProfileUsername = username.trim().toLowerCase()
    const normalizedCurrentUsername = appUser?.username?.trim().toLowerCase()
    return Boolean(normalizedCurrentUsername) && normalizedCurrentUsername === normalizedProfileUsername
  }, [appUser?.username, username])

  const loadStream = useCallback(async () => {
    try {
      const result = await fetchUserProfileByUsername(username)
      const matchedStream =
        (result?.liveStreams ?? []).find((entry) => entry?.streamId === streamId) ?? null

      setProfileUser(result)
      setStream(matchedStream)
      setTitle(matchedStream?.title ?? "")
      setTimezone(matchedStream?.timezone ?? "")
      setLive(Boolean(matchedStream?.live))
      setPublished(matchedStream?.published !== false)
      setSelectedDeviceId(matchedStream?.device?.deviceId ?? null)
      setSelectedRouteId(matchedStream?.route?.routeId ?? null)
      setStartTimeText(formatStartTimeInput(matchedStream?.startTime))
      setError(null)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load stream settings")
    } finally {
      setLoading(false)
    }
  }, [streamId, username])

  useEffect(() => {
    void loadStream()
  }, [loadStream])

  const devices = useMemo(
    () => (profileUser?.devices ?? []).filter((entry): entry is Device => Boolean(entry)),
    [profileUser],
  )

  const routes = useMemo(
    () => (profileUser?.routes ?? []).filter((entry): entry is Route => Boolean(entry)),
    [profileUser],
  )

  const selectedDevice = useMemo(
    () => devices.find((device) => device.deviceId === selectedDeviceId) ?? null,
    [devices, selectedDeviceId],
  )

  const selectedRoute = useMemo(
    () => routes.find((route) => route.routeId === selectedRouteId) ?? null,
    [routes, selectedRouteId],
  )

  const handleCancel = useCallback(() => {
    router.replace(`/(app)/user/${username}/stream/${streamId}`)
  }, [router, streamId, username])

  const handleSave = useCallback(async () => {
    if (!title.trim()) {
      setError("Title is required.")
      return
    }

    const parsedStartTime = parseStartTimeInput(startTimeText)
    if (!parsedStartTime) {
      setError("Enter a valid start time in YYYY-MM-DD HH:mm format.")
      return
    }

    if (!isOwnStream || !user || !profileUser || !stream) {
      Alert.alert("Error", "You can only edit your own livestream.")
      return
    }

    setSaving(true)
    setError(null)

    try {
      const idToken = await user.getIdToken()
      const result = await upsertLiveStream(
        {
          streamId: stream.streamId,
          userId: profileUser.userId,
          username: profileUser.username,
          title: title.trim(),
          startTime: parsedStartTime,
          finishTime: stream.finishTime ?? undefined,
          live,
          published,
          delayInSeconds: stream.delayInSeconds ?? undefined,
          deviceId: selectedDeviceId ?? undefined,
          routeId: selectedRouteId ?? undefined,
          unitOfMeasure: stream.unitOfMeasure ?? undefined,
          timezone: timezone.trim() || undefined,
          slug: stream.slug ?? undefined,
          sponsors: stream.sponsors ?? undefined,
          currentLocation:
            selectedDevice?.lastLocation != null
              ? {
                  lat: selectedDevice.lastLocation.lat,
                  lng: selectedDevice.lastLocation.lng,
                }
              : buildDefaultLocation(stream),
        },
        idToken,
      )

      if (!result.success) {
        throw new Error(result.message ?? "Failed to update livestream")
      }

      router.replace(`/(app)/user/${username}/stream/${streamId}`)
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "Failed to update livestream"
      setError(message)
      Alert.alert("Error", message)
    } finally {
      setSaving(false)
    }
  }, [
    devices,
    isOwnStream,
    live,
    profileUser,
    published,
    router,
    selectedDeviceId,
    selectedRouteId,
    startTimeText,
    stream,
    streamId,
    timezone,
    title,
    user,
    username,
  ])

  return (
    <Screen preset="scroll" safeAreaEdges={["top"]} contentContainerStyle={themed($container)}>
      <View style={themed($header)}>
        <Text text="Livestream settings" preset="heading" />
        <Text
          text={isOwnStream ? "Update how this livestream appears and behaves." : "This stream can only be edited by its owner."}
          size="xs"
          style={themed($subtleText)}
        />
      </View>

      {loading ? (
        <View style={themed($stateBlock)}>
          <ActivityIndicator />
        </View>
      ) : error && !stream ? (
        <View style={themed($stateBlock)}>
          <Text text={error} size="xs" style={themed($errorText)} />
          <Button text="Back" preset="default" onPress={handleCancel} />
        </View>
      ) : !stream ? (
        <View style={themed($stateBlock)}>
          <Text text="Stream not found" preset="subheading" />
          <Button text="Back" preset="default" onPress={handleCancel} />
        </View>
      ) : !isOwnStream ? (
        <View style={themed($stateBlock)}>
          <Text text="You can only edit your own livestream." size="xs" style={themed($errorText)} />
          <Button text="Back to stream" preset="default" onPress={handleCancel} />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={themed($formContent)}>
          <View style={themed($infoCard)}>
            <Text text={stream.title} weight="medium" />
            <Text text={`Started ${new Date(stream.startTime).toLocaleString()}`} size="xs" style={themed($subtleText)} />
            {stream.route?.name ? (
              <Text text={`Route ${stream.route.name}`} size="xs" style={themed($subtleText)} />
            ) : null}
          </View>

          <View style={themed($field)}>
            <Text text="Title" size="sm" weight="medium" style={themed($label)} />
            <TextInput
              style={themed($textInput)}
              value={title}
              onChangeText={setTitle}
              editable={!saving}
              placeholder="Livestream title"
              placeholderTextColor="#94A3B8"
            />
          </View>

          <View style={themed($field)}>
            <Text text="Timezone" size="sm" weight="medium" style={themed($label)} />
            <Pressable
              onPress={() => setTimezoneDropdownVisible(true)}
              style={({ pressed }) => [themed($dropdownField), pressed ? themed($dropdownFieldPressed) : null]}
              accessibilityRole="button"
              accessibilityLabel="Open timezone selector"
            >
              <View style={themed($dropdownValueCopy)}>
                <Text text={timezone || "Select timezone"} size="sm" weight="medium" style={themed($dropdownValueText)} />
                <Text text="Used for the stream schedule and viewers." size="xxs" style={themed($dropdownHelperText)} />
              </View>
              <Icon icon="caretRight" size={18} containerStyle={themed($dropdownIconWrap)} />
            </Pressable>
          </View>

          <View style={themed($field)}>
            <Text text="Start time" size="sm" weight="medium" style={themed($label)} />
            <TextInput
              style={themed($textInput)}
              value={startTimeText}
              onChangeText={setStartTimeText}
              editable={!saving}
              placeholder="YYYY-MM-DD HH:mm"
              autoCapitalize="none"
              autoCorrect={false}
              placeholderTextColor="#94A3B8"
            />
            <Text text="Use local time in YYYY-MM-DD HH:mm format." size="xxs" style={themed($subtleText)} />
          </View>

          <View style={themed($field)}>
            <Text text="Device" size="sm" weight="medium" style={themed($label)} />
            <Pressable
              onPress={() => setDeviceDropdownVisible(true)}
              style={({ pressed }) => [themed($dropdownField), pressed ? themed($dropdownFieldPressed) : null]}
              accessibilityRole="button"
              accessibilityLabel="Open device selector"
            >
              <View style={themed($dropdownValueCopy)}>
                <Text
                  text={selectedDevice ? formatDeviceLabel(selectedDevice) : "No device"}
                  size="sm"
                  weight="medium"
                  style={themed($dropdownValueText)}
                />
                <Text
                  text={selectedDevice ? "Linked device" : "No device linked to this livestream"}
                  size="xxs"
                  style={themed($dropdownHelperText)}
                />
              </View>
              <Icon icon="caretRight" size={18} containerStyle={themed($dropdownIconWrap)} />
            </Pressable>
          </View>

          <View style={themed($field)}>
            <Text text="Route" size="sm" weight="medium" style={themed($label)} />
            <Pressable
              onPress={() => setRouteDropdownVisible(true)}
              style={({ pressed }) => [themed($dropdownField), pressed ? themed($dropdownFieldPressed) : null]}
              accessibilityRole="button"
              accessibilityLabel="Open route selector"
            >
              <View style={themed($dropdownValueCopy)}>
                <Text
                  text={selectedRoute ? formatRouteLabel(selectedRoute) : "No route"}
                  size="sm"
                  weight="medium"
                  style={themed($dropdownValueText)}
                />
                <Text
                  text={selectedRoute ? "Linked route" : "No route linked to this livestream"}
                  size="xxs"
                  style={themed($dropdownHelperText)}
                />
              </View>
              <Icon icon="caretRight" size={18} containerStyle={themed($dropdownIconWrap)} />
            </Pressable>
          </View>

          <View style={themed($toggleCard)}>
            <View style={themed($toggleRow)}>
              <View style={themed($toggleCopy)}>
                <Text text="Live" weight="medium" />
                <Text text="Show the stream as actively broadcasting." size="xs" style={themed($subtleText)} />
              </View>
              <Switch value={live} onValueChange={setLive} disabled={saving} />
            </View>

            <View style={themed($toggleDivider)} />

            <View style={themed($toggleRow)}>
              <View style={themed($toggleCopy)}>
                <Text text="Published" weight="medium" />
                <Text text="Allow other users to discover this livestream." size="xs" style={themed($subtleText)} />
              </View>
              <Switch value={published} onValueChange={setPublished} disabled={saving} />
            </View>
          </View>

          {error ? <Text text={error} size="xs" style={themed($errorText)} /> : null}

          <View style={themed($actions)}>
            <Button
              text={saving ? "Saving..." : "Save changes"}
              preset="filled"
              onPress={() => void handleSave()}
              disabled={saving}
              style={themed($actionButton)}
            />
            <Button text="Cancel" preset="default" onPress={handleCancel} disabled={saving} style={themed($actionButton)} />
          </View>
        </ScrollView>
      )}

      <Modal
        visible={deviceDropdownVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDeviceDropdownVisible(false)}
      >
        <Pressable
          style={themed($dropdownBackdrop)}
          onPress={() => setDeviceDropdownVisible(false)}
          accessibilityRole="button"
          accessibilityLabel="Close device selector"
        >
          <Pressable style={themed($dropdownSheet)} onPress={(event) => event.stopPropagation()}>
            <View style={themed($dropdownSheetHeader)}>
              <Text text="Select device" preset="subheading" size="sm" />
              <Text text="This updates the livestream deviceId." size="xs" style={themed($subtleText)} />
            </View>

            <ScrollView style={themed($deviceList)} contentContainerStyle={themed($deviceListContent)}>
              <Pressable
                onPress={() => {
                  setSelectedDeviceId(null)
                  setDeviceDropdownVisible(false)
                }}
                style={({ pressed }) => [
                  themed($deviceOption),
                  selectedDeviceId == null ? themed($deviceOptionSelected) : null,
                  pressed ? themed($deviceOptionPressed) : null,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Choose no device"
              >
                <Text
                  text="No device"
                  size="xs"
                  weight="medium"
                  style={themed(selectedDeviceId == null ? $deviceOptionTextSelected : $deviceOptionText)}
                />
                <Text
                  text="Clear the livestream deviceId"
                  size="xxs"
                  style={themed(selectedDeviceId == null ? $deviceOptionSubtleTextSelected : $deviceOptionSubtleText)}
                />
              </Pressable>

              {devices.map((device) => {
                const selected = device.deviceId === selectedDeviceId

                return (
                  <Pressable
                    key={device.deviceId}
                    onPress={() => {
                      setSelectedDeviceId(device.deviceId)
                      setDeviceDropdownVisible(false)
                    }}
                    style={({ pressed }) => [
                      themed($deviceOption),
                      selected ? themed($deviceOptionSelected) : null,
                      pressed ? themed($deviceOptionPressed) : null,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`Choose device ${formatDeviceLabel(device)}`}
                  >
                    <Text
                      text={formatDeviceLabel(device)}
                      size="xs"
                      weight="medium"
                      style={themed(selected ? $deviceOptionTextSelected : $deviceOptionText)}
                    />
                    <Text
                      text={device.make ? `${device.make}${device.model ? ` ${device.model}` : ""}` : "Unknown device"}
                      size="xxs"
                      style={themed(selected ? $deviceOptionSubtleTextSelected : $deviceOptionSubtleText)}
                    />
                  </Pressable>
                )
              })}
            </ScrollView>

            <Button text="Done" preset="default" onPress={() => setDeviceDropdownVisible(false)} />
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={routeDropdownVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRouteDropdownVisible(false)}
      >
        <Pressable
          style={themed($dropdownBackdrop)}
          onPress={() => setRouteDropdownVisible(false)}
          accessibilityRole="button"
          accessibilityLabel="Close route selector"
        >
          <Pressable style={themed($dropdownSheet)} onPress={(event) => event.stopPropagation()}>
            <View style={themed($dropdownSheetHeader)}>
              <Text text="Select route" preset="subheading" size="sm" />
              <Text text="This updates the livestream routeId." size="xs" style={themed($subtleText)} />
            </View>

            <ScrollView style={themed($deviceList)} contentContainerStyle={themed($deviceListContent)}>
              <Pressable
                onPress={() => {
                  setSelectedRouteId(null)
                  setRouteDropdownVisible(false)
                }}
                style={({ pressed }) => [
                  themed($deviceOption),
                  selectedRouteId == null ? themed($deviceOptionSelected) : null,
                  pressed ? themed($deviceOptionPressed) : null,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Choose no route"
              >
                <Text
                  text="No route"
                  size="xs"
                  weight="medium"
                  style={themed(selectedRouteId == null ? $deviceOptionTextSelected : $deviceOptionText)}
                />
                <Text
                  text="Clear the livestream routeId"
                  size="xxs"
                  style={themed(selectedRouteId == null ? $deviceOptionSubtleTextSelected : $deviceOptionSubtleText)}
                />
              </Pressable>

              {routes.map((route) => {
                const selected = route.routeId === selectedRouteId

                return (
                  <Pressable
                    key={route.routeId}
                    onPress={() => {
                      setSelectedRouteId(route.routeId)
                      setRouteDropdownVisible(false)
                    }}
                    style={({ pressed }) => [
                      themed($deviceOption),
                      selected ? themed($deviceOptionSelected) : null,
                      pressed ? themed($deviceOptionPressed) : null,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`Choose route ${formatRouteLabel(route)}`}
                  >
                    <Text
                      text={formatRouteLabel(route)}
                      size="xs"
                      weight="medium"
                      style={themed(selected ? $deviceOptionTextSelected : $deviceOptionText)}
                    />
                    <Text
                      text={`${route.distanceInMiles.toFixed(2)} mi • +${route.gainInFeet.toFixed(0)} ft`}
                      size="xxs"
                      style={themed(selected ? $deviceOptionSubtleTextSelected : $deviceOptionSubtleText)}
                    />
                  </Pressable>
                )
              })}
            </ScrollView>

            <Button text="Done" preset="default" onPress={() => setRouteDropdownVisible(false)} />
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={timezoneDropdownVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setTimezoneDropdownVisible(false)}
      >
        <Pressable
          style={themed($dropdownBackdrop)}
          onPress={() => setTimezoneDropdownVisible(false)}
          accessibilityRole="button"
          accessibilityLabel="Close timezone selector"
        >
          <Pressable style={themed($dropdownSheet)} onPress={(event) => event.stopPropagation()}>
            <View style={themed($dropdownSheetHeader)}>
              <Text text="Select timezone" preset="subheading" size="sm" />
              <Text text="This replaces manual timezone typing." size="xs" style={themed($subtleText)} />
            </View>

            <ScrollView style={themed($deviceList)} contentContainerStyle={themed($deviceListContent)}>
              {TIMEZONE_OPTIONS.map((option) => {
                const selected = option === timezone

                return (
                  <Pressable
                    key={option}
                    onPress={() => {
                      setTimezone(option)
                      setTimezoneDropdownVisible(false)
                    }}
                    style={({ pressed }) => [
                      themed($deviceOption),
                      selected ? themed($deviceOptionSelected) : null,
                      pressed ? themed($deviceOptionPressed) : null,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`Choose timezone ${option}`}
                  >
                    <Text
                      text={option}
                      size="xs"
                      weight="medium"
                      style={themed(selected ? $deviceOptionTextSelected : $deviceOptionText)}
                    />
                  </Pressable>
                )
              })}
            </ScrollView>

            <Button text="Done" preset="default" onPress={() => setTimezoneDropdownVisible(false)} />
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  )
}

const $container: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexGrow: 1,
  padding: spacing.md,
  gap: spacing.md,
})

const $header: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  gap: spacing.xs,
})

const $formContent: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  gap: spacing.md,
  paddingBottom: spacing.xl,
})

const $infoCard: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  borderRadius: 16,
  borderWidth: 1,
  borderColor: colors.border,
  backgroundColor: colors.background,
  padding: spacing.md,
  gap: spacing.xs,
})

const $field: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  gap: spacing.xs,
})

const $dropdownField: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: 12,
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
  backgroundColor: colors.background,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  gap: spacing.sm,
})

const $dropdownFieldPressed: ThemedStyle<ViewStyle> = () => ({
  opacity: 0.85,
})

const $dropdownValueCopy: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
  gap: 2,
})

const $dropdownValueText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.text,
})

const $dropdownHelperText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
})

const $dropdownIconWrap: ThemedStyle<ViewStyle> = () => ({
  transform: [{ rotate: "90deg" }],
})

const $label: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.text,
})

const $textInput: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: 12,
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
  color: colors.text,
  backgroundColor: colors.background,
})

const $toggleCard: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  borderRadius: 16,
  borderWidth: 1,
  borderColor: colors.border,
  backgroundColor: colors.background,
  padding: spacing.md,
  gap: spacing.md,
})

const $deviceList: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  maxHeight: 320,
})

const $deviceListContent: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  gap: spacing.sm,
})

const $deviceOption: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: 12,
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
  backgroundColor: colors.background,
  gap: 4,
})

const $deviceOptionSelected: ThemedStyle<ViewStyle> = ({ colors }) => ({
  borderColor: colors.palette.primary500,
  backgroundColor: colors.palette.primary100,
})

const $deviceOptionPressed: ThemedStyle<ViewStyle> = () => ({
  opacity: 0.85,
})

const $deviceOptionText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.text,
})

const $deviceOptionTextSelected: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.palette.primary600,
})

const $deviceOptionSubtleText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
})

const $deviceOptionSubtleTextSelected: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.palette.primary500,
})

const $toggleRow: ThemedStyle<ViewStyle> = () => ({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 16,
})

const $toggleCopy: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
  gap: 4,
})

const $toggleDivider: ThemedStyle<ViewStyle> = ({ colors }) => ({
  height: 1,
  backgroundColor: colors.border,
})

const $actions: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  gap: spacing.sm,
})

const $actionButton: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
})

const $stateBlock: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  alignItems: "center",
  justifyContent: "center",
  paddingVertical: spacing.xl,
  gap: spacing.sm,
})

const $subtleText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
})

const $errorText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.error,
})

const $dropdownBackdrop: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flex: 1,
  backgroundColor: colors.palette.neutral800 + "99",
  justifyContent: "center",
  paddingHorizontal: 24,
})

const $dropdownSheet: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  borderRadius: 18,
  borderWidth: 1,
  borderColor: colors.border,
  backgroundColor: colors.background,
  padding: spacing.md,
  gap: spacing.md,
})

const $dropdownSheetHeader: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  gap: spacing.xs,
})