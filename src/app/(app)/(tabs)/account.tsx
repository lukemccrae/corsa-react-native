import { FC, useState } from "react"
import { Alert, TextStyle, View, ViewStyle } from "react-native"
import { deleteUser } from "firebase/auth"
import { useRouter } from "expo-router"

import { Button } from "@/components/Button"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { useAuth } from "@/providers/AuthProvider"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

function getDeleteAccountErrorMessage(error: unknown): string {
  const code = typeof error === "object" && error !== null && "code" in error
    ? String((error as { code?: unknown }).code)
    : ""

  if (code === "auth/requires-recent-login") {
    return "For security, please sign in again before deleting your account."
  }

  return "Failed to delete account. Please try again."
}

export const AccountScreen: FC = function AccountScreen() {
  const { themed } = useAppTheme()
  const router = useRouter()
  const { user } = useAuth()
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDeleteAccount = () => {
    Alert.alert("Delete Account", "This will permanently delete your account. This action cannot be undone.", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          void (async () => {
            if (!user) {
              Alert.alert("Error", "You must be signed in to delete your account.")
              return
            }

            try {
              setIsDeleting(true)
              await deleteUser(user)
              router.replace("/")
            } catch (error) {
              Alert.alert("Error", getDeleteAccountErrorMessage(error))
            } finally {
              setIsDeleting(false)
            }
          })()
        },
      },
    ])
  }

  return (
    <Screen preset="fixed" safeAreaEdges={["top"]} contentContainerStyle={themed($container)}>
      <View style={themed($header)}>
        <Text preset="heading" text="Account" />
        <Text
          text="Manage your account settings and permanently delete your account."
          size="xs"
          style={themed($subtleText)}
        />
      </View>

      <View style={themed($section)}>
        <Text text="Danger zone" weight="bold" />
        <Text
          text="Deleting your account cannot be undone."
          size="xs"
          style={themed($subtleText)}
        />
        <Button
          text={isDeleting ? "Deleting account..." : "Delete account"}
          onPress={handleDeleteAccount}
          disabled={isDeleting}
          style={themed($dangerButton)}
          textStyle={themed($dangerButtonText)}
        />
      </View>
    </Screen>
  )
}

export default AccountScreen

const $container: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flex: 1,
  padding: spacing.md,
})

const $header: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom: spacing.lg,
  gap: spacing.xs,
})

const $section: ThemedStyle<ViewStyle> = ({ spacing, colors }) => ({
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: spacing.sm,
  padding: spacing.md,
  gap: spacing.sm,
})

const $subtleText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
})

const $dangerButton: ThemedStyle<ViewStyle> = ({ colors }) => ({
  borderColor: colors.error,
})

const $dangerButtonText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.error,
})
