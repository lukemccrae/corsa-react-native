import { useEffect } from "react"
import { useRouter } from "expo-router"

import { useAuth } from "@/providers/AuthProvider"
import { UserProfileScreen } from "@/screens/UserProfileScreen"

export default function ProfileTab() {
  const { user, appUser, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/(auth)/sign-in")
    }
  }, [loading, user, router])

  // Wait for auth session to restore, or while redirecting to sign-in
  if (loading || !appUser) return null

  return <UserProfileScreen username={appUser.username} />
}
