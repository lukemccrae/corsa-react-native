import { act, fireEvent, render, waitFor } from "@testing-library/react-native"

import { UserStreamSettingsScreen } from "./UserStreamSettingsScreen"

const mockBack = jest.fn()
const mockReplace = jest.fn()
const mockGetIdToken = jest.fn()

jest.mock("expo-router", () => ({
  useRouter: () => ({
    back: mockBack,
    replace: mockReplace,
  }),
}))

jest.mock("@/components/Screen", () => {
  const { View } = require("react-native")
  return {
    Screen: ({ children }: { children: React.ReactNode }) => <View>{children}</View>,
  }
})

jest.mock("@/components/Icon", () => ({
  Icon: () => null,
}))

jest.mock("@/providers/AuthProvider", () => ({
  useAuth: jest.fn(),
}))

jest.mock("@/services/api/graphql", () => ({
  fetchUserProfileByUsername: jest.fn(),
  upsertLiveStream: jest.fn(),
}))

jest.mock("@/theme/context", () => ({
  useAppTheme: jest.fn().mockReturnValue({
    themed: jest.fn().mockReturnValue({}),
  }),
}))

const { useAuth } = require("@/providers/AuthProvider")
const { fetchUserProfileByUsername, upsertLiveStream } = require("@/services/api/graphql")

describe("UserStreamSettingsScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetIdToken.mockResolvedValue("token-123")

    useAuth.mockReturnValue({
      appUser: {
        userId: "user-1",
        username: "johndoe",
      },
      user: {
        getIdToken: mockGetIdToken,
      },
    })

    fetchUserProfileByUsername.mockResolvedValue({
      userId: "user-1",
      username: "johndoe",
      devices: [
        {
          deviceId: "device-1",
          name: "Garmin Edge",
          make: "GARMIN",
          model: "1040",
          lastLocation: { lat: 39.7392, lng: -104.9903 },
        },
        {
          deviceId: "device-2",
          name: "Wahoo Bolt",
          make: "WAHOO",
          model: "Bolt",
          lastLocation: { lat: 40.015, lng: -105.2705 },
        },
      ],
      routes: [
        {
          routeId: "route-1",
          name: "Foothills",
          distanceInMiles: 9.5,
          gainInFeet: 850,
        },
        {
          routeId: "route-2",
          name: "Ridgeline",
          distanceInMiles: 14.25,
          gainInFeet: 2100,
        },
      ],
      liveStreams: [
        {
          streamId: "stream-1",
          title: "Morning run",
          startTime: "2026-04-05T12:00:00.000Z",
          finishTime: null,
          live: true,
          published: true,
          delayInSeconds: 15,
          timezone: "America/Denver",
          slug: "morning-run",
          currentLocation: { lat: 39.7392, lng: -104.9903 },
          sponsors: [],
          device: { deviceId: "device-1" },
          route: { routeId: "route-1", name: "Foothills" },
          unitOfMeasure: "IMPERIAL",
        },
      ],
    })

    upsertLiveStream.mockResolvedValue({ success: true, message: null })
  })

  it("renders the editable settings form for the stream owner", async () => {
    const { getByDisplayValue, getByText } = render(
      <UserStreamSettingsScreen username="johndoe" streamId="stream-1" />,
    )

    await act(async () => {})
    await waitFor(() => expect(fetchUserProfileByUsername).toHaveBeenCalledWith("johndoe"))

    expect(getByText("Livestream settings")).toBeTruthy()
    expect(getByDisplayValue("Morning run")).toBeTruthy()
    expect(getByDisplayValue("2026-04-05 12:00")).toBeTruthy()
    expect(getByText("America/Denver")).toBeTruthy()
    expect(getByText("Garmin Edge • GARMIN 1040")).toBeTruthy()
    expect(getByText("Foothills")).toBeTruthy()
  })

  it("submits an upsert and returns to the stream screen", async () => {
    const { getByDisplayValue, getByText } = render(
      <UserStreamSettingsScreen username="johndoe" streamId="stream-1" />,
    )

    await act(async () => {})
    await waitFor(() => expect(getByDisplayValue("Morning run")).toBeTruthy())

    fireEvent.changeText(getByDisplayValue("Morning run"), "Evening run")
    fireEvent.changeText(getByDisplayValue("2026-04-05 12:00"), "2026-04-06 06:30")
    fireEvent.press(getByText("America/Denver"))
    await waitFor(() => expect(getByText("Select timezone")).toBeTruthy())
    fireEvent.press(getByText("America/New_York"))
    fireEvent.press(getByText("Garmin Edge • GARMIN 1040"))
    await waitFor(() => expect(getByText("Select device")).toBeTruthy())
    fireEvent.press(getByText("Wahoo Bolt • WAHOO Bolt"))
    fireEvent.press(getByText("Foothills"))
    await waitFor(() => expect(getByText("Select route")).toBeTruthy())
    fireEvent.press(getByText("Ridgeline"))
    fireEvent.press(getByText("Save changes"))

    await waitFor(() =>
      expect(upsertLiveStream).toHaveBeenCalledWith(
        expect.objectContaining({
          streamId: "stream-1",
          title: "Evening run",
          startTime: "2026-04-06T06:30:00.000Z",
          userId: "user-1",
          username: "johndoe",
          deviceId: "device-2",
          routeId: "route-2",
          timezone: "America/New_York",
          currentLocation: { lat: 40.015, lng: -105.2705 },
        }),
        "token-123",
      ),
    )

    expect(mockReplace).toHaveBeenCalledWith("/(app)/user/johndoe/stream/stream-1")
  })

  it("navigates back to stream when pressing Cancel", async () => {
    const { getByText } = render(
      <UserStreamSettingsScreen username="johndoe" streamId="stream-1" />,
    )

    await act(async () => {})
    await waitFor(() => expect(getByText("Cancel")).toBeTruthy())

    fireEvent.press(getByText("Cancel"))

    expect(mockReplace).toHaveBeenCalledWith("/(app)/user/johndoe/stream/stream-1")
  })
})