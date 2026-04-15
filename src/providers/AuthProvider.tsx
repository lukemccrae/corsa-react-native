import { createContext, FC, PropsWithChildren, useContext, useEffect, useRef, useState } from "react"
import {
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from "firebase/auth"

import type { User as AppUser } from "@/generated/schema"
import { fetchAppUserById, upsertUser } from "@/services/api/graphql"
import { firebaseAuth } from "@/services/firebase"
import { useGoogleSignIn } from "@/services/googleSignIn"

export type AuthContextType = {
  user: User | null
  appUser: AppUser | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  signInWithGoogle: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

function sanitizeUsernameSegment(value: string | null | undefined): string {
  if (!value) return ""

  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
}

function buildBootstrapUsername(firebaseUser: User): string {
  const emailLocalPart = firebaseUser.email?.split("@")[0] ?? ""
  const preferredBase =
    sanitizeUsernameSegment(firebaseUser.displayName) ||
    sanitizeUsernameSegment(emailLocalPart) ||
    "user"
  const suffix = firebaseUser.uid.slice(0, 8).toLowerCase()
  const maxBaseLength = Math.max(1, 30 - suffix.length - 1)

  return `${preferredBase.slice(0, maxBaseLength)}_${suffix}`
}

export const AuthProvider: FC<PropsWithChildren> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [appUser, setAppUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)
  const authStateRequestIdRef = useRef(0)

  const logAuthState = (message: string, details?: Record<string, unknown>) => {
    if (__DEV__) {
      console.log("[AuthProvider]", message, details ?? {})
    }
  }

  useEffect(() => {
    let isMounted = true

    const unsubscribe = onAuthStateChanged(firebaseAuth, (firebaseUser) => {
      authStateRequestIdRef.current += 1
      const requestId = authStateRequestIdRef.current

      logAuthState("onAuthStateChanged", {
        requestId,
        firebaseUid: firebaseUser?.uid ?? null,
      })

      setUser(firebaseUser)

      if (!firebaseUser) {
        logAuthState("no firebase user, clearing app user and loading")
        setAppUser(null)
        setLoading(false)
        return
      }

      // Keep loading true until the backend user profile query resolves.
      logAuthState("firebase user present, fetching app user", {
        requestId,
        firebaseUid: firebaseUser.uid,
      })
      setLoading(true)

      void (async () => {
        try {
          let fetchedUser = await fetchAppUserById(firebaseUser.uid)

          if (!fetchedUser) {
            const username = buildBootstrapUsername(firebaseUser)

            logAuthState("app user missing, bootstrapping profile", {
              requestId,
              firebaseUid: firebaseUser.uid,
              username,
            })

            const idToken = await firebaseUser.getIdToken()
            fetchedUser = await upsertUser(
              {
                userId: firebaseUser.uid,
                username,
                profilePicture: firebaseUser.photoURL ?? "",
              },
              idToken,
            )

            logAuthState("bootstrapped app user", {
              requestId,
              username: fetchedUser.username,
            })
          }

          if (!isMounted || requestId !== authStateRequestIdRef.current) return
          logAuthState("fetched app user", {
            requestId,
            username: fetchedUser?.username ?? null,
          })
          setAppUser(fetchedUser)
        } catch (error) {
          if (__DEV__) {
            console.warn("[AuthProvider] fetchAppUserById failed", {
              requestId,
              firebaseUid: firebaseUser.uid,
              error,
            })
            console.warn("Failed to fetch AppSync user after login:", error)
          }
          if (!isMounted || requestId !== authStateRequestIdRef.current) return
          setAppUser(null)
        } finally {
          if (!isMounted || requestId !== authStateRequestIdRef.current) return
          logAuthState("auth state request finished", {
            requestId,
            firebaseUid: firebaseUser.uid,
          })
          setLoading(false)
        }
      })()
    })

    return () => {
      isMounted = false
      unsubscribe()
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(firebaseAuth, email, password)
  }

  const signUp = async (email: string, password: string) => {
    await createUserWithEmailAndPassword(firebaseAuth, email, password)
  }

  const signOut = async () => {
    await firebaseSignOut(firebaseAuth)
  }

  const { signInWithGoogle } = useGoogleSignIn()

  return (
    <AuthContext.Provider
      value={{ user, appUser, loading, signIn, signUp, signOut, signInWithGoogle }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
