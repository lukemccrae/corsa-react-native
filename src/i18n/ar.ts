import { Translations } from "./en"

const ar: Translations = {
  common: {
    ok: "نعم",
    cancel: "حذف",
    back: "خلف",
  },
  welcomeScreen: {
    postscript:
      "ربما لا يكون هذا هو الشكل الذي يبدو عليه تطبيقك مالم يمنحك المصمم هذه الشاشات وشحنها في هذه الحالة",
    readyForLaunch: "تطبيقك تقريبا جاهز للتشغيل",
    exciting: "اوه هذا مثير",
  },
  errorScreen: {
    title: "هناك خطأ ما",
    friendlySubtitle:
      "هذه هي الشاشة التي سيشاهدها المستخدمون في عملية الانتاج عند حدوث خطأ. سترغب في تخصيص هذه الرسالة ( الموجودة في 'ts.en/i18n/app') وربما التخطيط ايضاً ('app/screens/ErrorScreen'). إذا كنت تريد إزالة هذا بالكامل، تحقق من 'app/app.tsp' من اجل عنصر <ErrorBoundary>.",
    reset: "اعادة تعيين التطبيق",
  },
  emptyStateComponent: {
    generic: {
      heading: "فارغة جداً....حزين",
      content: "لا توجد بيانات حتى الآن. حاول النقر فوق الزر لتحديث التطبيق او اعادة تحميله.",
      button: "لنحاول هذا مرّة أخرى",
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
  userProfileScreen: {
    title: "الملف الشخصي",
    bio: "السيرة الذاتية",
    noBio: "لا توجد سيرة ذاتية بعد.",
    viewProfile: "عرض الملف الشخصي لـ {{username}}",
  },
}

export default ar
