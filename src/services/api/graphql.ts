import type {
  ChatMessage,
  DeleteDeviceResponse,
  DeleteRouteResponse,
  Device,
  LiveStream,
  Route,
  User,
} from "@/generated/schema"

type GraphQLError = {
  message: string
}

type PublishChatResponse = {
  publishChat?: ChatMessage | null
}

type UpsertDeviceResponse = {
  upsertDevice?: Device | null
}

type DeleteDeviceMutationResponse = {
  deleteDevice?: DeleteDeviceResponse | null
}

type RecalibrateRouteResponse = {
  recalibrateRoute?: Route | null
}

type DeleteRouteMutationResponse = {
  deleteRoute?: DeleteRouteResponse | null
}

type GetUserByUserIdResponse = {
  data?: {
    getUserByUserId?: User | null
  }
  errors?: GraphQLError[]
}

type GetUserByUserNameResponse = {
  data?: {
    getUserByUserName?: User | null
  }
  errors?: GraphQLError[]
}

type GetStreamsByEntityResponse = {
  data?: {
    getStreamsByEntity?: Array<LiveStream | null> | null
  }
  errors?: GraphQLError[]
}

const appSyncEndpoint =
  process.env.EXPO_PUBLIC_APPSYNC_ENDPOINT ?? process.env.APPSYNC_ENDPOINT ?? ""

const appSyncApiKey =
  process.env.EXPO_PUBLIC_APPSYNC_API_KEY ?? process.env.APPSYNC_API_KEY ?? ""

const cloudFrontPhotoUrl = process.env.EXPO_PUBLIC_CLOUDFRONT_PHOTO_URL ?? ""
const geoJsonCdnBaseUrl =
  process.env.EXPO_PUBLIC_GEOJSON_CDN_BASE_URL ?? "https://d2mg2mxj6r88wt.cloudfront.net"

const GET_USER_BY_USER_ID = `
  query GetUserByUserId($userId: ID!) {
    getUserByUserId(userId: $userId) {
      userId
      username
      profilePicture
      bio
      coverImagePath
      live
      streamId
    }
  }
`

const USER_PROFILE_FIELDS = `
  userId
  username
  profilePicture
  bio
  coverImagePath
  live
  streamId
  devices {
    imei
    deviceId
    name
    make
    model
    shareUrl
    status
    lastSeenAt
    verifiedAt
  }
  liveStreams {
    streamId
    title
    startTime
    finishTime
    live
    published
    mileMarker
    timezone
    unitOfMeasure
    currentLocation {
      lat
      lng
    }
    publicUser {
      profilePicture
      username
      userId
      bio
    }
    route {
      routeId
      name
      distanceInMiles
      gainInFeet
      processingStatus
      createdAt
      overlayPath
      storagePath
      uom
    }
  }
  routes {
    routeId
    name
    distanceInMiles
    gainInFeet
    storagePath
    overlayPath
    processingStatus
    createdAt
    uom
    publicUser {
      profilePicture
      username
      userId
      bio
    }
  }
`

const GET_USER_PROFILE_BY_USERNAME = `
  query GetUserProfileByUsername($username: ID!) {
    getUserByUserName(username: $username) {
      ${USER_PROFILE_FIELDS}
    }
  }
`

const GET_USER_STREAM_BY_ID = `
  query GetUserStreamById($username: ID!, $streamId: ID!) {
    getUserByUserName(username: $username) {
      userId
      username
      profilePicture
      bio
      coverImagePath
      liveStreams(streamId: $streamId) {
        streamId
        title
        startTime
        finishTime
        live
        published
        mileMarker
        timezone
        unitOfMeasure
        currentLocation {
          lat
          lng
        }
        publicUser {
          profilePicture
          username
          userId
          bio
        }
        route {
          routeId
          name
          distanceInMiles
          gainInFeet
          processingStatus
          createdAt
          overlayPath
          storagePath
          uom
        }
        waypoints {
          altitude
          lat
          lng
          mileMarker
          pointIndex
          private
          streamId
          timestamp
        }
        posts {
          __typename
          createdAt
          type
          userId
          location {
            lat
            lng
          }
          ... on StatusPost {
            text
            imagePath
            media {
              path
              type
              contentType
            }
          }
          ... on PhotoPost {
            text
            images
          }
          ... on LivestreamPost {
            text
          }
        }
        chatMessages {
          text
          createdAt
          publicUser {
            username
            profilePicture
            userId
            bio
          }
        }
      }
    }
  }
`

const GET_USER_ROUTE_BY_ID = `
  query GetUserRouteById($username: ID!) {
    getUserByUserName(username: $username) {
      userId
      username
      profilePicture
      bio
      coverImagePath
      routes {
        routeId
        name
        distanceInMiles
        gainInFeet
        storagePath
        overlayPath
        processingStatus
        createdAt
        uom
        publicUser {
          profilePicture
          username
          userId
          bio
        }
      }
    }
  }
`

const GET_STREAMS_BY_ENTITY = `
  query GetStreamsByEntity($entity: String) {
    getStreamsByEntity(entity: $entity) {
      streamId
      title
      startTime
      finishTime
      live
      published
      mileMarker
      timezone
      unitOfMeasure
      currentLocation {
        lat
        lng
      }
      publicUser {
        profilePicture
        username
        userId
        bio
      }
      route {
        routeId
        name
        distanceInMiles
        gainInFeet
        processingStatus
        createdAt
        overlayPath
        storagePath
        uom
      }
    }
  }
`

function resolveCloudFrontUrl(path: string | null | undefined): string {
  if (!path) return ""
  if (/^https?:\/\//i.test(path)) return path
  if (!cloudFrontPhotoUrl) return path

  const normalizedBaseUrl = cloudFrontPhotoUrl.replace(/\/+$/, "")
  const normalizedPath = path.startsWith("/") ? path : `/${path}`

  return `${normalizedBaseUrl}${normalizedPath}`
}

function resolveGeoJsonUrl(path: string | null | undefined): string {
  if (!path) return ""
  if (/^https?:\/\//i.test(path)) return path

  const normalizedBaseUrl = geoJsonCdnBaseUrl.replace(/\/+$/, "")
  const normalizedPath = path.startsWith("/") ? path : `/${path}`

  return `${normalizedBaseUrl}${normalizedPath}`
}

function normalizeUserImagePaths(user: User): User {
  return {
    ...user,
    profilePicture: resolveCloudFrontUrl(user.profilePicture),
    coverImagePath: resolveCloudFrontUrl(user.coverImagePath),
    devices: user.devices?.map((device) => device ?? null) ?? null,
    liveStreams: user.liveStreams?.map((stream) => normalizeLiveStream(stream ?? null)) ?? null,
    routes: user.routes?.map((route) => normalizeRoute(route ?? null)) ?? null,
  }
}

function normalizePublicUserImagePaths<T extends { profilePicture: string }>(publicUser: T): T {
  return {
    ...publicUser,
    profilePicture: resolveCloudFrontUrl(publicUser.profilePicture),
  }
}

function normalizeRoute(route: Route | null): Route | null {
  if (!route) return null

  return {
    ...route,
    overlayPath: resolveGeoJsonUrl(route.overlayPath),
    storagePath: resolveGeoJsonUrl(route.storagePath),
    publicUser: route.publicUser ? normalizePublicUserImagePaths(route.publicUser) : route.publicUser,
  }
}

function normalizeLiveStream(stream: LiveStream | null): LiveStream | null {
  if (!stream) return null

  return {
    ...stream,
    publicUser: stream.publicUser ? normalizePublicUserImagePaths(stream.publicUser) : stream.publicUser,
    route: normalizeRoute(stream.route ?? null),
    chatMessages:
      stream.chatMessages?.map((message) =>
        message
          ? {
              ...message,
              publicUser: normalizePublicUserImagePaths(message.publicUser),
            }
          : null,
      ) ?? null,
  }
}

async function executeApiKeyQuery<TData>(
  query: string,
  variables: Record<string, unknown>,
): Promise<TData> {
  if (!appSyncEndpoint) {
    throw new Error("Missing EXPO_PUBLIC_APPSYNC_ENDPOINT")
  }

  if (!appSyncApiKey) {
    throw new Error("Missing EXPO_PUBLIC_APPSYNC_API_KEY")
  }

  const response = await fetch(appSyncEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": appSyncApiKey,
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  })

  if (!response.ok) {
    throw new Error(`AppSync request failed with status ${response.status}`)
  }

  const result = (await response.json()) as {
    data?: TData
    errors?: GraphQLError[]
  }

  if (result.errors?.length) {
    const joinedMessages = result.errors.map((error) => error.message).join(", ")
    throw new Error(`GraphQL error: ${joinedMessages}`)
  }

  if (!result.data) {
    throw new Error("Missing GraphQL response data")
  }

  return result.data
}

export async function fetchAppUserById(userId: string): Promise<User | null> {
  const result = await executeApiKeyQuery<GetUserByUserIdResponse["data"]>(GET_USER_BY_USER_ID, {
    userId,
  })
  const user = result?.getUserByUserId ?? null

  return user ? normalizeUserImagePaths(user) : null
}

export async function fetchUserProfileByUsername(username: string): Promise<User | null> {
  const result = await executeApiKeyQuery<GetUserByUserNameResponse["data"]>(
    GET_USER_PROFILE_BY_USERNAME,
    { username },
  )
  const user = result?.getUserByUserName ?? null

  return user ? normalizeUserImagePaths(user) : null
}

export async function fetchUserStreamById(
  username: string,
  streamId: string,
): Promise<{ user: User; stream: LiveStream } | null> {
  const result = await executeApiKeyQuery<GetUserByUserNameResponse["data"]>(GET_USER_STREAM_BY_ID, {
    username,
    streamId,
  })
  const user = result?.getUserByUserName ?? null

  if (!user) return null

  const normalizedUser = normalizeUserImagePaths(user)
  const stream = normalizedUser.liveStreams?.find((entry) => entry?.streamId === streamId) ?? null

  if (!stream) return null

  return { user: normalizedUser, stream }
}

export async function fetchUserRouteById(
  username: string,
  routeId: string,
): Promise<{ user: User; route: Route } | null> {
  const result = await executeApiKeyQuery<GetUserByUserNameResponse["data"]>(GET_USER_ROUTE_BY_ID, {
    username,
  })
  const user = result?.getUserByUserName ?? null

  if (!user) return null

  const normalizedUser = normalizeUserImagePaths(user)
  const route = normalizedUser.routes?.find((entry) => entry?.routeId === routeId) ?? null

  if (!route) return null

  return { user: normalizedUser, route }
}

export async function fetchPublicStreamsByEntity(entity = "STREAM"): Promise<LiveStream[]> {
  const result = await executeApiKeyQuery<GetStreamsByEntityResponse["data"]>(GET_STREAMS_BY_ENTITY, {
    entity,
  })
  const streams = result?.getStreamsByEntity ?? []

  return streams
    .filter((stream): stream is LiveStream => Boolean(stream))
    .map((stream) => normalizeLiveStream(stream))
    .filter((stream): stream is LiveStream => Boolean(stream))
}

// ── Authenticated mutations ────────────────────────────────────────────────────

const PUBLISH_CHAT_MUTATION = `
  mutation PublishChat($input: ChatMessageInput!) {
    publishChat(input: $input) {
      text
      createdAt
      streamId
      userId
      publicUser {
        username
        profilePicture
        userId
      }
    }
  }
`

const UPSERT_DEVICE_MUTATION = `
  mutation UpsertDevice($input: DeviceInput!) {
    upsertDevice(input: $input) {
      imei
      deviceId
      name
      make
      model
      shareUrl
      status
      lastSeenAt
      verifiedAt
    }
  }
`

const DELETE_DEVICE_MUTATION = `
  mutation DeleteDevice($input: DeleteDeviceInput!) {
    deleteDevice(input: $input) {
      success
      message
    }
  }
`

const RECALIBRATE_ROUTE_MUTATION = `
  mutation RecalibrateRoute($input: RecalibrateRouteInput!) {
    recalibrateRoute(input: $input) {
      routeId
      name
      distanceInMiles
      gainInFeet
      storagePath
      overlayPath
      processingStatus
      createdAt
      uom
      publicUser {
        profilePicture
        username
        userId
        bio
      }
    }
  }
`

const DELETE_ROUTE_MUTATION = `
  mutation DeleteRoute($input: DeleteRouteInput!) {
    deleteRoute(input: $input) {
      success
      message
    }
  }
`

async function executeTokenMutation<TData>(
  query: string,
  variables: Record<string, unknown>,
  idToken: string,
): Promise<TData> {
  if (!appSyncEndpoint) {
    throw new Error("Missing EXPO_PUBLIC_APPSYNC_ENDPOINT")
  }

  const response = await fetch(appSyncEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ query, variables }),
  })

  if (!response.ok) {
    throw new Error(`AppSync request failed with status ${response.status}`)
  }

  const result = (await response.json()) as {
    data?: TData
    errors?: GraphQLError[]
  }

  if (result.errors?.length) {
    const joinedMessages = result.errors.map((error) => error.message).join(", ")
    throw new Error(`GraphQL error: ${joinedMessages}`)
  }

  if (!result.data) {
    throw new Error("Missing GraphQL response data")
  }

  return result.data
}

export type PublishChatInput = {
  streamId: string
  text: string
  userId: string
  username: string
  profilePicture: string
  createdAt: string
}

export async function publishChatMessage(
  input: PublishChatInput,
  idToken: string,
): Promise<ChatMessage> {
  const result = await executeTokenMutation<PublishChatResponse>(PUBLISH_CHAT_MUTATION, { input }, idToken)
  if (!result.publishChat) {
    throw new Error("publishChat returned no data")
  }
  return {
    ...result.publishChat,
    publicUser: normalizePublicUserImagePaths(result.publishChat.publicUser),
  }
}

export type UpsertDeviceInput = {
  userId: string
  imei: string
  name: string
  make: string
  model?: string | null
  shareUrl?: string | null
}

export async function upsertDevice(input: UpsertDeviceInput, idToken: string): Promise<Device> {
  const result = await executeTokenMutation<UpsertDeviceResponse>(
    UPSERT_DEVICE_MUTATION,
    {
      input: {
        userId: input.userId,
        IMEI: input.imei,
        name: input.name,
        make: input.make.toUpperCase(),
        model: input.model ?? "",
        shareUrl: input.shareUrl ?? undefined,
        lastLocation: { lat: 0, lng: 0 },
        timestamp: new Date().toISOString(),
      },
    },
    idToken,
  )

  if (!result.upsertDevice) {
    throw new Error("upsertDevice returned no data")
  }

  return result.upsertDevice
}

export async function deleteDevice(deviceId: string, idToken: string): Promise<boolean> {
  const result = await executeTokenMutation<DeleteDeviceMutationResponse>(
    DELETE_DEVICE_MUTATION,
    { input: { deviceId } },
    idToken,
  )

  return result.deleteDevice?.success === true
}

export type RecalibrateRouteInput = {
  createdAt: string
  routeId: string
  targetDistanceInMiles: number
  targetGainInFeet: number
  userId: string
}

export async function recalibrateRoute(
  input: RecalibrateRouteInput,
  idToken: string,
): Promise<Route> {
  const result = await executeTokenMutation<RecalibrateRouteResponse>(
    RECALIBRATE_ROUTE_MUTATION,
    { input },
    idToken,
  )

  const route = normalizeRoute(result.recalibrateRoute ?? null)
  if (!route) {
    throw new Error("recalibrateRoute returned no data")
  }

  return route
}

export async function deleteRoute(
  input: { createdAt: string; routeId: string },
  idToken: string,
): Promise<boolean> {
  const result = await executeTokenMutation<DeleteRouteMutationResponse>(
    DELETE_ROUTE_MUTATION,
    { input },
    idToken,
  )

  return result.deleteRoute?.success === true
}
