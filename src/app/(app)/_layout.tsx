import { Redirect, Slot } from "expo-router"

import { useAuth } from "@/providers/AuthProvider"

export default function AppLayout() {
  const { user, loading } = useAuth()

  if (loading) return null

  // Not signed in – redirect to sign in
  if (!user) return <Redirect href="/(auth)/sign-in" />

  return <Slot />
}
