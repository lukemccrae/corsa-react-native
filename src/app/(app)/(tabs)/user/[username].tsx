import { Redirect, useLocalSearchParams } from "expo-router"

import { UserProfileScreen } from "@/screens/UserProfileScreen"

export default function UserProfileRoute() {
  const { username } = useLocalSearchParams<{ username: string }>()

  if (!username) {
    return <Redirect href="/(app)" />
  }

  return <UserProfileScreen username={username} />
}
