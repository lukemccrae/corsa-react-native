import { Translations } from "./en"

const es: Translations = {
  common: {
    ok: "OK",
    cancel: "Cancelar",
    back: "Volver",
  },
  welcomeScreen: {
    postscript:
      "psst — Esto probablemente no es cómo se va a ver tu app. (A menos que tu diseñador te haya enviado estas pantallas, y en ese caso, ¡lánzalas en producción!)",
    readyForLaunch: "Tu app, casi lista para su lanzamiento",
    exciting: "(¡ohh, esto es emocionante!)",
  },
  errorScreen: {
    title: "¡Algo salió mal!",
    friendlySubtitle:
      "Esta es la pantalla que verán tus usuarios en producción cuando haya un error. Vas a querer personalizar este mensaje (que está ubicado en `app/i18n/es.ts`) y probablemente también su diseño (`app/screens/ErrorScreen`). Si quieres eliminarlo completamente, revisa `app/app.tsx` y el componente <ErrorBoundary>.",
    reset: "REINICIA LA APP",
  },
  emptyStateComponent: {
    generic: {
      heading: "Muy vacío... muy triste",
      content:
        "No se han encontrado datos por el momento. Intenta darle clic en el botón para refrescar o recargar la app.",
      button: "Intentemos de nuevo",
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
  profileMenu: {
    routes: "Rutas",
    devices: "Dispositivos",
    streams: "Transmisiones",
    myProfile: "Mi Perfil",
    logOut: "Cerrar sesión",
  },
  userProfileScreen: {
    title: "Perfil",
    bio: "Biografía",
    noBio: "Sin biografía todavía.",
    viewProfile: "Ver perfil de {{username}}",
  },
}

export default es
