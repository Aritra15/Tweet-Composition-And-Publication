import { useEffect, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { HomeScreen } from './screens/Home';
import { ProfileScreen } from './screens/Profile';
import { HelpSupportScreen } from './screens/HelpSupport';
import { ComposeScreen } from './screens/Compose';
import { PublishScreen } from './screens/Publish';
import { AuthScreen } from './screens/Auth';
import { ScreenName, type ApiTweetResponse, type FeedThread, type FeedTweet, type Thread, type User } from './types';
import { Avatar } from './components/Shared';
import { CalendarClock, Feather, Sparkles, TrendingUp } from 'lucide-react';
import ProfileMenu from './components/ProfileMenu';
import './App.css';



const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';

const AUTH_TOKEN_KEY = 'tweet_auth_token';
const AUTH_USER_KEY  = 'tweet_auth_user';

const mapThreadToFeedItem = (thread: Thread, user: User): FeedThread => {
  return {
    id: thread.id ?? thread.tweets[0].id,
    isThread: thread.tweets.length > 1,
    tweets: thread.tweets.map((tweet) => ({
      id: tweet.id,
      author: {
        id: user.id,
        name: user.name,
        handle: `${user.handle}`,
        avatar: user.avatar,
      },
      text: tweet.text,
      time: 'now',
      likes: 0,
      replies: 0,
      reposts: 0,
      media: tweet.media.map((m) => ({url: m.url, type: m.type})),
      poll: tweet.poll
        ? {
          id: undefined,
          question: tweet.poll.question,
          options: tweet.poll.options.map((option) => ({
            id: option.id,
            text: option.text,
            votesCount: 0,
          })),
          votedOptionId: null,
        }
        : undefined,
    })),
  };
};

const formatTweetAge = (createdAt: string): string => {
  const createdTime = new Date(createdAt).getTime();

  if (Number.isNaN(createdTime)) {
    return 'now';
  }

  const diffInMinutes = Math.max(1, Math.floor((Date.now() - createdTime) / 60000));

  if (diffInMinutes < 60) {
    return `${diffInMinutes}m`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours}h`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays}d`;
};

const mapApiTweetToFeedTweet = (tweet: ApiTweetResponse): FeedTweet => ({
  id: tweet.id,
  author: {
    id: tweet.user_id,
    name: tweet.username,
    handle: `${tweet.user_handle}`,
    avatar: tweet.profile_picture_url !== null ? tweet.profile_picture_url : `https://picsum.photos/seed/${tweet.user_id}/150/150`,
  },
  text: tweet.text,
  time: formatTweetAge(tweet.created_at),
  likes: tweet.likes_count ?? 0,
  replies: tweet.comments_count ?? 0,
  reposts: 0,
  media: (tweet.media ?? []).map((item) => ({ url: item.url, type: item.type })),
  poll: tweet.poll
    ? {
      id: tweet.poll.id,
      question: tweet.poll.question,
      options: tweet.poll.options.map((option) => ({
        id: option.id,
        text: option.text,
        votesCount: option.votes_count,
      })),
      votedOptionId: tweet.poll.voted_option_id ?? null,
    }
    : undefined,
});

const mapApiTweetsToFeedThreads = (tweets: ApiTweetResponse[]): FeedThread[] => {
  type GroupBucket = {
    id: string;
    order: number;
    tweets: Array<{ raw: ApiTweetResponse; mapped: FeedTweet }>;
  };

  const groups = new Map<string, GroupBucket>();

  tweets.forEach((tweet, index) => {
    const groupId = tweet.thread_id ?? tweet.id;
    const existing = groups.get(groupId);
    const mappedTweet = mapApiTweetToFeedTweet(tweet);

    if (!existing) {
      groups.set(groupId, {
        id: groupId,
        order: index,
        tweets: [{ raw: tweet, mapped: mappedTweet }],
      });
      return;
    }

    existing.tweets.push({ raw: tweet, mapped: mappedTweet });
  });

  return Array.from(groups.values())
    .sort((a, b) => a.order - b.order)
    .map((group) => {
      const sortedTweets = [...group.tweets].sort((a, b) => {
        const posA = a.raw.thread_position ?? Number.MAX_SAFE_INTEGER;
        const posB = b.raw.thread_position ?? Number.MAX_SAFE_INTEGER;
        return posA - posB;
      });

      return {
        id: group.id,
        isThread: sortedTweets.length > 1,
        tweets: sortedTweets.map((tweetItem) => tweetItem.mapped),
      };
    });
};


// --- App ---

function App() {
  // Restore session from localStorage
  const loadUser = (): User | null => {
    const savedUser = localStorage.getItem(AUTH_USER_KEY);
    if (!savedUser) return null;

    try {
      return JSON.parse(savedUser);
    } catch {
      localStorage.removeItem(AUTH_USER_KEY);
      localStorage.removeItem(AUTH_TOKEN_KEY);
      return null;
    }
  }

  const [currentUser, setCurrentUser] = useState<User | null>(loadUser);

  const [currentScreen, setCurrentScreen] = useState<ScreenName>(ScreenName.HOME);
  const [draftThread, setDraftThread] = useState<Thread | null>(null);
  const [publishedFeedItems, setPublishedFeedItems] = useState<FeedThread[]>([]);
  const [fetchedFeedItems, setFetchedFeedItems] = useState<FeedThread[]>([]);
  const [tweetLoading, setTweetLoading] = useState(true);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const headerRef = useRef<HTMLElement | null>(null);
  const [headerHeight, setHeaderHeight] = useState(0);

  useEffect(() => {
    if (headerRef.current) {
      setHeaderHeight(headerRef.current.offsetHeight);
    }
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;

    const fetchInitialTweets = async () => {
      const response = await fetch(`${API_BASE_URL}/api/v1/tweets?limit=15&offset=0&viewer_user_id=${currentUser.id}`);

      if (!response.ok) {
        setTweetLoading(false);
        return;
      }

      const tweets: ApiTweetResponse[] = await response.json();
      setFetchedFeedItems(mapApiTweetsToFeedThreads(tweets));
      setTweetLoading(false);
    };

    void fetchInitialTweets();
  }, [currentUser]);

  const handleAuthSuccess = (user: User, token: string) => {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    setCurrentUser(user);
    setCurrentScreen(ScreenName.HOME);
  };

  const handleLogout = () => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
    setCurrentUser(null);
    setPublishedFeedItems([]);
    setFetchedFeedItems([]);
    setTweetLoading(true);
    setDraftThread(null);
    setCurrentScreen(ScreenName.HOME);
  };

  const navigate = (screen: ScreenName) => setCurrentScreen(screen);
  const profileFeedItems = currentUser
    ? [...publishedFeedItems, ...fetchedFeedItems]
      .filter((item) => item.tweets[0]?.author.id === currentUser.id)
    : [];

  const handleComposeNext = (thread: Thread) => {
    setDraftThread(thread);
    navigate(ScreenName.PUBLISH);
  };

  const handlePublishComplete = (publishedThread: Thread) => {
    if (draftThread && currentUser) {
      const newFeedItem = mapThreadToFeedItem(publishedThread, currentUser);
      setPublishedFeedItems((prev) => [newFeedItem, ...prev]);
    }
    setDraftThread(null);
    navigate(ScreenName.HOME);
  };

  const handleComposeBack = () => {
    setDraftThread(null);
    navigate(ScreenName.HOME);
  };

  const handlePublishBack = () => {
    navigate(ScreenName.COMPOSE);
  };

  const handleDeleteFeedItem = async (item: FeedThread) => {
    if (!currentUser) {
      return;
    }

    if (item.isThread) {
      const threadResponse = await fetch(`${API_BASE_URL}/api/v1/tweets/thread/${item.id}?user_id=${currentUser.id}`, {
        method: 'DELETE',
      });

      if (!threadResponse.ok) {
        const detail = await threadResponse.json().catch(() => ({}));
        const message = typeof detail?.detail === 'string' ? detail.detail : 'Failed to delete thread';
        throw new Error(message);
      }

      setPublishedFeedItems((prev) => prev.filter((feedItem) => feedItem.id !== item.id));
      setFetchedFeedItems((prev) => prev.filter((feedItem) => feedItem.id !== item.id));
      return;
    }

    const tweetId = item.tweets[0]?.id;
    if (!tweetId) return;

    const response = await fetch(`${API_BASE_URL}/api/v1/tweets/${tweetId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      const detail = typeof error?.detail === 'string' ? error.detail : 'Failed to delete tweet';
      throw new Error(detail);
    }

    setPublishedFeedItems((prev) => prev.filter((feedItem) => feedItem.id !== item.id));
    setFetchedFeedItems((prev) => prev.filter((feedItem) => feedItem.id !== item.id));
  };

  // Not logged in → show auth screen
  if (!currentUser) {
    return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <>
      {/* Header */}
      <header ref={headerRef} className="fixed top-0 z-30 w-screen bg-[#0a0a0a]/80 backdrop-blur-md px-4 py-4 flex items-center justify-between">
        <div className="w-12 h-12 rounded-full bg-app-peach flex items-center justify-center">
          <Feather className="text-app-bg w-7 h-7" />
        </div>

        {currentScreen === ScreenName.PROFILE ? (
          <div className="flex flex-col items-center">
            <span className="font-semibold text-[18px] text-app-text">Profile</span>
            <span className="text-[12px] text-app-muted">@{currentUser.handle}</span>
          </div>
        ) : currentScreen === ScreenName.HELP ? (
          <div className="flex flex-col items-center">
            <span className="font-semibold text-[18px] text-app-text">Help & Support</span>
            <span className="text-[12px] text-app-muted">Get assistance quickly</span>
          </div>
        ) : (
          <div className="flex gap-6">
            <button aria-label="For You" className="font-semibold text-[18px] py-2 relative text-app-text">
              For You
              <div className="absolute bottom-0 left-0 right-0 h-1 rounded-full bg-app-peach" />
            </button>
            <button aria-label="Following" className="font-semibold text-[18px] py-2 relative text-app-muted">
              Following
            </button>
          </div>
        )}

        {/* Avatar — opens profile menu */}
        <button aria-label="Open profile menu" onClick={() => setProfileMenuOpen((o) => !o)} className="rounded-full">
          <Avatar src={currentUser.avatar} alt={currentUser.name} size="lg" />
        </button>
      </header>

      {/* Profile menu */}
      <AnimatePresence>
        {profileMenuOpen && (
          <ProfileMenu
            user={currentUser}
            onClose={() => setProfileMenuOpen(false)}
            onLogout={handleLogout}
            onOpenProfile={() => {
              setProfileMenuOpen(false);
              navigate(ScreenName.PROFILE);
            }}
            onOpenHelpSupport={() => {
              setProfileMenuOpen(false);
              navigate(ScreenName.HELP);
            }}
          />
        )}
      </AnimatePresence>

      {!tweetLoading && (
        <div
          style={{ paddingTop: headerHeight }}
          className="relative min-h-screen text-app-text"
        >
          <div className="mx-auto w-full max-w-[1320px] px-3 sm:px-4 lg:px-6 pb-6">
            <div className="grid grid-cols-1 xl:grid-cols-[260px_minmax(0,760px)_260px] gap-5 xl:gap-6 items-start">
              <aside className="hidden xl:flex flex-col gap-4 sticky top-4">
                <div className="rounded-2xl border border-white/15 bg-[#131619] p-4 shadow-[0_14px_34px_rgba(0,0,0,0.34)]">
                  <div className="inline-flex items-center gap-2 text-app-peach text-xs font-semibold uppercase tracking-[0.12em]">
                    <Sparkles size={14} /> Workspace
                  </div>
                  <p className="mt-2 text-sm text-white/90 leading-relaxed">
                    Draft thread ideas quickly, then publish as a clean sequence to keep your timeline cohesive.
                  </p>
                </div>

                <div className="rounded-2xl border border-white/15 bg-[#131619] p-4 shadow-[0_14px_34px_rgba(0,0,0,0.34)]">
                  <div className="inline-flex items-center gap-2 text-cyan-300 text-xs font-semibold uppercase tracking-[0.12em]">
                    <CalendarClock size={14} /> Daily Goal
                  </div>
                  <p className="mt-2 text-sm text-white/75">Post 1 insight and 1 media update today.</p>
                </div>
              </aside>

              <div className="min-h-screen rounded-2xl border border-white/10 bg-app-bg shadow-[0_26px_80px_rgba(0,0,0,0.52)] overflow-hidden relative">
                {currentScreen === ScreenName.HOME && (
                  <HomeScreen
                    onNavigate={navigate}
                    currentUser={currentUser}
                    headerRef={headerRef}
                    headerHeight={headerHeight}
                    publishedFeedItems={publishedFeedItems}
                    fetchedFeedItems={fetchedFeedItems}
                    onDeleteFeedItem={handleDeleteFeedItem}
                  />
                )}

                {currentScreen === ScreenName.PROFILE && (
                  <ProfileScreen
                    onNavigate={navigate}
                    currentUser={currentUser}
                    headerRef={headerRef}
                    userFeedItems={profileFeedItems}
                    onDeleteFeedItem={handleDeleteFeedItem}
                  />
                )}

                {currentScreen === ScreenName.HELP && (
                  <HelpSupportScreen
                    onNavigate={navigate}
                    currentUser={currentUser}
                  />
                )}
              </div>

              <aside className="hidden xl:flex flex-col gap-4 sticky top-4">
                <div className="rounded-2xl border border-white/15 bg-[#131619] p-4 shadow-[0_14px_34px_rgba(0,0,0,0.34)]">
                  <div className="inline-flex items-center gap-2 text-lime-300 text-xs font-semibold uppercase tracking-[0.12em]">
                    <TrendingUp size={14} /> Trending
                  </div>
                  <ul className="mt-3 space-y-2 text-sm text-white/80">
                    <li>#ProductBuildInPublic</li>
                    <li>#UIEngineering</li>
                    <li>#FrontendWeekly</li>
                  </ul>
                </div>

                <div className="rounded-2xl border border-white/15 bg-[#131619] p-4 shadow-[0_14px_34px_rgba(0,0,0,0.34)]">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-app-muted">Tip</p>
                  <p className="mt-2 text-sm text-white/75">Use threaded posts for progress logs instead of posting disconnected single tweets.</p>
                </div>
              </aside>
            </div>
          </div>

          <AnimatePresence>
            {(currentScreen === ScreenName.COMPOSE || currentScreen === ScreenName.PUBLISH) && (
              <ComposeScreen
                key="compose"
                onBack={handleComposeBack}
                onNext={handleComposeNext}
                currentUser={currentUser}
                initialThread={draftThread}
              />
            )}

            {currentScreen === ScreenName.PUBLISH && (
              <PublishScreen
                key="publish"
                thread={draftThread}
                currentUser={currentUser}
                onBack={handlePublishBack}
                onPublish={handlePublishComplete}
              />
            )}
          </AnimatePresence>
        </div>
      )}
    </>
  );
}

export default App;
