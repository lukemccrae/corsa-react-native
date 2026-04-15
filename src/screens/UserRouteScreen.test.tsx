import { act, render, waitFor } from "@testing-library/react-native"
import * as Location from "expo-location"

import { UserRouteScreen } from "./UserRouteScreen"

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockReplace = jest.fn()

jest.mock("expo-router", () => ({
  useRouter: () => ({ replace: mockReplace }),
}))

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}))

jest.mock("expo-location", () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  PermissionStatus: { GRANTED: "granted", DENIED: "denied" },
}))

jest.mock("@/theme/context", () => ({
  useAppTheme: jest.fn().mockReturnValue({
    themed: jest.fn().mockReturnValue({}),
  }),
}))

jest.mock("@/services/api/graphql", () => ({
  fetchUserRouteById: jest.fn(),
}))

const mockUserLocation = jest.fn((_props: object) => null)
const mockCamera = jest.fn((_props: object) => null)
const mockMapView = jest.fn(({ children }: { children?: React.ReactNode }) => children ?? null)
const mockMarkerView = jest.fn(({ children }: { children?: React.ReactNode }) => children ?? null)
const mockShapeSource = jest.fn(({ children }: { children?: React.ReactNode }) => children ?? null)
const mockLineLayer = jest.fn((_props: object) => null)
const mockCircleLayer = jest.fn((_props: object) => null)

jest.mock("@maplibre/maplibre-react-native", () => ({
  __esModule: true,
  default: {
    MapView: (props: object) => mockMapView(props),
    Camera: (props: object) => mockCamera(props),
    UserLocation: (props: object) => mockUserLocation(props),
    MarkerView: (props: object) => mockMarkerView(props),
    ShapeSource: (props: object) => mockShapeSource(props),
    LineLayer: (props: object) => mockLineLayer(props),
    CircleLayer: (props: object) => mockCircleLayer(props),
    setAccessToken: jest.fn(),
  },
}))

// ── Helpers ────────────────────────────────────────────────────────────────────

const { fetchUserRouteById } = require("@/services/api/graphql")

const MOCK_ROUTE_RESULT = {
  user: {
    username: "trailrunner",
    profilePicture: null,
  },
  route: {
    routeId: "route-abc",
    name: "Summit Trail",
    distanceInMiles: 8.4,
    gainInFeet: 2100,
    processingStatus: "COMPLETED",
    createdAt: "2026-03-15T10:00:00.000Z",
    uom: "IMPERIAL",
    storagePath: null,
  },
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("UserRouteScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
      status: Location.PermissionStatus.GRANTED,
    })
    fetchUserRouteById.mockResolvedValue(MOCK_ROUTE_RESULT)
  })

  it("renders the compact profile badge with route name and stats at the top of the map", async () => {
    const { getByText } = render(<UserRouteScreen username="trailrunner" routeId="route-abc" />)

    await act(async () => {})
    await waitFor(() => expect(getByText("Summit Trail")).toBeTruthy())

    // Route name is visible in the badge
    expect(getByText("Summit Trail")).toBeTruthy()
    // Username + distance + gain are in the compact subtitle
    expect(getByText("@trailrunner · 8.40 mi · +2100 ft")).toBeTruthy()
  })

  it("renders the elevation panel header with 'Elevation' and 'Drag to scrub' labels", async () => {
    const { getByText } = render(<UserRouteScreen username="trailrunner" routeId="route-abc" />)

    await act(async () => {})
    await waitFor(() => expect(getByText("Elevation")).toBeTruthy())

    expect(getByText("Elevation")).toBeTruthy()
    expect(getByText("Drag to scrub")).toBeTruthy()
  })

  it("requests location permission on mount", async () => {
    render(<UserRouteScreen username="trailrunner" routeId="route-abc" />)

    await act(async () => {})

    expect(Location.requestForegroundPermissionsAsync).toHaveBeenCalled()
  })

  it("passes showUserLocation=true to MapLibreMap when location is granted", async () => {
    render(<UserRouteScreen username="trailrunner" routeId="route-abc" />)

    await act(async () => {})
    await waitFor(() =>
      expect(mockUserLocation).toHaveBeenCalledWith(
        expect.objectContaining({ animated: false, visible: true }),
      ),
    )
  })

  it("does not render UserLocation when location permission is denied", async () => {
    ;(Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
      status: Location.PermissionStatus.DENIED,
    })

    render(<UserRouteScreen username="trailrunner" routeId="route-abc" />)

    await act(async () => {})

    expect(mockUserLocation).not.toHaveBeenCalled()
  })

  it("shows 'Route not found' when route fetch returns null", async () => {
    fetchUserRouteById.mockResolvedValue(null)

    const { getByText } = render(<UserRouteScreen username="trailrunner" routeId="route-abc" />)

    await act(async () => {})
    await waitFor(() => expect(getByText("Route not found")).toBeTruthy())
  })

  it("shows an error message when route fetch fails", async () => {
    fetchUserRouteById.mockRejectedValue(new Error("Network error"))

    const { getByText } = render(<UserRouteScreen username="trailrunner" routeId="route-abc" />)

    await act(async () => {})
    await waitFor(() => expect(getByText("Network error")).toBeTruthy())
  })

  it("navigates back to user profile on back button press", async () => {
    const { getByText } = render(<UserRouteScreen username="trailrunner" routeId="route-abc" />)

    await act(async () => {})

    const { fireEvent } = require("@testing-library/react-native")
    fireEvent.press(getByText("← Back"))

    expect(mockReplace).toHaveBeenCalledWith("/(app)/user/trailrunner")
  })
})
