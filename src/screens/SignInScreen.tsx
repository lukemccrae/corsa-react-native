import { FC, useState } from "react"
import { ActivityIndicator, TextStyle, View, ViewStyle } from "react-native"

import { Button } from "@/components/Button"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { TextField } from "@/components/TextField"
import { useAuth } from "@/providers/AuthProvider"
import { useAppTheme } from "@/theme/context"
import { $styles } from "@/theme/styles"
import type { ThemedStyle } from "@/theme/types"

export const SignInScreen: FC = function SignInScreen() {
  const { themed } = useAppTheme()
  const { signIn, signUp, signInWithGoogle } = useAuth()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!email || !password) return
    setError(null)
    setLoading(true)
    try {
      if (isSignUp) {
        await signUp(email, password)
      } else {
        await signIn(email, password)
      }
    } catch (e: unknown) {
      const code = (e as { code?: string }).code ?? ""
      if (
        code === "auth/invalid-credential" ||
        code === "auth/wrong-password" ||
        code === "auth/user-not-found"
      ) {
        setError("signInScreen:errorInvalidCredentials")
      } else {
        setError("signInScreen:errorGeneric")
      }
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setError(null)
    setLoading(true)
    try {
      await signInWithGoogle()
    } catch {
      setError("signInScreen:errorGeneric")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Screen preset="scroll" safeAreaEdges={["top", "bottom"]} contentContainerStyle={$styles.flex1}>
      <View style={themed($container)}>
        <Text tx="signInScreen:title" preset="heading" style={themed($heading)} />

        <TextField
          labelTx="signInScreen:emailLabel"
          placeholderTx="signInScreen:emailPlaceholder"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          containerStyle={themed($field)}
        />

        <TextField
          labelTx="signInScreen:passwordLabel"
          placeholderTx="signInScreen:passwordPlaceholder"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          containerStyle={themed($field)}
          onSubmitEditing={handleSubmit}
          returnKeyType="done"
        />

        {error ? (
          <Text
            tx={error as Parameters<typeof Text>[0]["tx"]}
            style={themed($errorText)}
            size="sm"
          />
        ) : null}

        {loading ? (
          <ActivityIndicator style={themed($loader)} />
        ) : (
          <>
            <Button
              tx={isSignUp ? "signInScreen:signUpButton" : "signInScreen:signInButton"}
              preset="reversed"
              onPress={handleSubmit}
              style={themed($submitButton)}
            />
            <Button
              tx="signInScreen:signInWithGoogle"
              preset="default"
              onPress={handleGoogleSignIn}
              style={themed($googleButton)}
            />
          </>
        )}

        <View style={themed($toggleRow)}>
          <Text tx={isSignUp ? "signInScreen:haveAccount" : "signInScreen:noAccount"} size="sm" />
          <Button
            tx={isSignUp ? "signInScreen:signInButton" : "signInScreen:signUpButton"}
            preset="default"
            onPress={() => {
              setError(null)
              setIsSignUp((v) => !v)
            }}
            style={themed($toggleButton)}
          />
        </View>
      </View>
    </Screen>
  )
}

const $container: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flex: 1,
  paddingHorizontal: spacing.lg,
  paddingTop: spacing.xxl,
  paddingBottom: spacing.lg,
  justifyContent: "center",
})

const $heading: ThemedStyle<TextStyle> = ({ spacing }) => ({
  marginBottom: spacing.xl,
  textAlign: "center",
})

const $field: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom: spacing.md,
})

const $errorText: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  color: colors.error,
  marginBottom: spacing.sm,
  textAlign: "center",
})

const $loader: ViewStyle = {
  marginVertical: 16,
}

const $submitButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginTop: spacing.sm,
  marginBottom: spacing.sm,
})

const $googleButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom: spacing.lg,
})

const $toggleRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  gap: spacing.xs,
  flexWrap: "wrap",
})

const $toggleButton: ThemedStyle<ViewStyle> = () => ({
  minHeight: 36,
  paddingVertical: 4,
})
