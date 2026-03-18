import { render } from "@testing-library/react-native"

import { MapLibreMap } from "./MapLibreMap"

const mockUserLocation = jest.fn((_props: object) => null)
const mockCamera = jest.fn((_props: object) => null)
const mockMapView = jest.fn(({ children }: { children?: React.ReactNode }) => children ?? null)

jest.mock("@maplibre/maplibre-react-native", () => ({
  __esModule: true,
  default: {
    MapView: (props: object) => mockMapView(props),
    Camera: (props: object) => mockCamera(props),
    UserLocation: (props: object) => mockUserLocation(props),
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
})
