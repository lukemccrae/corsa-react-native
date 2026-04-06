import { render } from "@testing-library/react-native"

import { UserProfileScreen } from "./UserProfileScreen"

jest.mock("@/components/Screen", () => {
  const { View } = require("react-native")
  return {
    Screen: ({ children }: { children: React.ReactNode }) => <View>{children}</View>,
  }
})

jest.mock("@/providers/AuthProvider", () => ({
  useAuth: jest.fn(),
}))

jest.mock("@/theme/context", () => ({
  useAppTheme: jest.fn().mockReturnValue({
    themed: jest.fn().mockReturnValue({}),
  }),
}))

const { useAuth } = require("@/providers/AuthProvider")

describe("UserProfileScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("renders the username", () => {
    useAuth.mockReturnValue({ appUser: null })
    const { getByText } = render(<UserProfileScreen username="johndoe" />)
    expect(getByText("johndoe")).toBeTruthy()
  })

  it("renders bio for own profile", () => {
    useAuth.mockReturnValue({
      appUser: {
        username: "johndoe",
        profilePicture: "",
        bio: "Hello world",
      },
    })

    const { getByText } = render(<UserProfileScreen username="johndoe" />)
    expect(getByText("johndoe")).toBeTruthy()
    expect(getByText("Hello world")).toBeTruthy()
  })

  it("renders fallback avatar when no profile picture", () => {
    useAuth.mockReturnValue({
      appUser: {
        username: "johndoe",
        profilePicture: "",
        bio: null,
      },
    })

    const { getByText } = render(<UserProfileScreen username="johndoe" />)
    expect(getByText("johndoe")).toBeTruthy()
  })

  it("shows noBio translation key when bio is null for own profile", () => {
    useAuth.mockReturnValue({
      appUser: {
        username: "johndoe",
        profilePicture: "",
        bio: null,
      },
    })

    const { getByText } = render(<UserProfileScreen username="johndoe" />)
    expect(getByText("userProfileScreen:noBio")).toBeTruthy()
  })
})
