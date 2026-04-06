import type { LiveStream, Route, User } from "@/generated/schema"

type GraphQLError = {
  message: string
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

function normalizeUserImagePaths(user: User): User {
  return {
    ...user,
    profilePicture: resolveCloudFrontUrl(user.profilePicture),
    coverImagePath: resolveCloudFrontUrl(user.coverImagePath),
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
    overlayPath: resolveCloudFrontUrl(route.overlayPath),
    storagePath: resolveCloudFrontUrl(route.storagePath),
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
