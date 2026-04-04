import { useEffect, useRef, useState } from 'react';
import { MoreVertical } from 'lucide-react';
import { Avatar, TweetActions } from "./Shared";
import type { FeedMedia, FeedPollOption, FeedThread, FeedTweet, User } from "../types";
import VideoPlayer from './VideoPlayer';
import MediaLightbox from './MediaLightbox';

type FeedComment = {
  id: string;
  userId: string;
  userName: string;
  userHandle: string;
  profilePictureUrl: string | null;
  content: string;
  createdAt: string;
};

type TweetEngagement = {
  likesCount: number;
  commentsCount: number;
  likedByMe: boolean;
  comments: FeedComment[];
};

type EngagementState = Record<string, TweetEngagement>;

type EngagementSummaryResponse = {
  tweet_id: string;
  likes_count: number;
  comments_count: number;
  liked_by_user: boolean;
};

type EngagementBatchRequest = {
  tweet_ids: string[];
  user_id: string;
};

type PollVoteApiResponse = {
  id: string;
  tweet_id: string;
  voted_option_id: string | null;
  options: Array<{
    id: string;
    text: string;
    votes_count: number;
  }>;
};

type CommentApiResponse = {
  id: string;
  tweet_id: string;
  user_id: string;
  user_name: string;
  user_handle: string;
  profile_picture_url: string | null;
  content: string;
  created_at: string;
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';

interface FeedProps {
  tweetItems: FeedThread[];
  currentUser: User;
  isThreadOpen: boolean;
  headerRef: React.RefObject<HTMLElement | null>;
  handleOpenThread: (twts: FeedThread) => void;
  onDeleteItem: (item: FeedThread) => Promise<void>;
  onOpenUserProfile?: (user: User) => void;
}

const Feed: React.FC<FeedProps> = ({ tweetItems, currentUser, isThreadOpen, headerRef, handleOpenThread, onDeleteItem, onOpenUserProfile }) => {
  const tweetCount = isThreadOpen ? tweetItems[0].tweets.length : 2;
  const [selectedPollOptions, setSelectedPollOptions] = useState<Record<string, string>>({});
  const [pollOptionsByTweet, setPollOptionsByTweet] = useState<Record<string, FeedPollOption[]>>({});
  const [pollVotePendingByTweet, setPollVotePendingByTweet] = useState<Record<string, boolean>>({});
  const [lightboxMedia, setLightboxMedia] = useState<{ url: string; type: 'image' | 'video' } | null>(null);
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);
  const [openMenuItemId, setOpenMenuItemId] = useState<string | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const [engagementState, setEngagementState] = useState<EngagementState>({});
  const [activeCommentsTweet, setActiveCommentsTweet] = useState<FeedTweet | null>(null);
  const [commentDraft, setCommentDraft] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);
  const [likePendingByTweet, setLikePendingByTweet] = useState<Record<string, boolean>>({});
  const openMenuRef = useRef<HTMLDivElement | null>(null);

  const openLightbox = (url: string, type: 'image' | 'video') => {
    setLightboxMedia({ url, type });
  };

  const closeLightbox = () => {
    setLightboxMedia(null);
  };

  const toFeedComment = (comment: CommentApiResponse): FeedComment => ({
    id: comment.id,
    userId: comment.user_id,
    userName: comment.user_name,
    userHandle: comment.user_handle,
    profilePictureUrl: comment.profile_picture_url,
    content: comment.content,
    createdAt: comment.created_at,
  });

  const getTweetEngagement = (tweet: FeedTweet): TweetEngagement => {
    return engagementState[tweet.id] ?? {
      likesCount: tweet.likes,
      commentsCount: tweet.replies,
      likedByMe: tweet.likedByMe ?? false,
      comments: [],
    };
  };

  const formatCommentAge = (createdAt: string): string => {
    const createdTime = new Date(createdAt).getTime();
    if (Number.isNaN(createdTime)) return 'now';

    const diffInMinutes = Math.max(1, Math.floor((Date.now() - createdTime) / 60000));
    if (diffInMinutes < 60) return `${diffInMinutes}m`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h`;

    return `${Math.floor(diffInHours / 24)}d`;
  };

  const refreshTweetSummary = async (tweetId: string) => {
    const response = await fetch(`${API_BASE_URL}/api/v1/engagement/tweets/${tweetId}/summary?user_id=${currentUser.id}`);
    if (!response.ok) {
      throw new Error('Failed to load engagement summary');
    }

    const summary: EngagementSummaryResponse = await response.json();

    setEngagementState((prev) => {
      const current = prev[tweetId];
      return {
        ...prev,
        [tweetId]: {
          likesCount: summary.likes_count,
          commentsCount: summary.comments_count,
          likedByMe: summary.liked_by_user,
          comments: current?.comments ?? [],
        },
      };
    });
  };

  const refreshTweetComments = async (tweet: FeedTweet) => {
    const response = await fetch(`${API_BASE_URL}/api/v1/engagement/tweets/${tweet.id}/comments`);
    if (!response.ok) {
      throw new Error('Failed to load comments');
    }

    const comments = (await response.json()) as CommentApiResponse[];
    setEngagementState((prev) => {
      const current = prev[tweet.id] ?? {
        likesCount: tweet.likes,
        commentsCount: tweet.replies,
        likedByMe: false,
        comments: [],
      };

      return {
        ...prev,
        [tweet.id]: {
          ...current,
          commentsCount: comments.length,
          comments: comments.map(toFeedComment),
        },
      };
    });
  };

  useEffect(() => {
    const nextSelected: Record<string, string> = {};
    const nextOptions: Record<string, FeedPollOption[]> = {};

    for (const item of tweetItems) {
      for (const tweet of item.tweets) {
        if (!tweet.poll) continue;

        nextOptions[tweet.id] = tweet.poll.options;
        if (tweet.poll.votedOptionId) {
          nextSelected[tweet.id] = tweet.poll.votedOptionId;
        }
      }
    }

    setSelectedPollOptions(nextSelected);
    setPollOptionsByTweet(nextOptions);
  }, [tweetItems]);

  useEffect(() => {
    const tweets = tweetItems.flatMap((item) => item.tweets);
    if (!tweets.length) {
      return;
    }

    let cancelled = false;

    const loadSummaries = async () => {
      let summaries: EngagementSummaryResponse[] = [];
      try {
        const payload: EngagementBatchRequest = {
          tweet_ids: tweets.map((tweet) => tweet.id),
          user_id: currentUser.id,
        };

        const response = await fetch(`${API_BASE_URL}/api/v1/engagement/tweets/summaries`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          return;
        }

        summaries = (await response.json()) as EngagementSummaryResponse[];
      } catch {
        return;
      }

      if (cancelled) {
        return;
      }

      setEngagementState((prev) => {
        const next = { ...prev };

        for (const summary of summaries) {
          const current = next[summary.tweet_id];
          next[summary.tweet_id] = {
            likesCount: summary.likes_count,
            commentsCount: summary.comments_count,
            likedByMe: summary.liked_by_user,
            comments: current?.comments ?? [],
          };
        }

        return next;
      });
    };

    void loadSummaries();

    return () => {
      cancelled = true;
    };
  }, [tweetItems, currentUser.id]);

  const toggleLike = async (tweet: FeedTweet) => {
    if (likePendingByTweet[tweet.id]) {
      return;
    }

    setLikePendingByTweet((prev) => ({ ...prev, [tweet.id]: true }));

    const current = getTweetEngagement(tweet);
    const optimisticLiked = !current.likedByMe;

    setEngagementState((prev) => ({
      ...prev,
      [tweet.id]: {
        ...current,
        likedByMe: optimisticLiked,
        likesCount: Math.max(0, current.likesCount + (optimisticLiked ? 1 : -1)),
      },
    }));

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/engagement/tweets/${tweet.id}/likes${optimisticLiked ? '' : `?user_id=${currentUser.id}`}`, {
        method: optimisticLiked ? 'POST' : 'DELETE',
        headers: optimisticLiked ? { 'Content-Type': 'application/json' } : undefined,
        body: optimisticLiked ? JSON.stringify({ user_id: currentUser.id }) : undefined,
      });

      if (!response.ok) {
        throw new Error('Failed to update like');
      }

      const summary: EngagementSummaryResponse = await response.json();

      setEngagementState((prev) => ({
        ...prev,
        [tweet.id]: {
          ...prev[tweet.id],
          likesCount: summary.likes_count,
          commentsCount: summary.comments_count,
          likedByMe: summary.liked_by_user,
          comments: prev[tweet.id]?.comments ?? [],
        },
      }));
    } catch {
      try {
        await refreshTweetSummary(tweet.id);
      } catch {
        // keep optimistic result when summary refresh fails
      }
    } finally {
      setLikePendingByTweet((prev) => ({ ...prev, [tweet.id]: false }));
    }
  };

  const openComments = async (tweet: FeedTweet) => {
    setActiveCommentsTweet(tweet);
    setLoadingComments(true);

    try {
      await refreshTweetComments(tweet);
    } catch {
      // Keep sheet open even when fetch fails.
    } finally {
      setLoadingComments(false);
    }
  };

  const submitComment = async () => {
    if (!activeCommentsTweet || !commentDraft.trim() || submittingComment) {
      return;
    }

    const tweet = activeCommentsTweet;
    const content = commentDraft.trim();
    setSubmittingComment(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/engagement/tweets/${tweet.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: currentUser.id,
          content,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit comment');
      }

      const created = toFeedComment((await response.json()) as CommentApiResponse);
      setEngagementState((prev) => {
        const current = prev[tweet.id] ?? {
          likesCount: tweet.likes,
          commentsCount: tweet.replies,
          likedByMe: false,
          comments: [],
        };

        const nextComments = [created, ...current.comments];
        return {
          ...prev,
          [tweet.id]: {
            ...current,
            commentsCount: nextComments.length,
            comments: nextComments,
          },
        };
      });

      setCommentDraft('');
      await refreshTweetSummary(tweet.id);
    } catch {
      // User can retry when API fails.
    } finally {
      setSubmittingComment(false);
    }
  };

  const getPollBarWidth = (votesCount: number, totalVotes: number): string => {
    if (totalVotes === 0) {
      return '0%';
    }

    return `${Math.max(4, Math.round((votesCount / totalVotes) * 100))}%`;
  };

  const getPollBarWidthClass = (votesCount: number, totalVotes: number): string => {
    const widthPercent = Number.parseInt(getPollBarWidth(votesCount, totalVotes), 10);

    if (widthPercent >= 100) return 'w-full';
    if (widthPercent >= 92) return 'w-11/12';
    if (widthPercent >= 84) return 'w-10/12';
    if (widthPercent >= 75) return 'w-9/12';
    if (widthPercent >= 67) return 'w-8/12';
    if (widthPercent >= 59) return 'w-7/12';
    if (widthPercent >= 50) return 'w-6/12';
    if (widthPercent >= 42) return 'w-5/12';
    if (widthPercent >= 34) return 'w-4/12';
    if (widthPercent >= 25) return 'w-3/12';
    if (widthPercent >= 17) return 'w-2/12';
    if (widthPercent > 0) return 'w-1/12';

    return 'w-0';
  };

  const handlePollOptionClick = async (tweet: FeedTweet, optionId: string) => {
    const pollId = tweet.poll?.id;
    if (!pollId) {
      return;
    }

    if (pollVotePendingByTweet[tweet.id]) {
      return;
    }

    setPollVotePendingByTweet((prev) => ({ ...prev, [tweet.id]: true }));

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/polls/${pollId}/votes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: currentUser.id,
          option_id: optionId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit poll vote');
      }

      const payload = (await response.json()) as PollVoteApiResponse;
      const nextOptions: FeedPollOption[] = payload.options
        .map((option) => ({
          id: option.id,
          text: option.text,
          votesCount: option.votes_count,
        }));

      setPollOptionsByTweet((prev) => ({
        ...prev,
        [tweet.id]: nextOptions,
      }));

      const votedOptionId = payload.voted_option_id;
      if (typeof votedOptionId === 'string' && votedOptionId.length > 0) {
        setSelectedPollOptions((prev) => ({
          ...prev,
          [tweet.id]: votedOptionId,
        }));
      }
    } catch {
      // Keep current poll state if vote request fails.
    } finally {
      setPollVotePendingByTweet((prev) => ({ ...prev, [tweet.id]: false }));
    }
  };

  const handleDeleteClick = async (item: FeedThread) => {
    setDeletingItemId(item.id);

    try {
      await onDeleteItem(item);
      setOpenMenuItemId(null);
    } catch (error) {
      console.error(error);
    } finally {
      setDeletingItemId(null);
    }
  };

  useEffect(() => {
    if (!openMenuItemId) {
      return;
    }

    const closeMenuIfUnderHeader = () => {
      if (!openMenuRef.current) {
        return;
      }

      const headerBottom = headerRef.current?.getBoundingClientRect().bottom ?? 0;
      const menuRect = openMenuRef.current.getBoundingClientRect();

      if (menuRect.bottom <= headerBottom) {
        setOpenMenuItemId(null);
      }
    };

    closeMenuIfUnderHeader();

    window.addEventListener('scroll', closeMenuIfUnderHeader, true);
    window.addEventListener('resize', closeMenuIfUnderHeader);

    return () => {
      window.removeEventListener('scroll', closeMenuIfUnderHeader, true);
      window.removeEventListener('resize', closeMenuIfUnderHeader);
    };
  }, [openMenuItemId, headerRef]);

  return (
    <div className="flex flex-col">
      {tweetItems.map((item) => {
        const isOwnerItem = item.tweets[0]?.author.id === currentUser.id;
        const isHoveredItem = hoveredItemId === item.id;
        const isMenuOpen = openMenuItemId === item.id;
        const isThreadItem = item.isThread && item.tweets.length > 1;

        return (
          <div
            key={item.id}
            onMouseEnter={() => setHoveredItemId(item.id)}
            onMouseLeave={() => {
              setHoveredItemId((prev) => (prev === item.id ? null : prev));
              setOpenMenuItemId((prev) => (prev === item.id ? null : prev));
            }}
            onClickCapture={(event) => {
              if (!isMenuOpen) {
                return;
              }

              const target = event.target as HTMLElement;
              const clickedDeleteAction = target.closest('[data-delete-action="true"]');
              const clickedMenuTrigger = target.closest('[data-menu-trigger="true"]');

              if (!clickedDeleteAction && !clickedMenuTrigger) {
                setOpenMenuItemId(null);
              }
            }}
            className={
              "mx-2 my-2 overflow-hidden rounded-2xl border transition-colors cursor-pointer shadow-[0_10px_28px_rgba(0,0,0,0.25)] " +
              (isThreadItem
                ? "bg-[#1b2025]/85 border-app-peach/25"
                : "bg-[#15191d]/85 border-white/10 hover:border-white/20 hover:bg-[#1a1f23]/85")
            }
          >
            {isThreadItem && (
              <div className="px-4 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-app-peach/80 border-b border-app-peach/15 bg-app-peach/[0.06]">
                Thread · {item.tweets.length} posts
              </div>
            )}

            {item.tweets.slice(0, tweetCount).map((tweet: FeedTweet, index: number) => {
              const showAuthorMeta = !isThreadItem || index === 0;

              return (
                <article key={tweet.id} className={"p-4 relative group/tweet " + (index > 0 ? "border-t border-white/10" : "") }>
                  {item.tweets.length !== 1 && index < tweetCount - 1 && (
                    <div className="absolute left-[38px] top-[60px] bottom-[-20px] w-0.5 bg-[#575757]" />
                  )}
                  <div className="flex gap-3">
                    <div className="shrink-0 z-10 w-10 flex justify-center">
                      {showAuthorMeta ? (
                        <Avatar src={tweet.author.avatar} alt={tweet.author.name} />
                      ) : (
                        <span className="mt-3 h-2.5 w-2.5 rounded-full bg-app-peach ring-2 ring-[#1a1f23]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      {showAuthorMeta ? (
                        <div className="flex items-start justify-between gap-3 mb-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                onOpenUserProfile?.(tweet.author);
                              }}
                              className="font-bold text-app-text truncate hover:underline underline-offset-2"
                            >
                              {tweet.author.name}
                            </button>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                onOpenUserProfile?.(tweet.author);
                              }}
                              className="text-app-muted truncate hover:text-app-text hover:underline underline-offset-2"
                            >
                              @{tweet.author.handle}
                            </button>
                            <span className="text-app-muted text-sm whitespace-nowrap">· {tweet.time}</span>
                          </div>
                          {isOwnerItem && index === 0 && (
                            <div className="relative shrink-0">
                              <button
                                type="button"
                                data-menu-trigger="true"
                                aria-label="More options"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setOpenMenuItemId(isMenuOpen ? null : item.id);
                                }}
                                className={`rounded-full p-1.5 text-app-muted hover:bg-white/10 hover:text-app-text transition ${isHoveredItem || isMenuOpen ? 'opacity-100' : 'opacity-0'}`}
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>

                              {isMenuOpen && (
                                <div
                                  ref={openMenuRef}
                                  className="absolute right-0 top-8 z-20 min-w-[120px] rounded-xl border border-white/15 bg-[#111315] p-1 shadow-xl"
                                >
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      void handleDeleteClick(item);
                                    }}
                                    disabled={deletingItemId === item.id}
                                    data-delete-action="true"
                                    className="w-full rounded-lg px-3 py-2 text-left text-sm text-red-300 hover:bg-red-500/10 disabled:opacity-50"
                                  >
                                    {deletingItemId === item.id ? 'Deleting...' : 'Delete'}
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="mb-1 text-[11px] font-medium uppercase tracking-[0.08em] text-app-muted">
                          Post {index + 1} of {item.tweets.length}
                        </div>
                      )}
                      <p className="text-app-text text-[15px] leading-relaxed whitespace-pre-wrap">
                        {tweet.text}
                      </p>

                      {tweet.media.length > 0 && (
                        <div className="mb-3 overflow-x-auto flex gap-2 py-1">
                          {tweet.media.map((media: FeedMedia, idx: number) => {
                            const single = tweet.media.length === 1;

                            if (media.type === 'video') {
                              return (
                                <VideoPlayer
                                  key={idx}
                                  url={media.url}
                                  single={single}
                                  headerRef={headerRef}
                                  onOpen={() => openLightbox(media.url, 'video')}
                                />
                              );
                            }

                            return (
                              <button
                                type="button"
                                key={idx}
                                onClick={() => openLightbox(media.url, 'image')}
                                onContextMenu={(event) => event.preventDefault()}
                                className={`flex-shrink-0 relative p-0 bg-transparent cursor-zoom-in ${single ? 'max-h-[360px] max-w-[90%] w-fit' : 'h-[200px]'} rounded-2xl overflow-hidden`}
                              >
                                <img
                                  src={media.url}
                                  alt={`Tweet media ${idx + 1}`}
                                  onContextMenu={(event) => event.preventDefault()}
                                  className={`${single ? "block max-h-[360px] w-auto h-auto" : "h-full w-full"} object-contain`}
                                />
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {tweet.poll && (
                        <div className="w-[85%] mb-3 rounded-xl border border-app-border bg-app-card/20 p-3">
                          <p className="text-sm font-semibold text-app-text mb-2">{tweet.poll.question}</p>
                          <div className="space-y-2">
                            {(pollOptionsByTweet[tweet.id] ?? tweet.poll.options).map((option) => {
                              const visibleOptions = pollOptionsByTweet[tweet.id] ?? tweet.poll?.options ?? [];
                              const totalVotes = visibleOptions.reduce((sum, item) => sum + item.votesCount, 0);
                              const selectedOptionId = selectedPollOptions[tweet.id] ?? tweet.poll?.votedOptionId;
                              const isSelected = selectedOptionId === option.id;
                              const canSelect = Boolean(tweet.poll?.id);
                              const hasVoted = !!selectedOptionId;
                              const isPending = !!pollVotePendingByTweet[tweet.id];

                              return (
                                <button
                                  key={option.id}
                                  type="button"
                                  onClick={() => {
                                    if (!canSelect || hasVoted || isPending) return;
                                    void handlePollOptionClick(tweet, option.id);
                                  }}
                                  disabled={!canSelect || hasVoted || isPending}
                                  className={`w-full text-left text-xs text-app-text ${canSelect && !hasVoted && !isPending ? 'cursor-pointer' : 'cursor-default'} ${isPending ? 'opacity-70' : ''}`}
                                >
                                  {canSelect && !hasVoted && !isPending ? (
                                    <div className="flex items-center justify-between py-1">
                                      <span className="truncate pr-2">{option.text}</span>
                                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${isSelected ? 'border-app-peach bg-app-peach' : 'border-app-muted'}`}>
                                        {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                      </div>
                                    </div>
                                  ) : (
                                    <>
                                      <div className="flex items-center justify-between mb-1">
                                        <span className={`truncate pr-2 ${isSelected ? 'text-app-peach font-semibold' : ''}`}>
                                          {option.text}
                                        </span>
                                        <span className="text-app-muted whitespace-nowrap">{option.votesCount}</span>
                                      </div>
                                      <div className="h-2 rounded-full bg-app-border overflow-hidden">
                                        <div className={`h-full rounded-full ${isSelected ? 'bg-app-peach' : 'bg-app-muted/70'} ${getPollBarWidthClass(option.votesCount, totalVotes)}`} />
                                      </div>
                                    </>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <TweetActions
                        likes={getTweetEngagement(tweet).likesCount}
                        replies={getTweetEngagement(tweet).commentsCount}
                        reposts={tweet.reposts}
                        likedByMe={getTweetEngagement(tweet).likedByMe}
                        onToggleLike={() => void toggleLike(tweet)}
                        onOpenComments={() => void openComments(tweet)}
                      />
                    </div>
                  </div>
                </article>
              );
            })}

            {!isThreadOpen && item.tweets.length > 2 && (
              <div
                onClick={() => handleOpenThread(item)}
                className="text-app-muted border-t border-white/10 flex justify-center items-center pt-[8px] pr-[16px] pb-[8px] pl-[16px] hover:font-bold text-sm font-medium"
              >
                See more
              </div>
            )}
          </div>
        );
      })}

      {activeCommentsTweet && (
        <>
          <div
            className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-[2px]"
            onClick={() => {
              setActiveCommentsTweet(null);
              setCommentDraft('');
            }}
          />

          <div className="fixed inset-0 z-[70] flex items-center justify-center p-2 sm:p-4 pointer-events-none">
            <div className="pointer-events-auto w-full max-w-xl h-[82%] bg-[#101214] border border-white/10 rounded-3xl shadow-[0_24px_80px_rgba(0,0,0,0.6)] overflow-hidden flex flex-col">
              <div className="relative flex items-center px-4 py-3 border-b border-white/10 bg-[#101214]/95 backdrop-blur shrink-0">
                <button
                  onClick={() => {
                    setActiveCommentsTweet(null);
                    setCommentDraft('');
                  }}
                  className="text-white/90 hover:text-white text-sm font-medium px-1 py-1"
                >
                  Close
                </button>
                <h3 className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-base font-semibold text-white">
                  Comments
                </h3>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
                <div className="rounded-2xl border border-white/10 bg-[#14181d] p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Avatar src={activeCommentsTweet.author.avatar} alt={activeCommentsTweet.author.name} size="sm" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{activeCommentsTweet.author.name}</p>
                      <p className="text-xs text-white/55 truncate">@{activeCommentsTweet.author.handle}</p>
                    </div>
                  </div>
                  <p className="text-sm text-white/85 whitespace-pre-wrap">{activeCommentsTweet.text}</p>
                </div>

                <div className="space-y-2">
                  {loadingComments && (
                    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-4 text-sm text-white/60">
                      Loading comments...
                    </div>
                  )}

                  {!loadingComments && (getTweetEngagement(activeCommentsTweet).comments).length === 0 && (
                    <div className="rounded-xl border border-dashed border-white/20 p-3 text-xs text-white/55">
                      No comments yet. Start the conversation.
                    </div>
                  )}

                  {getTweetEngagement(activeCommentsTweet).comments.map((comment) => (
                    <div key={comment.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                      <div className="flex items-start gap-2">
                        <Avatar src={comment.profilePictureUrl} alt={comment.userName} size="sm" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 text-xs text-white/55">
                            <span className="font-semibold text-white/85 truncate">{comment.userName}</span>
                            <span className="truncate">@{comment.userHandle}</span>
                            <span className="shrink-0">· {formatCommentAge(comment.createdAt)}</span>
                          </div>
                          <p className="mt-1 text-sm text-white/90 whitespace-pre-wrap">{comment.content}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="sticky bottom-0 border-t border-white/10 bg-[#101214]/95 backdrop-blur p-3">
                <div className="rounded-xl border border-white/10 bg-[#0f1318] p-2">
                  <textarea
                    value={commentDraft}
                    onChange={(event) => setCommentDraft(event.target.value)}
                    className="w-full min-h-[86px] rounded-lg border border-white/10 bg-[#0a0d12] px-3 py-2 text-sm text-white resize-y"
                    placeholder="Write your reply"
                  />
                  <div className="mt-2 flex justify-end">
                    <button
                      type="button"
                      disabled={submittingComment || !commentDraft.trim()}
                      onClick={() => void submitComment()}
                      className="rounded-full bg-app-peach px-4 py-1.5 text-sm font-semibold text-[#111315] hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed transition"
                    >
                      {submittingComment ? 'Posting...' : 'Reply'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <MediaLightbox
        isOpen={lightboxMedia !== null}
        url={lightboxMedia?.url ?? null}
        type={lightboxMedia?.type ?? null}
        onClose={closeLightbox}
      />
    </div>
  );
};

export default Feed;
