import { act, render } from "@testing-library/react-native"
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

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn() }),
}))

jest.mock("@/providers/AuthProvider", () => ({
  useAuth: () => ({ user: null, signOut: jest.fn() }),
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
})
