import { Translations } from "./en"

const hi: Translations = {
  common: {
    ok: "ठीक है!",
    cancel: "रद्द करें",
    back: "वापस",
  },
  welcomeScreen: {
    postscript:
      "psst - शायद आपका ऐप ऐसा नहीं दिखता है। (जब तक कि आपके डिजाइनर ने आपको ये स्क्रीन नहीं दी हों, और उस स्थिति में, इसे लॉन्च करें!)",
    readyForLaunch: "आपका ऐप, लगभग लॉन्च के लिए तैयार है!",
    exciting: "(ओह, यह रोमांचक है!)",
  },
  errorScreen: {
    title: "कुछ गलत हो गया!",
    friendlySubtitle:
      "यह वह स्क्रीन है जो आपके उपयोगकर्ता संचालन में देखेंगे जब कोई त्रुटि होगी। आप इस संदेश को बदलना चाहेंगे (जो `app/i18n/hi.ts` में स्थित है) और शायद लेआउट भी (`app/screens/ErrorScreen`)। यदि आप इसे पूरी तरह से हटाना चाहते हैं, तो `app/app.tsx` में <ErrorBoundary> कंपोनेंट की जांच करें।",
    reset: "ऐप रीसेट करें",
  },
  emptyStateComponent: {
    generic: {
      heading: "इतना खाली... इतना उदास",
      content: "अभी तक कोई डेटा नहीं मिला। रीफ्रेश करने या ऐप को पुनः लोड करने के लिए बटन दबाएं।",
      button: "चलो फिर से कोशिश करते हैं",
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
    routes: "मार्ग",
    devices: "डिवाइस",
    streams: "स्ट्रीम्स",
    myProfile: "मेरी प्रोफ़ाइल",
    logOut: "लॉगआउट",
  },
  userProfileScreen: {
    title: "प्रोफ़ाइल",
    bio: "जीवनी",
    noBio: "अभी तक कोई जीवनी नहीं।",
    viewProfile: "{{username}} की प्रोफ़ाइल देखें",
  },
}

export default hi
