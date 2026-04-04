export const ScreenName = {
  AUTH: 'AUTH',
  HOME: 'HOME',
  PROFILE: 'PROFILE',
  PUBLIC_PROFILE: 'PUBLIC_PROFILE',
  HELP: 'HELP',
  SETTINGS: 'SETTINGS',
  SEARCH: 'SEARCH',
  NOTIFICATIONS: 'NOTIFICATIONS',
  ANALYTICS: 'ANALYTICS',
  COMPOSE: 'COMPOSE',
  PREVIEW: 'PREVIEW',
  PUBLISH: 'PUBLISH', // Schedule/Queue
} as const;


export type ScreenName = typeof ScreenName[keyof typeof ScreenName];

export interface User {
  id: string;
  name: string;
  handle: string;
  avatar: string | null;
}

export interface TweetMedia {
  id: string;
  type: 'image' | 'video';
  url: string;
  source: 'upload' | 'ai';
}

export interface PollOption {
  id: string;
  text: string;
}

export interface Poll {
  id?: string;
  question: string;
  options: PollOption[];
  votedOptionId?: string | null;
}

export interface TweetDraft {
  id: string;
  text: string;
  media: TweetMedia[];
  poll?: Poll;
}

export interface Thread {
  id?: string;
  tweets: TweetDraft[];
}

export interface FeedMedia {
  type: 'image' | 'video';
  url: string;
}

export interface FeedTweet {
  id: string;
  author: User;
  text: string;
  time: string;
  likes: number;
  replies: number;
  reposts: number;
  likedByMe?: boolean;
  media: FeedMedia[];
  poll?: FeedPoll;
}

export interface FeedPollOption {
  id: string;
  text: string;
  votesCount: number;
}

export interface FeedPoll {
  id?: string;
  question: string;
  options: FeedPollOption[];
  votedOptionId?: string | null;
}

export interface FeedThread {
  id: string;
  isThread: true | false;
  tweets: FeedTweet[];
}

export const AudienceType = {
  EVERYONE: 'Everyone',
  FOLLOW: 'People you follow',
  MENTIONED: 'Only people you mention',
} as const;

export type AudienceType = typeof AudienceType[keyof typeof AudienceType];

export interface AppState {
  currentScreen: ScreenName;
  draft: Thread;
  audience: AudienceType;
  scheduleTime: Date | null;
}

export interface ApiTweetResponse {
  id: string;
  user_id: string;
  username: string;
  user_handle: string;
  profile_picture_url: string | null;
  text: string;
  created_at: string;
  likes_count?: number;
  comments_count?: number;
  liked_by_user?: boolean;
  thread_id?: string | null;
  thread_position?: number | null;
  media?: Array<{ url: string, type: 'image' | 'video' }>;
  poll?: {
    id: string;
    question: string;
    options: Array<{
      id: string;
      text: string;
      votes_count: number;
    }>;
    voted_option_id?: string | null;
  } | null;
}