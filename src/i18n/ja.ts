import { Translations } from "./en"

const ja: Translations = {
  common: {
    ok: "OK",
    cancel: "キャンセル",
    back: "戻る",
  },
  welcomeScreen: {
    postscript:
      "注目！ — このアプリはお好みの見た目では無いかもしれません(デザイナーがこのスクリーンを送ってこない限りは。もしそうなら公開しちゃいましょう！)",
    readyForLaunch: "このアプリはもう少しで公開できます！",
    exciting: "(楽しみですね！)",
  },
  errorScreen: {
    title: "問題が発生しました",
    friendlySubtitle:
      "本番では、エラーが投げられた時にこのページが表示されます。もし使うならこのメッセージに変更を加えてください(`app/i18n/jp.ts`)レイアウトはこちらで変更できます(`app/screens/ErrorScreen`)。もしこのスクリーンを取り除きたい場合は、`app/app.tsx`にある<ErrorBoundary>コンポーネントをチェックしてください",
    reset: "リセット",
  },
  emptyStateComponent: {
    generic: {
      heading: "静かだ...悲しい。",
      content:
        "データが見つかりません。ボタンを押してアプリをリロード、またはリフレッシュしてください。",
      button: "もう一度やってみよう",
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
    routes: "ルート",
    devices: "デバイス",
    streams: "ストリーム",
    myProfile: "マイプロフィール",
    logOut: "ログアウト",
  },
  userProfileScreen: {
    title: "プロフィール",
    bio: "自己紹介",
    noBio: "まだ自己紹介がありません。",
    viewProfile: "{{username}}のプロフィールを見る",
  },
}

export default ja
