import { Redirect, useLocalSearchParams } from "expo-router"

import { UserRouteScreen } from "@/screens/UserRouteScreen"

export default function UserRouteDetailRoute() {
  const { username, routeId } = useLocalSearchParams<{ username: string; routeId: string }>()

  if (!username || !routeId) {
    return <Redirect href="/(app)" />
  }

  return <UserRouteScreen username={username} routeId={routeId} />
}