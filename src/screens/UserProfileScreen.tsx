import { FC } from "react"
import { Image, ImageStyle, TextStyle, View, ViewStyle } from "react-native"

import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { translate } from "@/i18n/translate"
import { useAuth } from "@/providers/AuthProvider"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

interface UserProfileScreenProps {
  username: string
}

export const UserProfileScreen: FC<UserProfileScreenProps> = function UserProfileScreen({
  username,
}) {
  const { themed } = useAppTheme()
  const { appUser } = useAuth()

  const isOwnProfile = appUser?.username === username
  const profileData = isOwnProfile ? appUser : null

  const profilePictureUri = profileData?.profilePicture
  const bio = profileData?.bio

  return (
    <Screen
      preset="scroll"
      contentContainerStyle={themed($container)}
      accessibilityLabel={translate("userProfileScreen:viewProfile", { username })}
    >
      <View style={themed($avatarWrapper)}>
        {profilePictureUri ? (
          <Image
            source={{ uri: profilePictureUri }}
            style={themed($avatar)}
            accessibilityRole="image"
            accessibilityLabel={username}
          />
        ) : (
          <View style={themed($avatarFallback)} accessibilityRole="image" accessibilityLabel={username} />
        )}
      </View>

      <Text text={username} preset="heading" style={themed($username)} />

      {profileData !== null && (
        <View style={themed($bioSection)}>
          <Text tx="userProfileScreen:bio" preset="formLabel" style={themed($bioLabel)} />
          <Text
            text={bio || undefined}
            tx={bio ? undefined : "userProfileScreen:noBio"}
            style={themed($bioText)}
          />
        </View>
      )}
    </Screen>
  )
}

const $container: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing.lg,
  alignItems: "center",
})

const $avatarWrapper: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom: spacing.md,
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
})

const $username: ThemedStyle<TextStyle> = () => ({
  textAlign: "center",
})

const $bioSection: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginTop: spacing.lg,
  width: "100%",
})

const $bioLabel: ThemedStyle<TextStyle> = ({ spacing }) => ({
  marginBottom: spacing.xs,
})

const $bioText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
})
