import { Redirect, Slot } from "expo-router"

import { useAuth } from "@/providers/AuthProvider"

export default function AuthLayout() {
  const { user, loading } = useAuth()

  if (loading) return null

  // Already signed in – redirect to app
  if (user) return <Redirect href="/(app)" />

  return <Slot />
}
