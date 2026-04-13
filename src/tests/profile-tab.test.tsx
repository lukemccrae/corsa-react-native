import { ActivityIndicator } from "react-native"
import { act, render } from "@testing-library/react-native"

import ProfileTab from "@/app/(app)/(tabs)/profile"

const mockUseAuth = jest.fn()
const mockReplace = jest.fn()

jest.mock("expo-router", () => {
  return {
    useRouter: () => ({ replace: mockReplace }),
  }
})

jest.mock("@/providers/AuthProvider", () => ({
  useAuth: () => mockUseAuth(),
}))

jest.mock("@/theme/context", () => ({
  useAppTheme: () => ({
    themed: (style: unknown) => style,
  }),
}))

jest.mock("@/screens/UserProfileScreen", () => {
  const { View, Text } = require("react-native")
  return {
    UserProfileScreen: ({ username }: { username: string }) => (
      <View>
        <Text>{username}</Text>
      </View>
    ),
  }
})

describe("ProfileTab", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("shows a loading state and does not redirect while auth is loading", async () => {
    mockUseAuth.mockReturnValue({ user: null, appUser: null, loading: true })

    const { UNSAFE_getByType } = render(<ProfileTab />)

    await act(async () => {})

    expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy()
  })

  it("redirects to sign-in when unauthenticated and not loading", async () => {
    mockUseAuth.mockReturnValue({ user: null, appUser: null, loading: false })

    const { UNSAFE_getByType } = render(<ProfileTab />)

    await act(async () => {})

    expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy()
    expect(mockReplace).toHaveBeenCalledWith("/(auth)/sign-in")
  })

  it("shows a fallback message when authenticated but appUser is still missing after loading", async () => {
    mockUseAuth.mockReturnValue({
      user: { uid: "user123" },
      appUser: null,
      loading: false,
    })

    const { getByText } = render(<ProfileTab />)

    await act(async () => {})

    expect(
      getByText(
        "Your account is signed in, but the profile record could not be loaded. Try reopening the tab or signing in again.",
      ),
    ).toBeTruthy()
  })

  it("renders UserProfileScreen when authenticated and appUser is loaded", async () => {
    mockUseAuth.mockReturnValue({
      user: { uid: "user123" },
      appUser: { username: "testuser" },
      loading: false,
    })

    const { getByText } = render(<ProfileTab />)

    await act(async () => {})

    expect(getByText("testuser")).toBeTruthy()
  })

  it("keeps showing profile content for an authenticated user", async () => {
    mockUseAuth.mockReturnValue({
      user: { uid: "user123" },
      appUser: { username: "testuser" },
      loading: false,
    })

    const { getByText } = render(<ProfileTab />)

    await act(async () => {})

    expect(getByText("testuser")).toBeTruthy()
  })
})
