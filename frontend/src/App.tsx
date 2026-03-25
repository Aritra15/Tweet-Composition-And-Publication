import { useEffect, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { HomeScreen } from './screens/Home';
import { ComposeScreen } from './screens/Compose';
import { PublishScreen } from './screens/Publish';
import { ScreenName, type FeedThread, type Thread, type User } from './types';
import './App.css';
import { Avatar } from './components/Shared';
import { ArrowLeft, Feather } from 'lucide-react';

const DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000001';
const API_BASE_URL = 'http://localhost:8000';

const MOCK_USER: User = {
  id: DEFAULT_USER_ID,
  name: 'Demo User',
  handle: '@demo_user',
  avatar: 'https://picsum.photos/150/150',
};

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

function App() {
  const [currentScreen, setCurrentScreen] = useState<ScreenName>(ScreenName.HOME);
  const [draftThread, setDraftThread] = useState<Thread | null>(null);
  const [publishedFeedItems, setPublishedFeedItems] = useState<FeedThread[]>([]);
  const [fetchedFeedItems, setFetchedFeedItems] = useState<FeedThread[]>([]);
  const [tweetLoading, setTweetLoading] = useState(true);

  const [threadTweets, setThreadTweets] = useState<FeedThread | null>(null);

  const headerRef = useRef<HTMLElement | null>(null);
  const [headerHeight, setHeaderHeight] = useState(0);

  useEffect(() => {
    if (headerRef.current) {
      setHeaderHeight(headerRef.current.offsetHeight);
    }
  }, []);

  useEffect(() => {
    const fetchInitialTweets = async () => {
      setTweetLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/v1/tweets?limit=15&offset=0`);

      if (!response.ok) {
        return;
      }

      const tweets: ApiTweetResponse[] = await response.json();
      setFetchedFeedItems(tweets.map(mapApiTweetToFeedThread));
      setTweetLoading(false);
    };

    void fetchInitialTweets();
  }, []);

  const navigate = (screen: ScreenName) => setCurrentScreen(screen);

  const handleComposeNext = (thread: Thread) => {
    setDraftThread(thread);
    navigate(ScreenName.PUBLISH);
  };

  const handlePublishComplete = () => {
    if (draftThread) {
      const newFeedItem = mapThreadToFeedItem(draftThread, MOCK_USER);
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
  
  const goToHomeFeed = () => {
    navigate(ScreenName.HOME);
    setThreadTweets(null);
  };

  // Determine if we are in a modal flow

  return (
    <>
      <div className='relative overflow-y-auto'>
        {/* Header */}
        <header ref={headerRef} className="fixed  top-0 z-30 w-screen bg-[#0a0a0a]/80 backdrop-blur-md px-4 py-4 flex items-center justify-between">
          <div className="w-12 h-12 rounded-full bg-app-peach flex items-center justify-center">
            {threadTweets === null ? <Feather className="text-app-bg w-7 h-7" /> : <ArrowLeft className="text-app-bg w-7 h-7" onClick={goToHomeFeed} />}
          </div>

          <div className="flex gap-6">
            <button
              className="font-semibold text-[18px] relative py-2 text-app-text"
            >
              For You
              <div className="absolute bottom-0 left-0 right-0 h-1 rounded-full bg-app-peach" />
            </button>
            <button
              className="font-semibold text-[18px] relative py-2 text-app-muted"
            >
              Following
            </button>
          </div>

          <Avatar src="https://picsum.photos/150/150" alt="Me" size="lg" />
        </header>
      </div>

      {!tweetLoading && <div style={{ paddingTop: headerHeight }} className={`max-w-xl mx-auto min-h-screen bg-app-bg text-app-text overflow-hidden relative shadow-2xl`}>
        {/* Main screen - render Home when not in modal, or keep Home in background when modal is open */}
        <HomeScreen
          onNavigate={navigate}
          userId={MOCK_USER.id}
          threadTweets={threadTweets}
          headerRef={headerRef}
          setThreadTweets={setThreadTweets}
          publishedFeedItems={publishedFeedItems}
          fetchedFeedItems={fetchedFeedItems}
        />

        <AnimatePresence>
          {(currentScreen === ScreenName.COMPOSE || currentScreen === ScreenName.PUBLISH) && (
            <ComposeScreen
              key="compose"
              onBack={handleComposeBack}
              onNext={handleComposeNext}
              currentUser={MOCK_USER}
              initialThread={draftThread}
            />
          )}

          {currentScreen === ScreenName.PUBLISH && (
            <PublishScreen
              key="publish"
              thread={draftThread}
              currentUser={MOCK_USER}
              onBack={handlePublishBack}
              onPublish={handlePublishComplete}
            />
          )}
        </AnimatePresence>
      </div>}
    </>
  );
}

export default App;
