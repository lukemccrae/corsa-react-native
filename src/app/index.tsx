import { Redirect } from "expo-router"

import { useAuth } from "@/providers/AuthProvider"

export default function Index() {
  const { user, loading } = useAuth()

  if (loading) return null

  return <Redirect href={user ? "/(app)" : "/(auth)/sign-in"} />
}
