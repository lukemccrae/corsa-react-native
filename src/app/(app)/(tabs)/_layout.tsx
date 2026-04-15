import { Tabs } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import { Image, View } from "react-native"

import { useAuth } from "@/providers/AuthProvider"
import { useAppTheme } from "@/theme/context"

function ProfileTabIcon({ color, size }: { color: string; size: number }) {
  const { appUser } = useAuth()

  if (appUser?.profilePicture) {
    return (
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          overflow: "hidden",
          borderWidth: 1,
          borderColor: color,
        }}
      >
        <Image
          source={{ uri: appUser.profilePicture }}
          style={{ width: "100%", height: "100%" }}
          resizeMode="cover"
          testID="profile-tab-avatar"
        />
      </View>
    )
  }

  return <Ionicons testID="profile-tab-icon-fallback" name="person-outline" size={size} color={color} />
}

export default function AppTabsLayout() {
  const {
    theme: { colors, isDark },
  } = useAppTheme()

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.tint,
        tabBarInactiveTintColor: isDark ? colors.palette.neutral600 : colors.tintInactive,
        tabBarStyle: {
          backgroundColor: isDark ? colors.palette.neutral200 : colors.palette.neutral100,
          borderTopColor: isDark ? colors.palette.neutral300 : colors.border,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Map",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="map-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="streams"
        options={{
          title: "Record",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="radio-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => <ProfileTabIcon color={color} size={size} />,
        }}
      />
      <Tabs.Screen name="routes" options={{ href: null }} />
      <Tabs.Screen name="devices" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
      <Tabs.Screen name="account" options={{ href: null }} />
      <Tabs.Screen name="user" options={{ href: null }} />
      <Tabs.Screen name="user/[username]" options={{ href: null }} />
      <Tabs.Screen name="user/[username]/stream/[streamId]" options={{ href: null }} />
      <Tabs.Screen name="user/[username]/stream/[streamId]/settings" options={{ href: null }} />
      <Tabs.Screen name="user/[username]/route/[routeId]" options={{ href: null }} />
    </Tabs>
  )
}
