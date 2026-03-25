export const ScreenName = {
  HOME: 'HOME',
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
  avatar: string;
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
  question: string;
  options: PollOption[];
}

export interface TweetDraft {
  id: string;
  text: string;
  media: TweetMedia[];
  poll?: Poll;
}

export interface Thread {
  tweets: TweetDraft[];
}

export interface FeedTweet {
  id: string;
  author: User;
  text: string;
  time: string;
  likes: number;
  replies: number;
  reposts: number;
  media: string[];
  poll?: FeedPoll;
}

export interface FeedPollOption {
  id: string;
  text: string;
  votesCount: number;
}

export interface FeedPoll {
  question: string;
  options: FeedPollOption[];
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