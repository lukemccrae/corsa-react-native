import { Redirect, useLocalSearchParams } from "expo-router"

import { UserStreamSettingsScreen } from "@/screens/UserStreamSettingsScreen"

export default function UserStreamSettingsRoute() {
  const { username, streamId } = useLocalSearchParams<{ username: string; streamId: string }>()

  if (!username || !streamId) {
    return <Redirect href="/(app)" />
  }

  return <UserStreamSettingsScreen username={username} streamId={streamId} />
}