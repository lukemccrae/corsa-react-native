import { Redirect } from "expo-router"

import { useAuth } from "@/providers/AuthProvider"
import { UserProfileScreen } from "@/screens/UserProfileScreen"

export default function ProfileTab() {
  const { appUser } = useAuth()

  if (!appUser) {
    return <Redirect href="/(auth)/sign-in" />
  }

  return <UserProfileScreen username={appUser.username} />
}
