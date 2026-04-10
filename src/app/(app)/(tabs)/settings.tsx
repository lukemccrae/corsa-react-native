import { FC } from "react"
import { View, ViewStyle } from "react-native"
import { useRouter } from "expo-router"

import { Button } from "@/components/Button"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { useAuth } from "@/providers/AuthProvider"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

export const SettingsScreen: FC = function SettingsScreen() {
  const { themed } = useAppTheme()
  const router = useRouter()
  const { signOut } = useAuth()

  const handleLogOut = async () => {
    await signOut()
    router.replace("/(app)")
  }

  return (
    <Screen preset="fixed" safeAreaEdges={["top"]} contentContainerStyle={themed($container)}>
      <View style={themed($header)}>
        <Text preset="heading" text="Settings" />
      </View>

      <View style={themed($actions)}>
        <Button text="Streams" preset="filled" onPress={() => router.push("/(app)/streams")} />
        <Button text="Routes" preset="filled" onPress={() => router.push("/(app)/(tabs)/routes")} />
        <Button text="Devices" preset="filled" onPress={() => router.push("/(app)/(tabs)/devices")} />
        <Button text="Account" onPress={() => router.push("/(app)/account")} />
        <Button text="Log out" onPress={() => void handleLogOut()} />
      </View>
    </Screen>
  )
}

export default SettingsScreen

const $container: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flex: 1,
  padding: spacing.md,
})

const $header: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom: spacing.lg,
})

const $actions: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  gap: spacing.sm,
})
