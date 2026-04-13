import type {
  ChatMessage,
  DeleteDeviceResponse,
  DeleteRouteResponse,
  DeleteStreamResponse,
  DeleteUserResponse,
  Device,
  LiveStream,
  Post,
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

type UpsertUserResponse = {
  upsertUser?: User | null
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

type DeleteStreamMutationResponse = {
  deleteStream?: DeleteStreamResponse | null
}

type DeleteUserMutationResponse = {
  deleteUser?: DeleteUserResponse | null
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

type GetUserStreamChatPageResponse = {
  data?: {
    getUserByUserName?: {
      liveStreams?: Array<
        | {
            streamId: string
            chatMessages?: {
              items?: Array<ChatMessage | null> | null
              nextToken?: string | null
            } | null
          }
        | null
      > | null
    } | null
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

const nativeWaypointEndpoint = resolveNativeWaypointEndpoint()

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
  query GetUserStreamById($username: ID!, $streamId: ID!, $chatLimit: Int, $chatNextToken: String) {
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
        chatMessages(limit: $chatLimit, nextToken: $chatNextToken) {
          items {
            text
            createdAt
            streamId
            userId
            publicUser {
              username
              profilePicture
              userId
              bio
            }
          }
          nextToken
        }
      }
    }
  }
`

const GET_USER_STREAM_CHAT_MESSAGES_PAGE = `
  query GetUserStreamChatMessagesPage($username: ID!, $streamId: ID!, $limit: Int, $nextToken: String) {
    getUserByUserName(username: $username) {
      liveStreams(streamId: $streamId) {
        streamId
        chatMessages(limit: $limit, nextToken: $nextToken) {
          items {
            text
            createdAt
            streamId
            userId
            publicUser {
              username
              profilePicture
              userId
              bio
            }
          }
          nextToken
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

function resolveNativeWaypointEndpoint(): string {
  const explicitEndpoint =
    process.env.EXPO_PUBLIC_NATIVE_WAYPOINT_ENDPOINT ?? process.env.NATIVE_WAYPOINT_ENDPOINT ?? ""

  if (explicitEndpoint) {
    return explicitEndpoint
  }

  const backendBaseUrl = process.env.EXPO_PUBLIC_BACKEND_BASE_URL ?? process.env.BACKEND_BASE_URL ?? ""
  if (backendBaseUrl) {
    return `${backendBaseUrl.replace(/\/+$/, "")}/native-waypoint`
  }

  if (appSyncEndpoint) {
    const appSyncBase = appSyncEndpoint.replace(/\/graphql\/?$/, "")
    return `${appSyncBase}/native-waypoint`
  }

  return ""
}

function buildNativeWaypointUrl(): string {
  if (!nativeWaypointEndpoint) return ""

  const trimmed = nativeWaypointEndpoint.replace(/\/+$/, "")
  if (trimmed.endsWith("/native-waypoint")) {
    return trimmed
  }

  return `${trimmed}/native-waypoint`
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

function normalizePostImagePaths<T extends Post>(post: T): T {
  const normalizedPost = {
    ...post,
  } as T & {
    imagePath?: string | null
    images?: Array<string | null> | null
    media?: Array<{ path?: string | null } | null> | null
  }

  if (typeof normalizedPost.imagePath === "string") {
    normalizedPost.imagePath = resolveCloudFrontUrl(normalizedPost.imagePath)
  }

  if (Array.isArray(normalizedPost.images)) {
    normalizedPost.images = normalizedPost.images.map((imagePath) =>
      imagePath ? resolveCloudFrontUrl(imagePath) : imagePath,
    )
  }

  if (Array.isArray(normalizedPost.media)) {
    normalizedPost.media = normalizedPost.media.map((mediaItem) =>
      mediaItem
        ? {
            ...mediaItem,
            path: mediaItem.path ? resolveCloudFrontUrl(mediaItem.path) : mediaItem.path,
          }
        : null,
    )
  }

  return normalizedPost
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

  const rawChatMessages = (stream as unknown as { chatMessages?: unknown }).chatMessages
  const chatItems = Array.isArray(rawChatMessages)
    ? rawChatMessages
    : Array.isArray((rawChatMessages as { items?: unknown[] } | undefined)?.items)
      ? ((rawChatMessages as { items?: unknown[] }).items ?? [])
      : []

  const normalizedChatMessages = chatItems
    .map((message) => message as ChatMessage | null)
    .filter((message): message is ChatMessage => Boolean(message))
    .map((message) => ({
      ...message,
      publicUser: normalizePublicUserImagePaths(message.publicUser),
    }))

  return {
    ...stream,
    publicUser: stream.publicUser ? normalizePublicUserImagePaths(stream.publicUser) : stream.publicUser,
    route: normalizeRoute(stream.route ?? null),
    posts: stream.posts?.map((post) => (post ? normalizePostImagePaths(post) : null)) ?? null,
    // Keep compatibility with existing UI code that expects an array-like chatMessages value.
    chatMessages: normalizedChatMessages as unknown as LiveStream["chatMessages"],
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
): Promise<{ user: User; stream: LiveStream; chatNextToken: string | null } | null> {
  const result = await executeApiKeyQuery<GetUserByUserNameResponse["data"]>(GET_USER_STREAM_BY_ID, {
    username,
    streamId,
    chatLimit: 30,
    chatNextToken: null,
  })
  const user = result?.getUserByUserName ?? null

  if (!user) return null

  const rawStream = user.liveStreams?.find((entry) => entry?.streamId === streamId) ?? null
  const rawChatMessages = (rawStream as unknown as { chatMessages?: { nextToken?: string | null } | null })
    ?.chatMessages
  const chatNextToken = rawChatMessages?.nextToken ?? null

  const normalizedUser = normalizeUserImagePaths(user)
  const stream = normalizedUser.liveStreams?.find((entry) => entry?.streamId === streamId) ?? null

  if (!stream) return null

  return { user: normalizedUser, stream, chatNextToken }
}

export async function fetchUserStreamChatMessagesPage(input: {
  username: string
  streamId: string
  limit?: number
  nextToken?: string | null
}): Promise<{ messages: ChatMessage[]; nextToken: string | null }> {
  const result = await executeApiKeyQuery<GetUserStreamChatPageResponse["data"]>(
    GET_USER_STREAM_CHAT_MESSAGES_PAGE,
    {
      username: input.username,
      streamId: input.streamId,
      limit: input.limit ?? 30,
      nextToken: input.nextToken ?? null,
    },
  )

  const stream = result?.getUserByUserName?.liveStreams?.find((entry) => entry?.streamId === input.streamId)
  const items = stream?.chatMessages?.items ?? []
  const nextToken = stream?.chatMessages?.nextToken ?? null

  const messages = items
    .filter((message): message is ChatMessage => Boolean(message))
    .map((message) => ({
      ...message,
      publicUser: normalizePublicUserImagePaths(message.publicUser),
    }))

  return { messages, nextToken }
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

const UPSERT_USER_MUTATION = `
  mutation UpsertUser($input: UserInput!) {
    upsertUser(input: $input) {
      ${USER_PROFILE_FIELDS}
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

const DELETE_STREAM_MUTATION = `
  mutation DeleteStream($input: DeleteStreamInput!) {
    deleteStream(input: $input) {
      success
      message
    }
  }
`

const DELETE_USER_MUTATION = `
  mutation DeleteUser($input: DeleteUserInput!) {
    deleteUser(input: $input) {
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

export type UpsertUserInput = {
  userId: string
  username: string
  profilePicture: string
  bio?: string | null
  live?: boolean
  streamId?: string | null
}

export async function upsertUser(input: UpsertUserInput, idToken: string): Promise<User> {
  const result = await executeTokenMutation<UpsertUserResponse>(
    UPSERT_USER_MUTATION,
    {
      input: {
        userId: input.userId,
        username: input.username,
        profilePicture: input.profilePicture,
        bio: input.bio ?? undefined,
        live: input.live,
        streamId: input.streamId ?? undefined,
      },
    },
    idToken,
  )

  const user = normalizeUserImagePaths(result.upsertUser ?? null)
  if (!user) {
    throw new Error("upsertUser returned no data")
  }

  return user
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

export async function deleteStream(
  input: { startTime: string; streamId: string },
  idToken: string,
): Promise<boolean> {
  const result = await executeTokenMutation<DeleteStreamMutationResponse>(
    DELETE_STREAM_MUTATION,
    { input },
    idToken,
  )

  return result.deleteStream?.success === true
}

export async function deleteUserById(userId: string, idToken: string): Promise<boolean> {
  const result = await executeTokenMutation<DeleteUserMutationResponse>(
    DELETE_USER_MUTATION,
    { input: { userId } },
    idToken,
  )

  return result.deleteUser?.success === true
}

export type RestWaypointIngestInput = {
  streamId: string
  lat: number
  lng: number
  timestamp?: string
}

export type RestWaypointIngestResponse = {
  ok: boolean
  streamId: string
  timestamp: string
  snapped: boolean
  pointIndex?: number | null
  mileMarker?: number | null
  cumulativeVert?: number | null
}

function normalizeRestWaypointTimestamp(timestamp: string | number | null | undefined): string | undefined {
  if (timestamp == null) return undefined

  if (typeof timestamp === "number") {
    const parsedDate = new Date(timestamp)
    if (Number.isNaN(parsedDate.getTime())) {
      throw new Error(`Invalid waypoint timestamp: ${timestamp}`)
    }
    return parsedDate.toISOString()
  }

  const trimmed = timestamp.trim()
  if (!trimmed) return undefined

  const numeric = Number(trimmed)
  if (!Number.isNaN(numeric)) {
    const parsedDate = new Date(numeric)
    if (!Number.isNaN(parsedDate.getTime())) {
      return parsedDate.toISOString()
    }
  }

  const parsedDate = new Date(trimmed)
  if (Number.isNaN(parsedDate.getTime())) {
    throw new Error(`Invalid waypoint timestamp: ${timestamp}`)
  }

  return parsedDate.toISOString()
}

export async function ingestNativeWaypoint(
  input: RestWaypointIngestInput,
  idToken: string,
): Promise<RestWaypointIngestResponse> {
  const requestUrl = buildNativeWaypointUrl()

  if (!requestUrl) {
    throw new Error(
      "Missing native waypoint endpoint. Set EXPO_PUBLIC_NATIVE_WAYPOINT_ENDPOINT or EXPO_PUBLIC_BACKEND_BASE_URL.",
    )
  }

  async function doRequest(authorizationHeader: string): Promise<Response> {
    return fetch(requestUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authorizationHeader,
      },
      body: JSON.stringify(input),
    })
  }

  let response = await doRequest(`Bearer ${idToken}`)

  if (response.status === 401 || response.status === 403) {
    // Some API Gateway authorizers expect the raw JWT token without the Bearer prefix.
    response = await doRequest(idToken)
  }

  let parsed: RestWaypointIngestResponse | null = null
  try {
    parsed = (await response.json()) as RestWaypointIngestResponse
  } catch {
    parsed = null
  }

  if (!response.ok) {
    const errorBody = parsed ? JSON.stringify(parsed) : ""
    const trimmedBody = errorBody.length > 200 ? `${errorBody.slice(0, 200)}...` : errorBody
    throw new Error(
      `native-waypoint request failed (${response.status}) at ${requestUrl}${trimmedBody ? `: ${trimmedBody}` : ""}`,
    )
  }

  if (!parsed) {
    throw new Error("native-waypoint returned an empty response")
  }

  if (parsed.ok !== true) {
    throw new Error("native-waypoint returned ok=false")
  }

  return parsed
}

export type NativeWaypointUploadInput = {
  streamId: string
  lat: number
  lng: number
  timestamp?: string | number | null
}

export async function ingestNativeWaypoints(
  inputs: NativeWaypointUploadInput[],
  idToken: string,
): Promise<{ uploaded: number; failed: number; errors: string[]; successIndexes: number[] }> {
  if (inputs.length === 0) {
    return { uploaded: 0, failed: 0, errors: [], successIndexes: [] }
  }

  const settled = await Promise.allSettled(
    inputs.map((input) =>
      ingestNativeWaypoint(
        {
          streamId: input.streamId,
          lat: input.lat,
          lng: input.lng,
          timestamp: normalizeRestWaypointTimestamp(input.timestamp),
        },
        idToken,
      ),
    ),
  )

  const successIndexes: number[] = []
  const errors: string[] = []

  settled.forEach((result, index) => {
    if (result.status === "fulfilled") {
      successIndexes.push(index)
      return
    }

    errors.push(
      result.reason instanceof Error ? result.reason.message : "Could not upload waypoint.",
    )
  })

  return {
    uploaded: settled.length - errors.length,
    failed: errors.length,
    errors,
    successIndexes,
  }
}
