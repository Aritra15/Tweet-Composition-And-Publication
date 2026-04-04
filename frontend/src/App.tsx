import { useEffect, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { HomeScreen } from './screens/Home';
import { ComposeScreen } from './screens/Compose';
import { PublishScreen } from './screens/Publish';
import { AuthScreen } from './screens/Auth';
import { ScreenName, type FeedThread, type Thread, type User } from './types';
import { Avatar } from './components/Shared';
import { Feather } from 'lucide-react';
import ProfileMenu from './components/ProfileMenu';
import './App.css';





const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';

const AUTH_TOKEN_KEY = 'tweet_auth_token';
const AUTH_USER_KEY  = 'tweet_auth_user';

const mapThreadToFeedItem = (thread: Thread, user: User): FeedThread => {
  return {
    id: thread.tweets[0].id, // Use the first tweet's ID as the thread ID for simplicity
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
          question: tweet.poll.question,
          options: tweet.poll.options.map((option) => ({
            id: option.id,
            text: option.text,
            votesCount: 0,
          })),
        }
        : undefined,
    })),
  };
};

interface ApiTweetResponse {
  id: string;
  user_id: string;
  username: string;
  user_handle: string;
  profile_picture_url: string | null;
  text: string;
  created_at: string;
  media?: Array<{ url: string, type: 'image' | 'video' }>;
  poll?: {
    question: string;
    options: Array<{
      id: string;
      text: string;
      votes_count: number;
    }>;
  } | null;
}

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

const mapApiTweetToFeedThread = (tweet: ApiTweetResponse): FeedThread => {
  return {
    id: tweet.id,
    isThread: false,
    tweets: [
      {
        id: tweet.id,
        author: {
          id: tweet.user_id,
          name: tweet.username, // In real scenario, we would need to fetch user details separately. For now, we'll just use the ID as the name.
          handle: `${tweet.user_handle}`,
          avatar: tweet.profile_picture_url !== null ? tweet.profile_picture_url : `https://picsum.photos/seed/${tweet.user_id}/150/150`,
        },
        text: tweet.text,
        time: formatTweetAge(tweet.created_at),
        likes: 0,
        replies: 0,
        reposts: 0,
        media: (tweet.media ?? []).map((item) => ({url: item.url, type: item.type})),
        poll: tweet.poll
          ? {
            question: tweet.poll.question,
            options: tweet.poll.options.map((option) => ({
              id: option.id,
              text: option.text,
              votesCount: option.votes_count,
            })),
          }
          : undefined,
      },
    ],
  };
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
      const response = await fetch(`${API_BASE_URL}/api/v1/tweets?limit=15&offset=0`);

      if (!response.ok) {
        setTweetLoading(false);
        return;
      }

      const tweets: ApiTweetResponse[] = await response.json();
      setFetchedFeedItems(tweets.map(mapApiTweetToFeedThread));
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
    if (item.isThread) {
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

        <div className="flex gap-6">
          <button aria-label="For You" className="font-semibold text-[18px] py-2 relative text-app-text">
            For You
            <div className="absolute bottom-0 left-0 right-0 h-1 rounded-full bg-app-peach" />
          </button>
          <button aria-label="Following" className="font-semibold text-[18px] py-2 relative text-app-muted">
            Following
          </button>
        </div>

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
          />
        )}
      </AnimatePresence>

      {!tweetLoading && (
        <div
          style={{ paddingTop: headerHeight }}
          className="max-w-[45%] mx-auto min-h-screen bg-app-bg text-app-text overflow-hidden relative shadow-2xl"
        >
          <HomeScreen
            onNavigate={navigate}
            currentUser={currentUser}
            headerRef={headerRef}
            headerHeight={headerHeight}
            publishedFeedItems={publishedFeedItems}
            fetchedFeedItems={fetchedFeedItems}
            onDeleteFeedItem={handleDeleteFeedItem}
          />

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
