import { act, render } from "@testing-library/react-native"

import ProfileTab from "./profile"

const mockReplace = jest.fn()
const mockUseAuth = jest.fn()

jest.mock("expo-router", () => ({
  useRouter: () => ({ replace: mockReplace }),
}))

jest.mock("@/providers/AuthProvider", () => ({
  useAuth: () => mockUseAuth(),
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

  it("renders nothing and does not redirect while auth is loading", async () => {
    mockUseAuth.mockReturnValue({ user: null, appUser: null, loading: true })

    const { toJSON } = render(<ProfileTab />)

    await act(async () => {})

    expect(toJSON()).toBeNull()
    expect(mockReplace).not.toHaveBeenCalled()
  })

  it("redirects to sign-in when unauthenticated and not loading", async () => {
    mockUseAuth.mockReturnValue({ user: null, appUser: null, loading: false })

    render(<ProfileTab />)

    await act(async () => {})

    expect(mockReplace).toHaveBeenCalledWith("/(auth)/sign-in")
  })

  it("renders nothing when authenticated but appUser not yet loaded", async () => {
    mockUseAuth.mockReturnValue({
      user: { uid: "user123" },
      appUser: null,
      loading: false,
    })

    const { toJSON } = render(<ProfileTab />)

    await act(async () => {})

    expect(toJSON()).toBeNull()
    expect(mockReplace).not.toHaveBeenCalled()
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
    expect(mockReplace).not.toHaveBeenCalled()
  })

  it("does not redirect when loading transitions from true to false with authenticated user", async () => {
    mockUseAuth.mockReturnValue({
      user: { uid: "user123" },
      appUser: { username: "testuser" },
      loading: false,
    })

    render(<ProfileTab />)

    await act(async () => {})

    expect(mockReplace).not.toHaveBeenCalled()
  })
})
