import { Redirect } from "expo-router"

import { useAuth } from "@/providers/AuthProvider"

export default function Index() {
  const { loading } = useAuth()

  // Wait for Firebase to restore the persisted session before routing.
  if (loading) return null

  // The map is the home screen and is accessible without signing in.
  return <Redirect href="/(app)" />
}
