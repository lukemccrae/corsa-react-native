import { useEffect } from "react"
import { useRouter } from "expo-router"
import { ActivityIndicator, View } from "react-native"

import { Text } from "@/components/Text"
import { useAuth } from "@/providers/AuthProvider"
import { UserProfileScreen } from "@/screens/UserProfileScreen"
import { useAppTheme } from "@/theme/context"
import type { TextStyle, ViewStyle } from "react-native"
import type { ThemedStyle } from "@/theme/types"

export default function ProfileTab() {
  const { user, appUser, loading } = useAuth()
  const { themed } = useAppTheme()
  const router = useRouter()

  useEffect(() => {
    if (__DEV__) {
      console.log("[ProfileTab] auth state", {
        loading,
        firebaseUid: user?.uid ?? null,
        appUsername: appUser?.username ?? null,
      })
    }
  }, [appUser?.username, loading, user?.uid])

  useEffect(() => {
    if (!loading && !user) {
      if (__DEV__) {
        console.log("[ProfileTab] redirecting to sign-in")
      }
      router.replace("/(auth)/sign-in")
    }
  }, [loading, router, user])

  if (loading) {
    return (
      <View style={themed($loadingContainer)}>
        <ActivityIndicator />
      </View>
    )
  }

  if (!user) {
    return (
      <View style={themed($loadingContainer)}>
        <ActivityIndicator />
      </View>
    )
  }

  if (!appUser) {
    if (__DEV__) {
      console.log("[ProfileTab] app user missing after auth resolved", {
        firebaseUid: user.uid,
      })
    }

    return (
      <View style={themed($loadingContainer)}>
        <Text
          text="Your account is signed in, but the profile record could not be loaded. Try reopening the app or signing in again."
          size="sm"
          style={themed($messageText)}
        />
      </View>
    )
  }

  if (__DEV__) {
    console.log("[ProfileTab] rendering user profile", {
      username: appUser.username,
    })
  }

  return <UserProfileScreen username={appUser.username} />
}

const $loadingContainer: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
  alignItems: "center",
  justifyContent: "center",
  paddingHorizontal: 24,
})

const $messageText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.text,
  textAlign: "center",
})
