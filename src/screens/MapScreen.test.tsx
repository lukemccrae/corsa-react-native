import { act, fireEvent, render } from "@testing-library/react-native"
import * as Location from "expo-location"

import { MapScreen } from "./MapScreen"

jest.mock("expo-location", () => ({
  PermissionStatus: {
    GRANTED: "granted",
    DENIED: "denied",
    UNDETERMINED: "undetermined",
  },
  Accuracy: { Balanced: 3 },
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
}))

const mockPush = jest.fn()
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
}))

const mockUseAuth = jest.fn()
jest.mock("@/providers/AuthProvider", () => ({
  useAuth: () => mockUseAuth(),
}))

jest.mock("@/components/Map/MapLibreMap", () => ({
  MapLibreMap: jest.fn(() => null),
}))

jest.mock("@/theme/context", () => ({
  useAppTheme: jest.fn().mockReturnValue({
    themed: jest.fn().mockReturnValue({}),
  }),
}))

describe("MapScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseAuth.mockReturnValue({ user: null, appUser: null, signOut: jest.fn() })
  })

  it("shows location error toast when getCurrentPositionAsync throws during initial permission request", async () => {
    ;(Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
      status: "granted",
    })
    ;(Location.getCurrentPositionAsync as jest.Mock).mockRejectedValue(
      new Error("Current location is unavailable. Make sure that location services are enabled"),
    )

    const { findByText } = render(<MapScreen />)

    // Error toast should appear after the rejected location request
    await findByText("mapScreen:locationError")
  })

  it("does not show location error toast when location is successfully obtained", async () => {
    ;(Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
      status: "granted",
    })
    ;(Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue({
      coords: { latitude: 37.7749, longitude: -122.4194 },
    })

    const { queryByText } = render(<MapScreen />)
    await act(async () => {})

    expect(queryByText("mapScreen:locationError")).toBeNull()
  })

  it("shows permission denied banner when location permission is denied", async () => {
    ;(Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
      status: "denied",
    })

    const { findByText } = render(<MapScreen />)

    await findByText("mapScreen:locationPermissionDenied")
  })

  it("renders profile badge with username when user and appUser are present", async () => {
    mockUseAuth.mockReturnValue({
      user: { uid: "user123" },
      appUser: { username: "testuser", profilePicture: "" },
      signOut: jest.fn(),
    })
    ;(Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
      status: "undetermined",
    })

    const { findByText } = render(<MapScreen />)
    await findByText("testuser")
  })

  it("navigates to user profile when profile badge is pressed", async () => {
    mockUseAuth.mockReturnValue({
      user: { uid: "user123" },
      appUser: { username: "testuser", profilePicture: "" },
      signOut: jest.fn(),
    })
    ;(Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
      status: "undetermined",
    })

    const { getByLabelText } = render(<MapScreen />)
    await act(async () => {})

    const badge = getByLabelText("View profile for testuser")
    fireEvent.press(badge)

    expect(mockPush).toHaveBeenCalledWith("/(app)/user/testuser")
  })
})
