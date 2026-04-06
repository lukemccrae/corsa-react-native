import { render } from "@testing-library/react-native"

import { MapLibreMap } from "./MapLibreMap"

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

describe("MapLibreMap", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("does not render UserLocation when showUserLocation is false", () => {
    render(<MapLibreMap showUserLocation={false} />)
    expect(mockUserLocation).not.toHaveBeenCalled()
  })

  it("renders UserLocation with animated={false} when showUserLocation is true", () => {
    render(<MapLibreMap showUserLocation={true} />)
    expect(mockUserLocation).toHaveBeenCalledWith(
      expect.objectContaining({ animated: false, visible: true }),
    )
  })

  it("renders stream overlays for tracks, waypoints, and post markers", () => {
    render(
      <MapLibreMap
        trackCoordinates={[
          { latitude: 45.5, longitude: -122.6 },
          { latitude: 45.6, longitude: -122.5 },
        ]}
        waypointMarkers={[
          { id: "wp-1", latitude: 45.5, longitude: -122.6 },
          { id: "wp-2", latitude: 45.6, longitude: -122.5 },
        ]}
        postMarkers={[{ id: "post-1", latitude: 45.55, longitude: -122.55, title: "Status post" }]}
        currentLocationMarker={{ latitude: 45.58, longitude: -122.54 }}
      />,
    )

    expect(mockShapeSource).toHaveBeenCalledTimes(2)
    expect(mockLineLayer).toHaveBeenCalledTimes(1)
    expect(mockCircleLayer).toHaveBeenCalledTimes(1)
    expect(mockMarkerView).toHaveBeenCalledTimes(2)
  })
})
