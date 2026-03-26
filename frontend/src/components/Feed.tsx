import { useState } from 'react';
import { Avatar, TweetActions } from "./Shared";
import type { FeedMedia, FeedThread, FeedTweet } from "../types";
import VideoPlayer from './VideoPlayer';
import MediaLightbox from './MediaLightbox';

interface FeedProps {
  tweetItems: FeedThread[],
  userId: string,
  isThreadOpen: boolean,
  headerRef: React.RefObject<HTMLElement | null>;
  handleOpenThread: (twts: FeedThread) => void
}

const Feed: React.FC<FeedProps> = ({ tweetItems, userId, isThreadOpen, headerRef, handleOpenThread }) => {
  const tweetCount = isThreadOpen ? tweetItems[0].tweets.length : 2;
  const [selectedPollOptions, setSelectedPollOptions] = useState<Record<string, string>>({});
  const [lightboxMedia, setLightboxMedia] = useState<{ url: string; type: 'image' | 'video' } | null>(null);

  const openLightbox = (url: string, type: 'image' | 'video') => {
    setLightboxMedia({ url, type });
  };

  const closeLightbox = () => {
    setLightboxMedia(null);
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

  const handlePollOptionClick = (tweetId: string, optionId: string) => {
    setSelectedPollOptions((prev) => {
      if (prev[tweetId]) {
        return prev;
      }

      return {
        ...prev,
        [tweetId]: optionId,
      };
    });
  };

  return (
    <div className="flex flex-col">
      {tweetItems.map((item, i) => {
        return (
          <div key={item.id} className={"flex flex-col hover:bg-app-card/30 transition-colors cursor-pointer" + (i === tweetItems.length - 1 ? "" : " border-b border-white/10")}>
            {item.tweets.slice(0, tweetCount).map((tweet: FeedTweet, index: number) => (
              <article key={tweet.id} className={"p-4 relative"}>
                {item.tweets.length !== 1 && index < tweetCount - 1 && (
                  <div className="absolute left-[38px] top-[60px] bottom-[-20px] w-0.5 bg-[#575757]" />
                )}
                <div className="flex gap-3">
                  <div className="shrink-0 z-10">
                    <Avatar src={tweet.author.avatar} alt={tweet.author.name} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="font-bold text-app-text truncate">{tweet.author.name}</span>
                      <span className="text-app-muted truncate">{tweet.author.handle}</span>
                      <span className="text-app-muted text-sm">· {tweet.time}</span>
                    </div>
                    <p className="text-app-text text-[15px] leading-relaxed whitespace-pre-wrap">
                      {tweet.text}
                    </p>

                    {tweet.media.length > 0 && (
                      <div className="mb-3 overflow-x-auto flex gap-2 py-1">
                        {tweet.media.map((media: FeedMedia, idx: number) => {
                          // const isVideo = isVideoUrl(url);
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
                          {tweet.poll.options.map((option) => {
                            const totalVotes = tweet.poll?.options.reduce((sum, o) => sum + o.votesCount, 0) ?? 0;
                            const selectedOptionId = selectedPollOptions[tweet.id];
                            const isSelected = selectedOptionId === option.id;
                            const isMockUserTweet = tweet.author.id === userId;
                            const canSelect = !isMockUserTweet;
                            const hasVoted = !!selectedPollOptions[tweet.id];

                            return (
                              <button
                                key={option.id}
                                type="button"
                                onClick={() => canSelect && !hasVoted && handlePollOptionClick(tweet.id, option.id)}
                                disabled={!canSelect || hasVoted}
                                className={`w-full text-left text-xs text-app-text ${canSelect && !hasVoted ? 'cursor-pointer' : 'cursor-default'}`}
                              >
                                {canSelect && !hasVoted ? (
                                  // Selectable — radio button, no count or bar
                                  <div className="flex items-center justify-between py-1">
                                    <span className="truncate pr-2">{option.text}</span>
                                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${isSelected ? 'border-app-peach bg-app-peach' : 'border-app-muted'
                                      }`}>
                                      {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                    </div>
                                  </div>
                                ) : (
                                  // After voting or own tweet — show bar and count, highlight selected
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

                    <TweetActions likes={tweet.likes} replies={tweet.replies} reposts={tweet.reposts} />
                  </div>
                </div>
              </article>
            ))}

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

      <MediaLightbox
        isOpen={lightboxMedia !== null}
        url={lightboxMedia?.url ?? null}
        type={lightboxMedia?.type ?? null}
        onClose={closeLightbox}
      />
    </div>
  );
}

export default Feed;