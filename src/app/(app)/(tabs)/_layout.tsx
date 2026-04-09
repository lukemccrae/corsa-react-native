import { Tabs } from "expo-router"
import { Ionicons } from "@expo/vector-icons"

import { colors } from "@/theme/colors"

export default function AppTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.tint,
        tabBarInactiveTintColor: colors.tintInactive,
        tabBarStyle: {
          backgroundColor: colors.palette.neutral100,
          borderTopColor: colors.border,
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
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen name="settings" options={{ href: null }} />
      <Tabs.Screen name="user" options={{ href: null }} />
      <Tabs.Screen name="user/[username]" options={{ href: null }} />
      <Tabs.Screen name="user/[username]/stream/[streamId]" options={{ href: null }} />
      <Tabs.Screen name="user/[username]/route/[routeId]" options={{ href: null }} />
    </Tabs>
  )
}
