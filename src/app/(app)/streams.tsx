import { FC, useCallback, useEffect, useState } from "react"
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  View,
  ViewStyle,
  TextStyle,
  Pressable,
  ScrollView,
  Modal,
  TextInput,
  Switch,
} from "react-native"
import { useRouter } from "expo-router"

import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { Button } from "@/components/Button"
import { useAuth } from "@/providers/AuthProvider"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"
import type { LiveStream, Device } from "@/generated/schema"

interface CreateStreamForm {
  title: string
  selectedDeviceId?: string
  startNow: boolean
  live: boolean
  published: boolean
}

export const StreamsScreen: FC = function StreamsScreen() {
  const { themed } = useAppTheme()
  const router = useRouter()
  const { appUser } = useAuth()
  const [streams, setStreams] = useState<LiveStream[]>([])
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState<CreateStreamForm>({
    title: "",
    selectedDeviceId: undefined,
    startNow: true,
    live: true,
    published: true,
  })
  const [errors, setErrors] = useState<{ title?: string }>({})

  useEffect(() => {
    loadStreams()
  }, [])

  const loadStreams = async () => {
    try {
      // TODO: Fetch user's streams from API
      // Fetch devices too
      setLoading(false)
    } catch (error) {
      console.error("Error loading streams:", error)
      setLoading(false)
    }
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await loadStreams()
    setRefreshing(false)
  }, [])

  const resetForm = () => {
    setFormData({
      title: "",
      selectedDeviceId: undefined,
      startNow: true,
      live: true,
      published: true,
    })
    setErrors({})
  }

  const validateForm = (): boolean => {
    const newErrors: { title?: string } = {}
    if (!formData.title.trim()) {
      newErrors.title = "Title is required"
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleCreateStream = async () => {
    if (!validateForm()) {
      return
    }

    setSubmitting(true)
    try {
      // TODO: Call API to create stream with formData
      // On success, navigate to the stream page or refresh list
      setShowCreateForm(false)
      resetForm()
      await loadStreams()
    } catch (error) {
      console.error("Error creating stream:", error)
      setErrors({ title: "Failed to create stream. Please try again." })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Screen
      preset="fixed"
      safeAreaEdges={["top"]}
      contentContainerStyle={themed($container)}
    >
      <View style={themed($header)}>
        <Text preset="heading" text="Streams" />
      </View>

      <Button
        text="Create New Stream"
        preset="filled"
        onPress={() => setShowCreateForm(true)}
        style={themed($createButton)}
      />

      <Modal
        visible={showCreateForm}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowCreateForm(false)
          resetForm()
        }}
      >
        <Screen
          preset="fixed"
          safeAreaEdges={["top"]}
          contentContainerStyle={themed($modalContainer)}
        >
          <View style={themed($modalHeader)}>
            <Text preset="heading" text="New Live Stream" />
            <Pressable
              onPress={() => {
                setShowCreateForm(false)
                resetForm()
              }}
            >
              <Text text="✕" style={themed($closeButton)} />
            </Pressable>
          </View>

          <ScrollView style={themed($formContent)}>
            {/* Title */}
            <View style={themed($formField)}>
              <Text text="Stream Title *" size="sm" weight="medium" style={themed($label)} />
              <TextInput
                style={themed($textInput)}
                placeholder="Enter stream title"
                value={formData.title}
                onChangeText={(text) => {
                  setFormData({ ...formData, title: text })
                  if (errors.title) setErrors({})
                }}
                editable={!submitting}
                placeholderTextColor="#999"
              />
              {errors.title && <Text text={errors.title} size="xs" style={themed($errorText)} />}
            </View>

            {/* Device Selector */}
            {devices.length > 0 && (
              <View style={themed($formField)}>
                <Text text="Device (Optional)" size="sm" weight="medium" style={themed($label)} />
                {/* TODO: Add device selector component */}
                <Text text="Device selection not yet implemented" size="xs" style={themed($helperText)} />
              </View>
            )}

            {/* Start Now Toggle */}
            <View style={themed($formField)}>
              <View style={themed($toggleLabel)}>
                <Text text="Start Now" size="sm" weight="medium" />
                <Switch
                  value={formData.startNow}
                  onValueChange={(val: boolean) => setFormData({ ...formData, startNow: val })}
                  disabled={submitting}
                  trackColor={{ false: "#ccc", true: "#4caf50" }}
                />
              </View>
              <Text text="The stream will start immediately when submitted" size="xs" style={themed($helperText)} />
            </View>

            {/* Live Toggle */}
            <View style={themed($formField)}>
              <View style={themed($toggleLabel)}>
                <Text text="Live Mode" size="sm" weight="medium" />
                <Switch
                  value={formData.live}
                  onValueChange={(val: boolean) => setFormData({ ...formData, live: val })}
                  disabled={submitting}
                  trackColor={{ false: "#ccc", true: "#4caf50" }}
                />
              </View>
            </View>

            {/* Published Toggle */}
            <View style={themed($formField)}>
              <View style={themed($toggleLabel)}>
                <Text text="Published" size="sm" weight="medium" />
                <Switch
                  value={formData.published}
                  onValueChange={(val: boolean) => setFormData({ ...formData, published: val })}
                  disabled={submitting}
                  trackColor={{ false: "#ccc", true: "#4caf50" }}
                />
              </View>
              <Text text="Others can see this stream in their feed when published" size="xs" style={themed($helperText)} />
            </View>

            {/* Actions */}
            <View style={themed($formActions)}>
              <Button
                text={submitting ? "Creating..." : "Create Stream"}
                preset="filled"
                onPress={handleCreateStream}
                disabled={submitting || !formData.title.trim()}
                style={themed($submitButton)}
              />
              <Button
                text="Cancel"
                preset="default"
                onPress={() => {
                  setShowCreateForm(false)
                  resetForm()
                }}
                disabled={submitting}
              />
            </View>
          </ScrollView>
        </Screen>
      </Modal>

      {loading ? (
        <View style={themed($centered)}>
          <ActivityIndicator />
        </View>
      ) : streams.length === 0 ? (
        <View style={themed($centered)}>
          <Text size="sm">No active streams</Text>
          <Text size="xs" style={themed($emptyText)}>
            Create a new stream to get started
          </Text>
        </View>
      ) : (
        <FlatList
          data={streams}
          keyExtractor={(item) => item.streamId}
          renderItem={({ item }) => (
            <Pressable
              onPress={() =>
                router.push(
                  `/(app)/user/${item.publicUser?.username}/stream/${item.streamId}`
                )
              }
              style={themed($streamItem)}
            >
              <View style={themed($itemHeader)}>
                <Text text={item.title || "Untitled Stream"} weight="medium" numberOfLines={1} />
                <Text size="xs" style={themed($itemStatus)}>
                  {item.live ? "LIVE" : "Completed"}
                </Text>
              </View>
              <Text size="xs" style={themed($streamDate)}>
                {new Date(item.startTime || "").toLocaleDateString()}
              </Text>
            </Pressable>
          )}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={themed($listContent)}
        />
      )}
    </Screen>
  )
}

export default StreamsScreen

const $container: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flex: 1,
  padding: spacing.md,
})

const $header: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom: spacing.lg,
})

const $createButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
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

const $textInput: ThemedStyle<any> = ({ colors, spacing }) => ({
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

const $helperText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
  marginTop: 4,
})

const $toggleLabel: ThemedStyle<ViewStyle> = () => ({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
})

const $formActions: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  gap: spacing.sm,
  marginTop: spacing.lg,
  marginBottom: spacing.xl,
})

const $submitButton: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
})

const $centered: ThemedStyle<ViewStyle> = ({
  spacing,
  colors,
}) => ({
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

const $streamItem: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  padding: spacing.md,
  backgroundColor: colors.palette?.neutral100,
  borderRadius: 8,
})

const $itemHeader: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: spacing.xs,
})

const $itemStatus: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.error,
  fontWeight: "600",
})

const $streamDate: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
})
