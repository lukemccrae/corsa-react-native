import type { User } from "@/generated/schema"

type GraphQLError = {
  message: string
}

type GetUserByUserIdResponse = {
  data?: {
    getUserByUserId?: User | null
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
  }
}

export async function fetchAppUserById(userId: string): Promise<User | null> {
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
      query: GET_USER_BY_USER_ID,
      variables: { userId },
    }),
  })

  if (!response.ok) {
    throw new Error(`AppSync request failed with status ${response.status}`)
  }

  const result = (await response.json()) as GetUserByUserIdResponse

  if (result.errors?.length) {
    const joinedMessages = result.errors.map((error) => error.message).join(", ")
    throw new Error(`GraphQL error: ${joinedMessages}`)
  }

  const user = result.data?.getUserByUserId ?? null

  return user ? normalizeUserImagePaths(user) : null
}