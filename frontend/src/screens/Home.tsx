import React, { useEffect, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { Avatar } from '../components/Shared';
import { ScreenName, type FeedThread} from '../types';
import Feed from '../components/Feed';

interface HomeProps {
  onNavigate: (screen: ScreenName) => void;
  userId: string;
  threadTweets: FeedThread | null;
  headerRef: React.RefObject<HTMLElement | null>;
  setThreadTweets: React.Dispatch<React.SetStateAction<FeedThread | null>>;
  publishedFeedItems: FeedThread[];
  fetchedFeedItems: FeedThread[];
}

const MOCK_TWEETS: FeedThread[] = [
  {
    id: '1',
    isThread: false,
    tweets: [
      {
        id: '1a',
        author: { id: "a", name: 'Alex Rivera', handle: '@arivera', avatar: 'https://picsum.photos/100/100' },
        text: 'Just deployed the new dark mode UI. The contrast ratios are finally perfect! 🎨✨ #design #uiux',
        time: '2h',
        likes: 142,
        replies: 12,
        reposts: 8,
        media: ['https://picsum.photos/600/300/?1', "https://picsum.photos/600/300/?2", "https://picsum.photos/600/300/?3"]
      }
    ]
  },
  {
    id: '2',
    isThread: true,
    tweets: [
      {
        id: '3a',
        author: { id: "c", name: 'Design Daily', handle: '@designdaily', avatar: 'https://picsum.photos/102/102' },
        text: 'Top 5 tools for mobile prototyping in 2025. Thread 🧵 👇',
        time: '6h',
        likes: 2100,
        replies: 89,
        reposts: 320,
        media: []
      },
      {
        id: '3b',
        author: { id: "d", name: 'Design Daily', handle: '@designdaily', avatar: 'https://picsum.photos/102/102' },
        text: '1. Framer - Still the king of interactions.\n2. Figma - The standard.\n3. ProtoPie - For complex sensors.',
        time: '6h',
        likes: 1800,
        replies: 45,
        reposts: 120,
        media: []
      },
      {
        id: '3c',
        author: { id: "f", name: 'Design Daily', handle: '@designdaily', avatar: 'https://picsum.photos/102/102' },
        text: '',
        time: '6h',
        likes: 1300,
        replies: 48,
        reposts: 99,
        media: ["https://picsum.photos/600/300/?4"]
      }
    ]
  },
  {
    id: '3',
    isThread: false,
    tweets: [
      {
        id: '2a',
        author: { id: "b", name: 'Sarah Chen', handle: '@sarahc_dev', avatar: 'https://picsum.photos/101/101' },
        text: 'Unpopular opinion: TypeScript enums are actually good if you use them correctly. 🛡️',
        time: '4h',
        likes: 856,
        replies: 124,
        reposts: 45,
        media: [],
        poll: {
          question: 'What is your take on TypeScript enums?',
          options: [
            { id: 'mock2-poll-1', text: 'Love them', votesCount: 48 },
            { id: 'mock2-poll-2', text: 'Use only in specific cases', votesCount: 73 },
            { id: 'mock2-poll-3', text: 'Prefer literal unions', votesCount: 112 },
          ],
        }
      }
    ]
  },
];

export const HomeScreen: React.FC<HomeProps> = ({ onNavigate, userId, threadTweets, headerRef, setThreadTweets, publishedFeedItems, fetchedFeedItems }) => {
  const isShowingThread = threadTweets !== null;

  const homeFeedItems = [...publishedFeedItems, ...fetchedFeedItems, ...MOCK_TWEETS];
  const visibleTweets: FeedThread[] = isShowingThread ? [threadTweets] : homeFeedItems;

  const inputRef = useRef<HTMLDivElement | null>(null);
  const [showFAB, setShowFAB] = useState(false);

  useEffect(() => {
    const observedElement = inputRef.current;
    const headerHeight = headerRef.current?.offsetHeight ?? 56;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowFAB(!entry.isIntersecting);
      },
      {
        threshold: 0,
        rootMargin: `-${headerHeight}px 0px 0px 0px`,
      }
    );

    if (observedElement) {
      observer.observe(observedElement);
    }

    window.scrollTo({ top: 0, behavior: 'instant' });

    return () => {
      if (observedElement) {
        observer.unobserve(observedElement);
      }
    };
  }, [isShowingThread]);

  const handleOpenThread = (twts: FeedThread) => {
    setThreadTweets(twts);
    setShowFAB(true); // Ensure FAB is shown when thread is open
  }

  return (
    <div className="rounded-xl bg-[#242424] border border-[#575757] relative">
      {/* New Post Input */}
      {!isShowingThread &&
        <article
          ref={inputRef}
          className="rounded-t-xl border-b border-[#575757] p-4 group hover:bg-app-card transition-colors cursor-text"
        >
          <div className="flex items-center bg-[#242424] rounded-xl p-0 gap-3 group-hover:bg-app-card transition-colors">
            {/* Avatar */}
            <div className="shrink-0 z-10">
              <Avatar src="https://picsum.photos/150/150" alt="Me" />
            </div>

            {/* Input */}
            <p
              className="flex-1 text-app-muted text-[15px] leading-relaxed whitespace-pre-wrap cursor-text"
              onClick={() => onNavigate(ScreenName.COMPOSE)}
            >
              What's new?
            </p>

            {/* Post button */}
            <button
              onClick={() => onNavigate(ScreenName.COMPOSE)}
              className="bg-app-peach text-app-bg font-semibold px-4 py-1 rounded-full hover:brightness-110 active:brightness-95 transition"
            >
              Post
            </button>
          </div>
        </article>}

      {/* Feed */}
      <Feed tweetItems={visibleTweets} userId={userId} isThreadOpen={isShowingThread} headerRef={headerRef} handleOpenThread={handleOpenThread} />

      {/* FAB */}
      {showFAB && <button
        aria-label="Close"
        onClick={() => onNavigate(ScreenName.COMPOSE)}
        className="fixed bottom-8 right-8 w-16 h-16 bg-app-peach rounded-full flex items-center justify-center shadow-lg shadow-app-peach/20 hover:scale-110 active:scale-95 transition-transform z-40"
      >
        <Plus className="text-app-bg w-9 h-9" />
      </button>}
    </div>
  );
};