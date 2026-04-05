export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  AWSDateTime: { input: any; output: any; }
};

export type Badge = {
  __typename?: 'Badge';
  name: Scalars['String']['output'];
  version: Scalars['String']['output'];
};

export type BlogPost = Post & {
  __typename?: 'BlogPost';
  createdAt: Scalars['AWSDateTime']['output'];
  imagePath?: Maybe<Scalars['String']['output']>;
  location?: Maybe<LatLng>;
  mentions?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  tags?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  text?: Maybe<Scalars['String']['output']>;
  title?: Maybe<Scalars['String']['output']>;
  type: PostType;
  userId: Scalars['ID']['output'];
};

/**
 *   -----------------------
 *  ChatMessage
 *  -----------------------
 */
export type ChatMessage = {
  __typename?: 'ChatMessage';
  createdAt: Scalars['String']['output'];
  publicUser: PublicUser;
  streamId: Scalars['ID']['output'];
  text: Scalars['String']['output'];
  userId: Scalars['ID']['output'];
};

export type ChatMessageInput = {
  createdAt: Scalars['String']['input'];
  profilePicture: Scalars['String']['input'];
  streamId: Scalars['ID']['input'];
  text: Scalars['String']['input'];
  userId: Scalars['ID']['input'];
  username: Scalars['String']['input'];
};

export type CreatePostImageUploadUrlInput = {
  contentType: Scalars['String']['input'];
  streamId: Scalars['ID']['input'];
  userId: Scalars['ID']['input'];
};

export type CreatePostMediaUploadUrlInput = {
  contentType: Scalars['String']['input'];
  mediaType: MediaType;
  streamId: Scalars['ID']['input'];
  userId: Scalars['ID']['input'];
};

export type CreateUserImageUploadUrlInput = {
  contentType: Scalars['String']['input'];
  imageType: UserImageType;
  userId: Scalars['ID']['input'];
};

export type DeleteChatInput = {
  createdAt: Scalars['AWSDateTime']['input'];
  streamId: Scalars['ID']['input'];
};

export type DeleteChatResponse = {
  __typename?: 'DeleteChatResponse';
  message?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type DeleteDeviceInput = {
  deviceId: Scalars['ID']['input'];
};

export type DeleteDeviceResponse = {
  __typename?: 'DeleteDeviceResponse';
  message?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type DeleteRouteInput = {
  createdAt: Scalars['AWSDateTime']['input'];
  routeId: Scalars['ID']['input'];
};

export type DeleteRouteResponse = {
  __typename?: 'DeleteRouteResponse';
  message?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type DeleteStreamInput = {
  startTime: Scalars['AWSDateTime']['input'];
  streamId: Scalars['ID']['input'];
};

export type DeleteStreamResponse = {
  __typename?: 'DeleteStreamResponse';
  message?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type DeleteWaypointInput = {
  streamId: Scalars['ID']['input'];
  timestamp: Scalars['AWSDateTime']['input'];
};

export type DeleteWaypointResponse = {
  __typename?: 'DeleteWaypointResponse';
  message?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type Device = {
  __typename?: 'Device';
  consecutiveFailures?: Maybe<Scalars['Int']['output']>;
  deviceId: Scalars['ID']['output'];
  imei: Scalars['String']['output'];
  lastError?: Maybe<Scalars['String']['output']>;
  lastLocation?: Maybe<LatLng>;
  lastPointHash?: Maybe<Scalars['String']['output']>;
  lastSeenAt?: Maybe<Scalars['String']['output']>;
  make?: Maybe<Scalars['String']['output']>;
  model?: Maybe<Scalars['String']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  pointFrequencySeconds?: Maybe<Scalars['Int']['output']>;
  shareUrl?: Maybe<Scalars['String']['output']>;
  status?: Maybe<DeviceStatus>;
  timestamp?: Maybe<Scalars['AWSDateTime']['output']>;
  userId: Scalars['String']['output'];
  verificationExpiresAt?: Maybe<Scalars['String']['output']>;
  verificationSessionId?: Maybe<Scalars['String']['output']>;
  verifiedAt?: Maybe<Scalars['String']['output']>;
};

export type DeviceInput = {
  IMEI: Scalars['ID']['input'];
  deviceId?: InputMaybe<Scalars['ID']['input']>;
  lastLocation: LatLngInput;
  make: Scalars['String']['input'];
  model: Scalars['String']['input'];
  name: Scalars['String']['input'];
  shareUrl?: InputMaybe<Scalars['String']['input']>;
  timestamp: Scalars['AWSDateTime']['input'];
  userId: Scalars['ID']['input'];
};

export enum DeviceLogo {
  Bivy = 'BIVY',
  Garmin = 'GARMIN'
}

export enum DeviceStatus {
  Failed = 'FAILED',
  PendingVerification = 'PENDING_VERIFICATION',
  Verified = 'VERIFIED',
  Verifying = 'VERIFYING'
}

export type DeviceVerificationSession = {
  __typename?: 'DeviceVerificationSession';
  imei: Scalars['String']['output'];
  status: DeviceStatus;
  verificationExpiresAt: Scalars['String']['output'];
  verificationSessionId: Scalars['String']['output'];
  verificationStreamId: Scalars['String']['output'];
};

export type FullDataWaypoint = {
  __typename?: 'FullDataWaypoint';
  cumulativeGain?: Maybe<Scalars['Float']['output']>;
  distance?: Maybe<Scalars['Float']['output']>;
  elevation?: Maybe<Scalars['Float']['output']>;
  lat?: Maybe<Scalars['Float']['output']>;
  lng?: Maybe<Scalars['Float']['output']>;
};

/**
 *   -----------------------
 *  Supporting types
 *  -----------------------
 */
export type LatLng = {
  __typename?: 'LatLng';
  lat: Scalars['Float']['output'];
  lng: Scalars['Float']['output'];
};

export type LatLngInput = {
  lat: Scalars['Float']['input'];
  lng: Scalars['Float']['input'];
};

/**
 *   -----------------------
 *  LiveStream
 *  -----------------------
 */
export type LiveStream = {
  __typename?: 'LiveStream';
  chatMessages?: Maybe<Array<Maybe<ChatMessage>>>;
  currentLocation?: Maybe<LatLng>;
  currentPointIndex?: Maybe<Scalars['Int']['output']>;
  delayInSeconds?: Maybe<Scalars['Int']['output']>;
  device?: Maybe<Device>;
  entity?: Maybe<Scalars['String']['output']>;
  finishTime?: Maybe<Scalars['String']['output']>;
  live?: Maybe<Scalars['Boolean']['output']>;
  mileMarker?: Maybe<Scalars['Float']['output']>;
  posts?: Maybe<Array<Maybe<Post>>>;
  publicUser?: Maybe<PublicUser>;
  published?: Maybe<Scalars['Boolean']['output']>;
  route?: Maybe<Route>;
  slug?: Maybe<Scalars['String']['output']>;
  sponsors?: Maybe<Array<Maybe<Sponsor>>>;
  startTime: Scalars['AWSDateTime']['output'];
  streamId: Scalars['ID']['output'];
  timezone?: Maybe<Scalars['String']['output']>;
  title: Scalars['String']['output'];
  unitOfMeasure?: Maybe<UnitOfMeasure>;
  waypoints?: Maybe<Array<Maybe<Waypoint>>>;
};

export type LiveStreamInput = {
  cumulativeVert?: InputMaybe<Scalars['Float']['input']>;
  currentLocation: LatLngInput;
  delayInSeconds?: InputMaybe<Scalars['Int']['input']>;
  /**   References instead of embedded fields */
  deviceId?: InputMaybe<Scalars['ID']['input']>;
  entity?: InputMaybe<Scalars['String']['input']>;
  finishTime?: InputMaybe<Scalars['AWSDateTime']['input']>;
  lastSeen?: InputMaybe<Scalars['AWSDateTime']['input']>;
  live?: InputMaybe<Scalars['Boolean']['input']>;
  mileMarker?: InputMaybe<Scalars['Float']['input']>;
  pointIndex?: InputMaybe<Scalars['Int']['input']>;
  published?: InputMaybe<Scalars['Boolean']['input']>;
  routeId?: InputMaybe<Scalars['ID']['input']>;
  slug?: InputMaybe<Scalars['String']['input']>;
  sponsors?: InputMaybe<Array<InputMaybe<SponsorInput>>>;
  startTime: Scalars['AWSDateTime']['input'];
  streamId: Scalars['ID']['input'];
  timezone?: InputMaybe<Scalars['String']['input']>;
  title: Scalars['String']['input'];
  unitOfMeasure?: InputMaybe<UnitOfMeasure>;
  userId: Scalars['ID']['input'];
  username: Scalars['String']['input'];
};

export type LiveStreamSuccessResponse = {
  __typename?: 'LiveStreamSuccessResponse';
  message?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

/**   LiveStream as a post */
export type LivestreamPost = Post & {
  __typename?: 'LivestreamPost';
  createdAt: Scalars['AWSDateTime']['output'];
  location?: Maybe<LatLng>;
  mentions?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  stream: LiveStream;
  tags?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  text?: Maybe<Scalars['String']['output']>;
  type: PostType;
  userId: Scalars['ID']['output'];
};

export enum MediaType {
  Image = 'IMAGE',
  Video = 'VIDEO'
}

export enum MessageType {
  Chat = 'CHAT',
  Pinned = 'PINNED',
  System = 'SYSTEM'
}

export type Mutation = {
  __typename?: 'Mutation';
  confirmDeviceVerification: Device;
  createPostImageUploadUrl: PostImageUploadUrlResponse;
  createPostMediaUploadUrl: PostMediaUploadUrlResponse;
  createUserImageUploadUrl: PresignedUrlResponse;
  deleteChat: DeleteChatResponse;
  deleteDevice: DeleteDeviceResponse;
  deleteRoute: DeleteRouteResponse;
  deleteStream: DeleteStreamResponse;
  deleteWaypoint: DeleteWaypointResponse;
  publishChat: ChatMessage;
  publishWaypoint: Waypoint;
  recalibrateRoute: Route;
  startDeviceVerification: DeviceVerificationSession;
  updateUserImages: User;
  upsertDevice: Device;
  upsertLiveStream: LiveStreamSuccessResponse;
  upsertPost: Post;
  upsertRoute: Route;
  upsertUser: User;
  validateDeviceShareUrl: ValidateShareUrlResult;
};


export type MutationConfirmDeviceVerificationArgs = {
  imei: Scalars['ID']['input'];
  verificationSessionId: Scalars['ID']['input'];
};


export type MutationCreatePostImageUploadUrlArgs = {
  input: CreatePostImageUploadUrlInput;
};


export type MutationCreatePostMediaUploadUrlArgs = {
  input: CreatePostMediaUploadUrlInput;
};


export type MutationCreateUserImageUploadUrlArgs = {
  input: CreateUserImageUploadUrlInput;
};


export type MutationDeleteChatArgs = {
  input: DeleteChatInput;
};


export type MutationDeleteDeviceArgs = {
  input: DeleteDeviceInput;
};


export type MutationDeleteRouteArgs = {
  input: DeleteRouteInput;
};


export type MutationDeleteStreamArgs = {
  input: DeleteStreamInput;
};


export type MutationDeleteWaypointArgs = {
  input: DeleteWaypointInput;
};


export type MutationPublishChatArgs = {
  input: ChatMessageInput;
};


export type MutationPublishWaypointArgs = {
  input: WaypointInput;
};


export type MutationRecalibrateRouteArgs = {
  input: RecalibrateRouteInput;
};


export type MutationStartDeviceVerificationArgs = {
  imei: Scalars['ID']['input'];
};


export type MutationUpdateUserImagesArgs = {
  input: UpdateUserImagesInput;
};


export type MutationUpsertDeviceArgs = {
  input: DeviceInput;
};


export type MutationUpsertLiveStreamArgs = {
  input: LiveStreamInput;
};


export type MutationUpsertPostArgs = {
  input: PostInput;
};


export type MutationUpsertRouteArgs = {
  input: RouteInput;
};


export type MutationUpsertUserArgs = {
  input: UserInput;
};


export type MutationValidateDeviceShareUrlArgs = {
  shareUrl: Scalars['String']['input'];
};

export type PhotoPost = Post & {
  __typename?: 'PhotoPost';
  createdAt: Scalars['AWSDateTime']['output'];
  images?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  location?: Maybe<LatLng>;
  mentions?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  tags?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  text?: Maybe<Scalars['String']['output']>;
  type: PostType;
  userId: Scalars['ID']['output'];
};

export type Post = {
  createdAt: Scalars['AWSDateTime']['output'];
  location?: Maybe<LatLng>;
  mentions?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  tags?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  type: PostType;
  userId: Scalars['ID']['output'];
};

export type PostImageUploadUrlResponse = {
  __typename?: 'PostImageUploadUrlResponse';
  cdnUrl: Scalars['String']['output'];
  objectKey: Scalars['String']['output'];
  uploadUrl: Scalars['String']['output'];
};

export type PostInput = {
  createdAt: Scalars['AWSDateTime']['input'];
  imagePath?: InputMaybe<Scalars['String']['input']>;
  images?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
  location?: InputMaybe<LatLngInput>;
  media?: InputMaybe<Array<PostMediaInput>>;
  mentions?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
  streamId: Scalars['ID']['input'];
  tags?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
  text?: InputMaybe<Scalars['String']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
  type: PostType;
  userId: Scalars['ID']['input'];
};

export type PostMedia = {
  __typename?: 'PostMedia';
  contentType?: Maybe<Scalars['String']['output']>;
  durationMs?: Maybe<Scalars['Int']['output']>;
  height?: Maybe<Scalars['Int']['output']>;
  path: Scalars['String']['output'];
  type: MediaType;
  width?: Maybe<Scalars['Int']['output']>;
};

export type PostMediaInput = {
  contentType?: InputMaybe<Scalars['String']['input']>;
  durationMs?: InputMaybe<Scalars['Int']['input']>;
  height?: InputMaybe<Scalars['Int']['input']>;
  path: Scalars['String']['input'];
  type: MediaType;
  width?: InputMaybe<Scalars['Int']['input']>;
};

export type PostMediaUploadUrlResponse = {
  __typename?: 'PostMediaUploadUrlResponse';
  cdnUrl: Scalars['String']['output'];
  maxBytes: Scalars['Int']['output'];
  mediaType: MediaType;
  objectKey: Scalars['String']['output'];
  uploadUrl: Scalars['String']['output'];
};

export enum PostType {
  Blog = 'BLOG',
  Livestream = 'LIVESTREAM',
  Photo = 'PHOTO',
  Status = 'STATUS'
}

export type PresignedUrlResponse = {
  __typename?: 'PresignedUrlResponse';
  objectKey: Scalars['String']['output'];
  uploadUrl: Scalars['String']['output'];
};

export type PublicUser = {
  __typename?: 'PublicUser';
  bio?: Maybe<Scalars['String']['output']>;
  profilePicture: Scalars['String']['output'];
  userId: Scalars['ID']['output'];
  username: Scalars['String']['output'];
};

export type Query = {
  __typename?: 'Query';
  getDeviceByImei?: Maybe<Device>;
  getRoutesByEntity?: Maybe<Array<Maybe<Route>>>;
  getStreamsByEntity?: Maybe<Array<Maybe<LiveStream>>>;
  getUserByUserId?: Maybe<User>;
  getUserByUserName?: Maybe<User>;
};


export type QueryGetDeviceByImeiArgs = {
  imei: Scalars['ID']['input'];
};


export type QueryGetRoutesByEntityArgs = {
  entity?: InputMaybe<Scalars['String']['input']>;
};


export type QueryGetStreamsByEntityArgs = {
  entity?: InputMaybe<Scalars['String']['input']>;
};


export type QueryGetUserByUserIdArgs = {
  userId: Scalars['ID']['input'];
};


export type QueryGetUserByUserNameArgs = {
  username: Scalars['ID']['input'];
};

export type RecalibrateRouteInput = {
  createdAt: Scalars['AWSDateTime']['input'];
  routeId: Scalars['ID']['input'];
  targetDistanceInMiles: Scalars['Float']['input'];
  targetGainInFeet: Scalars['Int']['input'];
  userId: Scalars['ID']['input'];
};

export type Route = {
  __typename?: 'Route';
  createdAt: Scalars['AWSDateTime']['output'];
  distanceInMiles: Scalars['Float']['output'];
  gainInFeet: Scalars['Int']['output'];
  name: Scalars['String']['output'];
  overlayPath: Scalars['String']['output'];
  processingStatus: RouteProcessingStatus;
  publicUser?: Maybe<PublicUser>;
  routeId: Scalars['ID']['output'];
  storagePath: Scalars['String']['output'];
  uom: UnitOfMeasure;
};

export type RouteInput = {
  createdAt: Scalars['AWSDateTime']['input'];
  distance: Scalars['Float']['input'];
  distanceInMiles?: InputMaybe<Scalars['Float']['input']>;
  entity?: InputMaybe<Scalars['String']['input']>;
  filename?: InputMaybe<Scalars['String']['input']>;
  fullRouteData?: InputMaybe<Scalars['String']['input']>;
  gain: Scalars['Int']['input'];
  gainInFeet?: InputMaybe<Scalars['Int']['input']>;
  lastMileDistance?: InputMaybe<Scalars['Float']['input']>;
  name: Scalars['String']['input'];
  overlayPath?: InputMaybe<Scalars['String']['input']>;
  routeGpxPath?: InputMaybe<Scalars['String']['input']>;
  routeId: Scalars['ID']['input'];
  storagePath: Scalars['String']['input'];
  uom: UnitOfMeasure;
  userId: Scalars['ID']['input'];
};

export enum RouteProcessingStatus {
  Completed = 'COMPLETED',
  Failed = 'FAILED',
  Pending = 'PENDING',
  Processing = 'PROCESSING',
  Recalibrating = 'RECALIBRATING'
}

export type Sponsor = {
  __typename?: 'Sponsor';
  image?: Maybe<Scalars['String']['output']>;
  link?: Maybe<Scalars['String']['output']>;
  name?: Maybe<Scalars['String']['output']>;
};

export type SponsorInput = {
  image?: InputMaybe<Scalars['String']['input']>;
  link?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
};

export type StatusPost = Post & {
  __typename?: 'StatusPost';
  createdAt: Scalars['AWSDateTime']['output'];
  imagePath?: Maybe<Scalars['String']['output']>;
  location?: Maybe<LatLng>;
  media?: Maybe<Array<PostMedia>>;
  mentions?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  tags?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  text?: Maybe<Scalars['String']['output']>;
  type: PostType;
  userId: Scalars['ID']['output'];
};

export type Subscription = {
  __typename?: 'Subscription';
  onNewChat?: Maybe<ChatMessage>;
  onNewWaypoint?: Maybe<Waypoint>;
};


export type SubscriptionOnNewChatArgs = {
  streamId: Scalars['ID']['input'];
};


export type SubscriptionOnNewWaypointArgs = {
  streamId: Scalars['ID']['input'];
};

export enum UnitOfMeasure {
  Imperial = 'IMPERIAL',
  Metric = 'METRIC'
}

export type UpdateUserImagesInput = {
  coverImagePath?: InputMaybe<Scalars['String']['input']>;
  profilePicture?: InputMaybe<Scalars['String']['input']>;
  userId: Scalars['ID']['input'];
};

/**
 *   -----------------------
 *  User
 *  -----------------------
 */
export type User = {
  __typename?: 'User';
  bio?: Maybe<Scalars['String']['output']>;
  coverImagePath?: Maybe<Scalars['String']['output']>;
  devices?: Maybe<Array<Maybe<Device>>>;
  live?: Maybe<Scalars['Boolean']['output']>;
  liveStreams?: Maybe<Array<Maybe<LiveStream>>>;
  posts?: Maybe<Array<Maybe<Post>>>;
  profilePicture: Scalars['String']['output'];
  routes?: Maybe<Array<Maybe<Route>>>;
  streamId?: Maybe<Scalars['String']['output']>;
  userId: Scalars['ID']['output'];
  username: Scalars['String']['output'];
};


/**
 *   -----------------------
 *  User
 *  -----------------------
 */
export type UserLiveStreamsArgs = {
  slug?: InputMaybe<Scalars['String']['input']>;
  streamId?: InputMaybe<Scalars['ID']['input']>;
  username?: InputMaybe<Scalars['String']['input']>;
};

export enum UserImageType {
  CoverImage = 'COVER_IMAGE',
  ProfilePhoto = 'PROFILE_PHOTO'
}

export type UserInput = {
  bio?: InputMaybe<Scalars['String']['input']>;
  live?: InputMaybe<Scalars['Boolean']['input']>;
  profilePicture: Scalars['String']['input'];
  streamId?: InputMaybe<Scalars['String']['input']>;
  userId: Scalars['ID']['input'];
  username: Scalars['String']['input'];
};

export enum UserRole {
  Bot = 'BOT',
  Broadcaster = 'BROADCASTER',
  Moderator = 'MODERATOR',
  Subscriber = 'SUBSCRIBER',
  Viewer = 'VIEWER'
}

export type ValidateShareUrlResult = {
  __typename?: 'ValidateShareUrlResult';
  message?: Maybe<Scalars['String']['output']>;
  valid: Scalars['Boolean']['output'];
};

/**
 *   -----------------------
 *  Waypoint
 *  -----------------------
 */
export type Waypoint = {
  __typename?: 'Waypoint';
  altitude?: Maybe<Scalars['Float']['output']>;
  cumulativeVert?: Maybe<Scalars['Float']['output']>;
  lat: Scalars['Float']['output'];
  lng: Scalars['Float']['output'];
  mileMarker?: Maybe<Scalars['Float']['output']>;
  pointIndex?: Maybe<Scalars['Int']['output']>;
  private?: Maybe<Scalars['Boolean']['output']>;
  streamId: Scalars['ID']['output'];
  timestamp: Scalars['AWSDateTime']['output'];
};

/**
 *   -----------------------
 *  Inputs
 *  -----------------------
 */
export type WaypointInput = {
  altitude?: InputMaybe<Scalars['Float']['input']>;
  cumulativeVert?: InputMaybe<Scalars['Float']['input']>;
  lat: Scalars['Float']['input'];
  lng: Scalars['Float']['input'];
  mileMarker?: InputMaybe<Scalars['Float']['input']>;
  pointIndex?: InputMaybe<Scalars['Int']['input']>;
  private?: InputMaybe<Scalars['Boolean']['input']>;
  streamId: Scalars['ID']['input'];
  timestamp: Scalars['AWSDateTime']['input'];
};
