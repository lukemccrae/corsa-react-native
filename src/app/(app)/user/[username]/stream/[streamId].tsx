import { Redirect, useLocalSearchParams } from "expo-router"

import { UserStreamScreen } from "@/screens/UserStreamScreen"

export default function UserStreamRoute() {
  const { username, streamId } = useLocalSearchParams<{ username: string; streamId: string }>()

  if (!username || !streamId) {
    return <Redirect href="/(app)" />
  }

  return <UserStreamScreen username={username} streamId={streamId} />
}