import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Plus } from 'lucide-react';
import { Avatar } from '../components/Shared';
import { ScreenName, type FeedThread, type User } from '../types';
import Feed from '../components/Feed.tsx';

interface HomeProps {
  onNavigate: (screen: ScreenName) => void;
  currentUser: User,
  headerRef: React.RefObject<HTMLElement | null>;
  headerHeight: number;
  publishedFeedItems: FeedThread[];
  fetchedFeedItems: FeedThread[];
  onLoadMore: () => void;
  hasMoreFeedItems: boolean;
  isLoadingMoreFeedItems: boolean;
  onDeleteFeedItem: (item: FeedThread) => Promise<void>;
}

export const HomeScreen: React.FC<HomeProps> = ({
  onNavigate,
  currentUser,
  headerRef,
  headerHeight,
  publishedFeedItems,
  fetchedFeedItems,
  onLoadMore,
  hasMoreFeedItems,
  isLoadingMoreFeedItems,
  onDeleteFeedItem,
}) => {
  const [threadTweets, setThreadTweets] = useState<FeedThread | null>(null);
  const isShowingThread = threadTweets !== null;

  const homeFeedItems = [...publishedFeedItems, ...fetchedFeedItems];
  const visibleTweets: FeedThread[] = isShowingThread ? [threadTweets] : homeFeedItems;

  const inputRef = useRef<HTMLDivElement | null>(null);
  const feedRef = useRef<HTMLDivElement | null>(null);
  const loadMoreTriggerRef = useRef<HTMLDivElement | null>(null);
  const hasMountedRef = useRef(false);
  const [showFAB, setShowFAB] = useState(false);

  const [feedPositionX, setFeedPositionX] = useState(0);

  useEffect(() => {
    const showFABOnThreadFeed = () => {
      if (isShowingThread) {
        setShowFAB(true);
        return;
      }
    };
    showFABOnThreadFeed();

    const observedElement = inputRef.current;
    if (!observedElement) {
      return;
    }

    const currentHeaderHeight = headerRef.current?.offsetHeight ?? 56;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowFAB(!entry.isIntersecting);
      },
      {
        threshold: 0,
        rootMargin: `-${currentHeaderHeight}px 0px 0px 0px`,
      }
    );

    observer.observe(observedElement);

    return () => {
      observer.disconnect();
    };
  }, [headerRef, isShowingThread]);

  useEffect(() => {
    const updatePosition = () => {
      if (feedRef.current) {
        const rect = feedRef.current.getBoundingClientRect();
        setFeedPositionX(rect.left);
      }
    };

    updatePosition(); // initial

    window.addEventListener("resize", updatePosition);
    return () => window.removeEventListener("resize", updatePosition);
  }, []);

  useEffect(() => {
    if (isShowingThread || !hasMoreFeedItems || isLoadingMoreFeedItems) {
      return;
    }

    const triggerElement = loadMoreTriggerRef.current;
    if (!triggerElement) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          onLoadMore();
        }
      },
      { rootMargin: '120px 0px 160px 0px' },
    );

    observer.observe(triggerElement);

    return () => {
      observer.disconnect();
    };
  }, [hasMoreFeedItems, isLoadingMoreFeedItems, isShowingThread, onLoadMore]);

  const handleOpenThread = (twts: FeedThread) => {
    setThreadTweets(twts);
    setShowFAB(true); // Ensure FAB is shown when thread is open
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }

  const goToHomeFeed = () => {
    onNavigate(ScreenName.HOME);
    setThreadTweets(null);
  };

  useEffect(() => {
    const loadFromTop = () => {
      if (!hasMountedRef.current) {
        hasMountedRef.current = true;
        return;
      }

      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });

      if (!isShowingThread) {
        setShowFAB(false);
      }
    };
    loadFromTop();
  }, [isShowingThread]);

  const handleDeleteItem = async (item: FeedThread) => {
    await onDeleteFeedItem(item);

    if (threadTweets?.id === item.id) {
      setThreadTweets(null);
    }
  };

  return (
    <>
      {isShowingThread &&
        <div style={{ height: headerHeight }} className={`fixed top-0 left-0 w-screen z-40 py-3 flex flex-col justify-end items-start pointer-events-none`}>
          <button
            title="Go to Feed"
            onClick={goToHomeFeed}
            style={{ marginLeft: feedPositionX + 5 }}
            className="pointer-events-auto bg-[#0a0a0a] border border-gray-600 p-1.5 rounded-full group hover:bg-[#1a1a1a] transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-300 group-hover:text-gray-100 transition-colors" />
          </button>
        </div>}

      <div ref={feedRef} className="rounded-2xl bg-[#1a1d21]/95 border border-white/10 shadow-[0_18px_45px_rgba(0,0,0,0.38)] relative overflow-hidden">
        {/* New Post Input */}
        {!isShowingThread &&
          <article
            ref={inputRef}
            onClick={() => onNavigate(ScreenName.COMPOSE)}
            className="rounded-t-2xl border-b border-white/10 p-4 group hover:bg-app-card transition-colors cursor-text"
          >
            <div className="flex items-center bg-[#1a1d21]/95 rounded-xl p-0 gap-3 group-hover:bg-app-card transition-colors">
              {/* Avatar */}
              <div className="shrink-0 z-10">
                <Avatar src={currentUser.avatar} alt="Me" />
              </div>

              {/* Input */}
              <p
                className="flex-1 text-app-muted text-[16px] leading-relaxed whitespace-pre-wrap cursor-text"
              >
                What's new?
              </p>

              {/* Post button */}
              <button
                className="bg-app-peach text-app-bg font-semibold px-4 py-1 rounded-full hover:brightness-110 active:brightness-95 transition"
              >
                Post
              </button>
            </div>
          </article>}

        {/* Feed */}
        <Feed
          tweetItems={visibleTweets}
          currentUser={currentUser}
          isThreadOpen={isShowingThread}
          headerRef={headerRef}
          handleOpenThread={handleOpenThread}
          onDeleteItem={handleDeleteItem}
        />

        {!isShowingThread && (
          <>
            <div ref={loadMoreTriggerRef} className="h-4" />

            {isLoadingMoreFeedItems && (
              <div className="px-4 pb-4 text-center text-xs text-app-muted">Loading more tweets...</div>
            )}

            {!hasMoreFeedItems && homeFeedItems.length > 0 && (
              <div className="px-4 pb-4 text-center text-xs text-app-muted">You are all caught up.</div>
            )}
          </>
        )}
      </div>
      {/* FAB */}
      {showFAB && <button
        aria-label="Close"
        onClick={() => onNavigate(ScreenName.COMPOSE)}
        className="fixed right-4 sm:right-6 bottom-8 w-14 h-14 bg-app-peach rounded-full flex items-center justify-center shadow-lg shadow-app-peach/20 hover:scale-110 active:scale-95 transition-transform z-30"
      >
        <Plus className="text-app-bg w-8 h-8" />
      </button>}
    </>
  );
};