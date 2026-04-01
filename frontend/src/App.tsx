import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { HomeScreen } from './screens/Home';
import { ComposeScreen } from './screens/Compose';
import { PublishScreen } from './screens/Publish';
import { AuthScreen } from './screens/Auth';
import { ScreenName, type FeedThread, type Thread, type User } from './types';
import './App.css';
import { Avatar } from './components/Shared';
import {
  Feather,
  User as UserIcon,
  Settings,
  Bookmark,
  HelpCircle,
  LogOut,
  ChevronRight,
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';

const AUTH_TOKEN_KEY = 'tweet_auth_token';
const AUTH_USER_KEY  = 'tweet_auth_user';

const mapThreadToFeedItem = (thread: Thread, user: User): FeedThread => {
  return {
    id: `published-thread-${Date.now()}`,
    isThread: true,
    tweets: thread.tweets.map((tweet, index) => ({
      id: tweet.id || `published-${Date.now()}-${index}`,
      author: {
        id: user.id,
        name: user.name,
        handle: user.handle,
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
  const shortUserId = tweet.user_id.slice(0, 8);

  return {
    id: tweet.id,
    isThread: false,
    tweets: [
      {
        id: tweet.id,
        author: {
          id: tweet.user_id,
          name: `User ${shortUserId}`,
          handle: `@${shortUserId}`,
          avatar: `https://picsum.photos/seed/${tweet.user_id}/100/100`,
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

// --- Profile Menu ---

const MENU_ITEMS = [
  { icon: UserIcon,   label: 'Profile',        sub: 'View your public profile' },
  { icon: Bookmark,   label: 'Saved',           sub: 'Bookmarks & drafts' },
  { icon: Settings,   label: 'Settings',        sub: 'Account & preferences' },
  { icon: HelpCircle, label: 'Help & Support',  sub: 'FAQs and contact' },
];

function ProfileMenu({ user, onClose, onLogout }: { user: User; onClose: () => void; onLogout: () => void }) {
  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: -8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -8 }}
        transition={{ type: 'spring', damping: 24, stiffness: 320 }}
        className="fixed top-20 right-4 z-50 w-72 bg-app-elevated border border-app-border rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* User info */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-app-border bg-app-card">
          <img
            src={user.avatar}
            alt={user.name}
            className="w-11 h-11 rounded-full border border-app-border object-cover"
          />
          <div className="flex-1 min-w-0">
            <p className="text-app-text font-semibold text-sm truncate">{user.name}</p>
            <p className="text-app-muted text-xs truncate">{user.handle}</p>
          </div>
        </div>

        {/* Menu items */}
        <div className="py-1">
          {MENU_ITEMS.map(({ icon: Icon, label, sub }) => (
            <button
              key={label}
              onClick={onClose}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-app-card transition-colors group"
            >
              <div className="w-8 h-8 rounded-lg bg-app-card group-hover:bg-app-elevated flex items-center justify-center transition-colors shrink-0">
                <Icon size={15} className="text-app-muted group-hover:text-app-peach transition-colors" />
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-app-text text-sm font-medium">{label}</p>
                <p className="text-app-muted text-xs truncate">{sub}</p>
              </div>
              <ChevronRight size={14} className="text-app-border group-hover:text-app-muted transition-colors" />
            </button>
          ))}
        </div>

        {/* Logout */}
        <div className="border-t border-app-border py-1">
          <button
            onClick={() => { onClose(); onLogout(); }}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-app-error/10 transition-colors group"
          >
            <div className="w-8 h-8 rounded-lg bg-app-card group-hover:bg-app-error/10 flex items-center justify-center transition-colors shrink-0">
              <LogOut size={15} className="text-app-muted group-hover:text-app-error transition-colors" />
            </div>
            <p className="text-app-text group-hover:text-app-error text-sm font-medium transition-colors">Sign Out</p>
          </button>
        </div>
      </motion.div>
    </>
  );
}

// --- App ---

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [currentScreen, setCurrentScreen] = useState<ScreenName>(ScreenName.HOME);
  const [draftThread, setDraftThread] = useState<Thread | null>(null);
  const [publishedFeedItems, setPublishedFeedItems] = useState<FeedThread[]>([]);
  const [fetchedFeedItems, setFetchedFeedItems] = useState<FeedThread[]>([]);
  const [tweetLoading, setTweetLoading] = useState(true);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const headerRef = useRef<HTMLElement | null>(null);
  const [headerHeight, setHeaderHeight] = useState(0);

  // Restore session from localStorage
  useEffect(() => {
    const savedUser = localStorage.getItem(AUTH_USER_KEY);
    if (savedUser) {
      try {
        setCurrentUser(JSON.parse(savedUser) as User);
      } catch {
        localStorage.removeItem(AUTH_USER_KEY);
        localStorage.removeItem(AUTH_TOKEN_KEY);
      }
    }
    setAuthChecked(true);
  }, []);

  useEffect(() => {
    if (headerRef.current) {
      setHeaderHeight(headerRef.current.offsetHeight);
    }
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;

    const fetchInitialTweets = async () => {
      setTweetLoading(true);
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
    setDraftThread(null);
    setCurrentScreen(ScreenName.HOME);
  };

  const navigate = (screen: ScreenName) => setCurrentScreen(screen);

  const handleComposeNext = (thread: Thread) => {
    setDraftThread(thread);
    navigate(ScreenName.PUBLISH);
  };

  const handlePublishComplete = () => {
    if (draftThread && currentUser) {
      const newFeedItem = mapThreadToFeedItem(draftThread, currentUser);
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

  // Wait until we've checked localStorage before rendering
  if (!authChecked) return null;

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
          <button className="font-semibold text-[18px] py-2 relative text-app-text">
            For You
            <div className="absolute bottom-0 left-0 right-0 h-1 rounded-full bg-app-peach" />
          </button>
          <button className="font-semibold text-[18px] py-2 relative text-app-muted">
            Following
          </button>
        </div>

        {/* Avatar — opens profile menu */}
        <button onClick={() => setProfileMenuOpen((o) => !o)} className="rounded-full">
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
            userId={currentUser.id}
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
