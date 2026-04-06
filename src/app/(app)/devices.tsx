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

import { Button } from "@/components/Button"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import type { Device } from "@/generated/schema"
import { useAuth } from "@/providers/AuthProvider"
import { deleteDevice, fetchUserProfileByUsername, upsertDevice } from "@/services/api/graphql"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

interface DeviceFormState {
  deviceId?: string
  imei: string
  name: string
  make: string
  model: string
  shareUrl: string
}

function getDeviceIcon(make?: string | null): string {
  switch (make?.toUpperCase()) {
    case "GARMIN":
      return "📍"
    case "SPOT":
      return "📡"
    case "BIVY":
      return "🌍"
    default:
      return "📱"
  }
}

function getMakeLabel(make?: string | null): string {
  return make?.toUpperCase() || "Unknown"
}

function createEmptyForm(): DeviceFormState {
  return {
    deviceId: undefined,
    imei: "",
    name: "",
    make: "GARMIN",
    model: "",
    shareUrl: "",
  }
}

export const DevicesScreen: FC = function DevicesScreen() {
  const { themed } = useAppTheme()
  const { user, appUser } = useAuth()
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showEditor, setShowEditor] = useState(false)
  const [formData, setFormData] = useState<DeviceFormState>(createEmptyForm)
  const [errors, setErrors] = useState<Partial<Record<keyof DeviceFormState, string>>>({})

  const isEditing = useMemo(() => Boolean(formData.deviceId), [formData.deviceId])

  const resetForm = useCallback(() => {
    setFormData(createEmptyForm())
    setErrors({})
  }, [])

  const closeEditor = useCallback(() => {
    setShowEditor(false)
    resetForm()
  }, [resetForm])

  const loadDevices = useCallback(async () => {
    if (!appUser?.username) {
      setDevices([])
      setLoading(false)
      return
    }

    try {
      const profile = await fetchUserProfileByUsername(appUser.username)
      const fetchedDevices = (profile?.devices ?? []).filter((entry): entry is Device => Boolean(entry))
      setDevices(fetchedDevices)
    } catch (error) {
      console.error("Error loading devices:", error)
      Alert.alert("Error", "Could not fetch your devices.")
    } finally {
      setLoading(false)
    }
  }, [appUser?.username])

  useEffect(() => {
    void loadDevices()
  }, [loadDevices])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await loadDevices()
    setRefreshing(false)
  }, [loadDevices])

  const openCreateForm = useCallback(() => {
    resetForm()
    setShowEditor(true)
  }, [resetForm])

  const openEditForm = useCallback((device: Device) => {
    setFormData({
      deviceId: device.deviceId,
      imei: device.imei,
      name: device.name ?? "",
      make: device.make ?? "GARMIN",
      model: device.model ?? "",
      shareUrl: device.shareUrl ?? "",
    })
    setErrors({})
    setShowEditor(true)
  }, [])

  const validateForm = useCallback(() => {
    const nextErrors: Partial<Record<keyof DeviceFormState, string>> = {}

    if (!formData.imei.trim()) nextErrors.imei = "IMEI is required"
    if (!formData.name.trim()) nextErrors.name = "Device name is required"
    if (!formData.make.trim()) nextErrors.make = "Make is required"

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }, [formData])

  const handleSave = useCallback(async () => {
    if (!user || !appUser?.userId) {
      Alert.alert("Error", "You must be signed in to edit devices.")
      return
    }

    if (!validateForm()) return

    setSaving(true)
    try {
      const idToken = await user.getIdToken()
      await upsertDevice(
        {
          userId: appUser.userId,
          imei: formData.imei.trim(),
          name: formData.name.trim(),
          make: formData.make.trim(),
          model: formData.model.trim(),
          shareUrl: formData.shareUrl.trim(),
        },
        idToken,
      )

      closeEditor()
      await loadDevices()
    } catch (error) {
      console.error("Error saving device:", error)
      Alert.alert("Error", "Failed to save device. Please try again.")
    } finally {
      setSaving(false)
    }
  }, [appUser?.userId, closeEditor, formData, loadDevices, user, validateForm])

  const handleDelete = useCallback(() => {
    if (!formData.deviceId || !user) return

    Alert.alert("Delete Device", `Delete ${formData.name || "this device"}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const idToken = await user.getIdToken()
            const success = await deleteDevice(formData.deviceId!, idToken)
            if (!success) throw new Error("Delete failed")
            closeEditor()
            await loadDevices()
          } catch (error) {
            console.error("Error deleting device:", error)
            Alert.alert("Error", "Failed to delete device.")
          }
        },
      },
    ])
  }, [closeEditor, formData.deviceId, formData.name, loadDevices, user])

  const renderField = (
    label: string,
    key: keyof DeviceFormState,
    placeholder: string,
    keyboardType?: "default" | "number-pad" | "url",
  ) => (
    <View style={themed($formField)}>
      <Text text={label} size="sm" weight="medium" style={themed($label)} />
      <TextInput
        style={themed($textInput)}
        placeholder={placeholder}
        value={formData[key] ?? ""}
        onChangeText={(text) => {
          setFormData((current) => ({ ...current, [key]: text }))
          if (errors[key]) setErrors((current) => ({ ...current, [key]: undefined }))
        }}
        editable={!saving}
        placeholderTextColor="#999"
        autoCapitalize="none"
        keyboardType={keyboardType}
      />
      {errors[key] ? <Text text={errors[key]} size="xs" style={themed($errorText)} /> : null}
    </View>
  )

  return (
    <Screen preset="fixed" safeAreaEdges={["top"]} contentContainerStyle={themed($container)}>
      <View style={themed($header)}>
        <Text preset="heading" text="Devices" />
      </View>

      <Button
        text="Register New Device"
        preset="filled"
        onPress={openCreateForm}
        style={themed($registerButton)}
      />

      <Modal visible={showEditor} transparent animationType="slide" onRequestClose={closeEditor}>
        <Screen preset="fixed" safeAreaEdges={["top"]} contentContainerStyle={themed($modalContainer)}>
          <View style={themed($modalHeader)}>
            <Text preset="heading" text={isEditing ? "Edit Device" : "Register Device"} />
            <Pressable onPress={closeEditor} accessibilityRole="button" accessibilityLabel="Close device editor">
              <Text text="✕" style={themed($closeButton)} />
            </Pressable>
          </View>

          <ScrollView style={themed($formContent)}>
            {renderField("IMEI *", "imei", "Enter device IMEI", "number-pad")}
            {renderField("Device Name *", "name", "e.g., My Garmin Watch")}
            {renderField("Make *", "make", "e.g., Garmin")}
            {renderField("Model", "model", "e.g., Epix Gen 2")}
            {renderField("Share URL", "shareUrl", "Optional share URL", "url")}

            <View style={themed($formActions)}>
              <Button
                text={saving ? "Saving..." : isEditing ? "Save Changes" : "Register Device"}
                preset="filled"
                onPress={handleSave}
                disabled={saving}
                style={themed($submitButton)}
              />
              <Button text="Cancel" preset="default" onPress={closeEditor} disabled={saving} />
            </View>

            {isEditing ? (
              <Button
                text="Delete Device"
                preset="reversed"
                onPress={handleDelete}
                disabled={saving}
                style={themed($deleteButton)}
              />
            ) : null}
          </ScrollView>
        </Screen>
      </Modal>

      {loading ? (
        <View style={themed($centered)}>
          <ActivityIndicator />
        </View>
      ) : devices.length === 0 ? (
        <View style={themed($centered)}>
          <Text size="sm">No devices registered</Text>
          <Text size="xs" style={themed($emptyText)}>
            Register a device to track your location
          </Text>
        </View>
      ) : (
        <FlatList
          data={devices}
          keyExtractor={(item) => item.deviceId || item.imei}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => openEditForm(item)}
              style={({ pressed }) => [themed($deviceItem), pressed ? themed($deviceItemPressed) : null]}
            >
              <View style={themed($deviceHeader)}>
                <Text text={getDeviceIcon(item.make)} style={themed($deviceIcon)} />
                <View style={themed($deviceInfo)}>
                  <Text text={item.name || "Unnamed Device"} weight="medium" numberOfLines={1} />
                  <Text size="xs" style={themed($deviceMake)}>
                    {getMakeLabel(item.make)}{item.model ? ` - ${item.model}` : ""}
                  </Text>
                  {item.shareUrl ? (
                    <Text size="xs" style={themed($deviceMeta)} numberOfLines={1}>
                      {item.shareUrl}
                    </Text>
                  ) : null}
                </View>
              </View>
              <Text size="xs" style={themed($deviceImei)}>
                IMEI: {item.imei}
              </Text>
            </Pressable>
          )}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={themed($listContent)}
        />
      )}
    </Screen>
  )
}

export default DevicesScreen

const $container: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flex: 1,
  padding: spacing.md,
})

const $header: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom: spacing.lg,
})

const $registerButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
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

const $errorText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.error,
  marginTop: 4,
})

const $formActions: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  gap: spacing.sm,
  marginTop: spacing.lg,
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

const $deviceItem: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  padding: spacing.md,
  backgroundColor: colors.palette?.neutral100,
  borderRadius: 8,
})

const $deviceItemPressed: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.palette?.neutral200,
})

const $deviceHeader: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "flex-start",
  gap: spacing.md,
  marginBottom: spacing.sm,
})

const $deviceIcon: ThemedStyle<TextStyle> = () => ({
  fontSize: 24,
  lineHeight: 24,
  width: 32,
  textAlign: "center",
})

const $deviceInfo: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flex: 1,
  gap: spacing.xs,
})

const $deviceMake: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
})

const $deviceMeta: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
})

const $deviceImei: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  color: colors.textDim,
  marginTop: spacing.xs,
})
