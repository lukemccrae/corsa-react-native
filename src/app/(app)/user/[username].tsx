import { useLocalSearchParams } from "expo-router"

import { UserProfileScreen } from "@/screens/UserProfileScreen"

export default function UserProfileRoute() {
  const { username } = useLocalSearchParams<{ username: string }>()
  return <UserProfileScreen username={username ?? ""} />
}
