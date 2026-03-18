const en = {
  common: {
    ok: "OK!",
    cancel: "Cancel",
    back: "Back",
  },
  welcomeScreen: {
    postscript:
      "psst  — This probably isn't what your app looks like. (Unless your designer handed you these screens, and in that case, ship it!)",
    readyForLaunch: "Your app, almost ready for launch!",
    exciting: "(ohh, this is exciting!)",
  },
  errorScreen: {
    title: "Something went wrong!",
    friendlySubtitle:
      "This is the screen that your users will see in production when an error is thrown. You'll want to customize this message (located in `app/i18n/en.ts`) and probably the layout as well (`app/screens/ErrorScreen`). If you want to remove this entirely, check `app/app.tsx` for the <ErrorBoundary> component.",
    reset: "RESET APP",
  },
  emptyStateComponent: {
    generic: {
      heading: "So empty... so sad",
      content: "No data found yet. Try clicking the button to refresh or reload the app.",
      button: "Let's try this again",
    },
  },
  signInScreen: {
    title: "Sign In",
    emailLabel: "Email",
    emailPlaceholder: "you@example.com",
    passwordLabel: "Password",
    passwordPlaceholder: "••••••••",
    signInButton: "Sign In",
    signUpButton: "Create Account",
    signInWithGoogle: "Continue with Google",
    noAccount: "Don't have an account?",
    haveAccount: "Already have an account?",
    errorInvalidCredentials: "Invalid email or password.",
    errorGeneric: "Sign in failed. Please try again.",
  },
  mapScreen: {
    centerOnMe: "Center on me",
    signIn: "Sign in",
    signOut: "Sign out",
    locationPermissionDenied: "Location access denied.",
    locationPermissionMessage: "Enable location in Settings to see your position on the map.",
    openSettings: "Open Settings",
    retry: "Retry",
    locationError: "Could not get your location. Please try again.",
  },
}

export default en
export type Translations = typeof en
