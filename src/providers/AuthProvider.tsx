import { createContext, FC, PropsWithChildren, useContext, useEffect, useRef, useState } from "react"
import {
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from "firebase/auth"

import type { User as AppUser } from "@/generated/schema"
import { fetchAppUserById } from "@/services/api/graphql"
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

export const AuthProvider: FC<PropsWithChildren> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [appUser, setAppUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)
  const authStateRequestIdRef = useRef(0)

  useEffect(() => {
    let isMounted = true

    const unsubscribe = onAuthStateChanged(firebaseAuth, (firebaseUser) => {
      authStateRequestIdRef.current += 1
      const requestId = authStateRequestIdRef.current

      setUser(firebaseUser)

      if (!firebaseUser) {
        setAppUser(null)
        setLoading(false)
        return
      }

      // Keep loading true until the backend user profile query resolves.
      setLoading(true)

      void (async () => {
        try {
          const fetchedUser = await fetchAppUserById(firebaseUser.uid)
          if (!isMounted || requestId !== authStateRequestIdRef.current) return
          setAppUser(fetchedUser)
        } catch (error) {
          if (__DEV__) {
            console.warn("Failed to fetch AppSync user after login:", error)
          }
          if (!isMounted || requestId !== authStateRequestIdRef.current) return
          setAppUser(null)
        } finally {
          if (!isMounted || requestId !== authStateRequestIdRef.current) return
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
