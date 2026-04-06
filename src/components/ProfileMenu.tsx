import React, { useCallback, useState } from "react"
import {
  type LayoutChangeEvent,
  Modal,
  Pressable,
  StyleSheet,
  View,
  ViewStyle,
  Image,
  ImageStyle,
  TextStyle,
} from "react-native"
import { useRouter } from "expo-router"

import { Text } from "@/components/Text"
import { useAuth } from "@/providers/AuthProvider"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"
import { translate } from "@/i18n/translate"

interface MenuItemConfig {
  label: string
  onPress: () => void
  isDanger?: boolean
}

type AppRoutes = 
  | "/(app)/routes" 
  | "/(app)/devices" 
  | `/(app)/user/${string}`

export const ProfileMenu: React.FC<{
  profilePictureUri?: string
  username?: string
}> = ({ profilePictureUri, username }) => {
  const { themed } = useAppTheme()
  const router = useRouter()
  const { signOut } = useAuth()
  const [menuVisible, setMenuVisible] = useState(false)
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 0 })

  const closeMenu = useCallback(() => {
    setMenuVisible(false)
  }, [])

  const navigateTo = useCallback(
    (path: AppRoutes) => {
      closeMenu()
      router.push(path)
    },
    [closeMenu, router],
  )

  const handleSignOut = useCallback(() => {
    closeMenu()
    signOut()
  }, [closeMenu, signOut])

  const handleProfile = useCallback(() => {
    if (username) {
      navigateTo(`/(app)/user/${username}` as AppRoutes)
    }
  }, [username, navigateTo])

  const handleProfilePress = useCallback(() => {
    setMenuVisible(true)
  }, [])

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const { height, y } = event.nativeEvent.layout
    const spacing = 8
    setMenuPosition({
      top: y + height + spacing,
      right: 16,
    })
  }, [])

  const menuItems: MenuItemConfig[] = [
    {
      label: translate("profileMenu:routes"),
      onPress: () => navigateTo("/(app)/routes" as AppRoutes),
    },
    {
      label: translate("profileMenu:devices"),
      onPress: () => navigateTo("/(app)/devices" as AppRoutes),
    },
    {
      label: translate("profileMenu:myProfile"),
      onPress: handleProfile,
    },
    {
      label: translate("profileMenu:logOut"),
      onPress: handleSignOut,
      isDanger: true,
    },
  ]

  return (
    <>
      <Pressable
        onPress={handleProfilePress}
        onLayout={handleLayout}
        style={({ pressed }) => [
          themed($profileBadge),
          pressed ? themed($profileBadgePressed) : null,
        ]}
        accessibilityRole="button"
        accessibilityLabel={translate("userProfileScreen:viewProfile", { username: username || "User" })}
      >
        {profilePictureUri ? (
          <Image source={{ uri: profilePictureUri }} style={themed($avatarImage)} />
        ) : (
          <View style={themed($avatarFallback)} />
        )}
        {username ? (
          <Text text={username} size="xs" numberOfLines={1} style={themed($profileName)} />
        ) : null}
      </Pressable>

      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={closeMenu}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={closeMenu}
        />

        <View
          style={[
            themed($menuContainer),
            {
              top: menuPosition.top,
              right: menuPosition.right,
            },
          ]}
        >
          {menuItems.map((item, index) => (
            <Pressable
              key={index}
              onPress={item.onPress}
              style={({ pressed }) => [
                themed($menuItem),
                pressed ? themed($menuItemPressed) : null,
                item.isDanger ? themed($menuItemDanger) : null,
              ]}
            >
              <Text
                text={item.label}
                size="sm"
                style={[
                  themed($menuItemText),
                  item.isDanger ? themed($menuItemDangerText) : null,
                ]}
              />
            </Pressable>
          ))}
        </View>
      </Modal>
    </>
  )
}

const $profileBadge: ThemedStyle<ViewStyle> = ({ spacing, colors }) => ({
  position: "absolute",
  top: spacing.xxxl,
  right: spacing.md,
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.xs,
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xs,
  borderRadius: 20,
  backgroundColor: colors.palette?.neutral100 ?? "#FFFFFF",
  shadowColor: colors.text,
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.1,
  shadowRadius: 4,
  elevation: 2,
  zIndex: 10,
})

const $profileBadgePressed: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.palette?.neutral200 ?? "#F4F2F1",
})

const $avatarImage: ThemedStyle<ImageStyle> = () => ({
  width: 28,
  height: 28,
  borderRadius: 14,
})

const $avatarFallback: ThemedStyle<ViewStyle> = ({ colors }) => ({
  width: 28,
  height: 28,
  borderRadius: 14,
  backgroundColor: colors.palette?.neutral300,
})

const $profileName: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.text,
  maxWidth: 80,
})

const $menuContainer: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  position: "absolute",
  backgroundColor: colors.palette?.neutral100 ?? "#FFFFFF",
  borderRadius: 8,
  minWidth: 200,
  shadowColor: colors.text,
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.15,
  shadowRadius: 8,
  elevation: 8,
  overflow: "hidden",
  zIndex: 999,
})

const $menuItem: ThemedStyle<ViewStyle> = ({ spacing, colors }) => ({
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
  borderBottomWidth: 1,
  borderBottomColor: colors.palette?.neutral100,
})

const $menuItemPressed: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.palette?.neutral200 ?? "#F4F2F1",
})

const $menuItemDanger: ThemedStyle<ViewStyle> = () => ({})

const $menuItemText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.text,
})

const $menuItemDangerText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.error,
})
