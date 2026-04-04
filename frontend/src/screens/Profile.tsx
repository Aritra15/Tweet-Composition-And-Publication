import { useMemo, useState } from 'react';
import { CalendarDays, Camera, PenSquare, Rows3 } from 'lucide-react';
import { Avatar } from '../components/Shared';
import Feed from '../components/Feed.tsx';
import { ScreenName, type FeedThread, type User } from '../types';

interface ProfileScreenProps {
  currentUser: User;
  userFeedItems: FeedThread[];
  headerRef: React.RefObject<HTMLElement | null>;
  onNavigate: (screen: ScreenName) => void;
  onDeleteFeedItem: (item: FeedThread) => Promise<void>;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  currentUser,
  userFeedItems,
  headerRef,
  onNavigate,
  onDeleteFeedItem,
}) => {
  const [threadTweets, setThreadTweets] = useState<FeedThread | null>(null);
  const isShowingThread = threadTweets !== null;

  const postStats = useMemo(() => {
    const totalPosts = userFeedItems.reduce((sum, item) => sum + item.tweets.length, 0);
    const threadCount = userFeedItems.filter((item) => item.isThread).length;
    const mediaCount = userFeedItems.reduce(
      (sum, item) => sum + item.tweets.reduce((tweetSum, tweet) => tweetSum + tweet.media.length, 0),
      0,
    );

    return {
      totalPosts,
      threadCount,
      mediaCount,
    };
  }, [userFeedItems]);

  const visibleFeedItems = isShowingThread ? [threadTweets] : userFeedItems;

  const handleOpenThread = (threadItem: FeedThread) => {
    setThreadTweets(threadItem);
  };

  const handleDeleteItem = async (item: FeedThread) => {
    await onDeleteFeedItem(item);

    if (threadTweets?.id === item.id) {
      setThreadTweets(null);
    }
  };

  return (
    <div className="rounded-xl mb-3 bg-[#242424] border border-white/10 relative overflow-hidden">
      <section className="relative px-5 pt-5 pb-4 border-b border-white/10 bg-[radial-gradient(120%_140%_at_100%_0%,rgba(255,153,102,0.26)_0%,rgba(255,153,102,0)_52%),linear-gradient(180deg,#191b1f_0%,#111315_100%)]">
        <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-app-peach/10 blur-2xl" />
        <div className="absolute -bottom-16 -left-8 h-44 w-44 rounded-full bg-cyan-500/10 blur-2xl" />

        <div className="relative z-10">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-4 min-w-0">
              <Avatar src={currentUser.avatar} alt={currentUser.name} size="lg" />
              <div className="min-w-0">
                <h2 className="text-xl font-bold text-app-text truncate">{currentUser.name}</h2>
                <p className="text-app-muted text-sm truncate">@{currentUser.handle}</p>
                <div className="mt-2 inline-flex items-center gap-1.5 text-[12px] text-app-muted">
                  <CalendarDays size={13} />
                  <span>Joined recently</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
              <p className="text-[11px] uppercase tracking-[0.12em] text-app-muted">Posts</p>
              <p className="text-lg font-semibold text-app-text leading-tight">{postStats.totalPosts}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
              <p className="text-[11px] uppercase tracking-[0.12em] text-app-muted">Threads</p>
              <p className="text-lg font-semibold text-app-text leading-tight">{postStats.threadCount}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
              <p className="text-[11px] uppercase tracking-[0.12em] text-app-muted">Media</p>
              <p className="text-lg font-semibold text-app-text leading-tight">{postStats.mediaCount}</p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              onClick={() => onNavigate(ScreenName.COMPOSE)}
              className="inline-flex items-center gap-2 rounded-full bg-app-peach px-4 py-2 text-sm font-semibold text-[#111315] hover:brightness-110 transition"
            >
              <PenSquare size={15} /> New post
            </button>

            {isShowingThread && (
              <button
                onClick={() => setThreadTweets(null)}
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium text-app-text hover:bg-white/10 transition"
              >
                <Rows3 size={15} /> Back to all posts
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-app-muted">Posts</h3>
          {!isShowingThread && (
            <span className="text-xs text-app-muted inline-flex items-center gap-1">
              <Camera size={12} /> Showing newest first
            </span>
          )}
        </div>

        {visibleFeedItems.length > 0 ? (
          <div className="rounded-xl border border-white/10 overflow-hidden">
            <Feed
              tweetItems={visibleFeedItems}
              currentUser={currentUser}
              isThreadOpen={isShowingThread}
              headerRef={headerRef}
              handleOpenThread={handleOpenThread}
              onDeleteItem={handleDeleteItem}
            />
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-white/20 bg-white/[0.03] p-8 text-center">
            <p className="text-xl font-semibold text-app-text">No posts yet</p>
            <p className="text-app-muted text-sm mt-1">Your threads and tweets will appear here once you publish.</p>
            <button
              onClick={() => onNavigate(ScreenName.COMPOSE)}
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-app-peach px-4 py-2 text-sm font-semibold text-[#111315] hover:brightness-110 transition"
            >
              <PenSquare size={15} /> Create your first post
            </button>
          </div>
        )}
      </section>
    </div>
  );
};
