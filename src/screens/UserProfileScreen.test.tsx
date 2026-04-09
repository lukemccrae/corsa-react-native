import { act, fireEvent, render, waitFor } from "@testing-library/react-native"

import { UserProfileScreen } from "./UserProfileScreen"

const mockReplace = jest.fn()
const mockPush = jest.fn()

jest.mock("@/components/Screen", () => {
  const { View } = require("react-native")
  return {
    Screen: ({ children }: { children: React.ReactNode }) => <View>{children}</View>,
  }
})

jest.mock("expo-router", () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: mockPush,
  }),
}))

jest.mock("@/providers/AuthProvider", () => ({
  useAuth: jest.fn(),
}))

jest.mock("@/services/api/graphql", () => ({
  fetchUserProfileByUsername: jest.fn(),
}))

jest.mock("@/theme/context", () => ({
  useAppTheme: jest.fn().mockReturnValue({
    themed: jest.fn().mockReturnValue({}),
  }),
}))

const { useAuth } = require("@/providers/AuthProvider")
const { fetchUserProfileByUsername } = require("@/services/api/graphql")

describe("UserProfileScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockReplace.mockClear()
    mockPush.mockClear()
    fetchUserProfileByUsername.mockResolvedValue({
      username: "johndoe",
      profilePicture: "",
      bio: "Hello world",
      coverImagePath: "",
      liveStreams: [
        {
          streamId: "stream-1",
          title: "Morning run",
          startTime: "2026-04-05T12:00:00.000Z",
          finishTime: null,
          live: true,
          mileMarker: 10.5,
          unitOfMeasure: "IMPERIAL",
        },
      ],
      routes: [
        {
          routeId: "route-1",
          name: "Coastal Loop",
          distanceInMiles: 13.1,
          gainInFeet: 600,
          processingStatus: "COMPLETED",
          createdAt: "2026-04-01T12:00:00.000Z",
          uom: "IMPERIAL",
        },
      ],
    })
  })

  it("renders fetched profile content", async () => {
    useAuth.mockReturnValue({ appUser: null })
    const { getByText } = render(<UserProfileScreen username="johndoe" />)

    await act(async () => {})

    await waitFor(() => expect(fetchUserProfileByUsername).toHaveBeenCalledWith("johndoe"))

    expect(getByText("@johndoe")).toBeTruthy()
    expect(getByText("Hello world")).toBeTruthy()
    expect(getByText("Morning run")).toBeTruthy()
  })

  it("shows own profile badge when viewing current user", async () => {
    useAuth.mockReturnValue({
      appUser: {
        username: "johndoe",
        profilePicture: "",
        bio: "Hello world",
      },
    })

    const { getByText } = render(<UserProfileScreen username="johndoe" />)

    await act(async () => {})

    await waitFor(() => expect(getByText("Your profile")).toBeTruthy())
  })

  it("switches to the routes tab", async () => {
    useAuth.mockReturnValue({ appUser: null })
    const { getAllByText, getByText, queryByText } = render(<UserProfileScreen username="johndoe" />)

    await act(async () => {})

    await waitFor(() => expect(getByText("Morning run")).toBeTruthy())

    fireEvent.press(getAllByText("Routes")[1])

    expect(getByText("Coastal Loop")).toBeTruthy()
    expect(queryByText("Morning run")).toBeNull()
  })

  it("navigates to a stream detail screen", async () => {
    useAuth.mockReturnValue({ appUser: null })
    const { getByText } = render(<UserProfileScreen username="johndoe" />)

    await act(async () => {})

    await waitFor(() => expect(getByText("Morning run")).toBeTruthy())

    fireEvent.press(getByText("Morning run"))

    expect(mockPush).toHaveBeenCalledWith("/(app)/user/johndoe/stream/stream-1")
  })
})
