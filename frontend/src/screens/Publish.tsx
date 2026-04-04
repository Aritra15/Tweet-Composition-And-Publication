import React, { useState } from 'react';
import { Feather } from 'lucide-react';
import { motion } from 'framer-motion';
import { Avatar, Button, Toast, TweetActions } from '../components/Shared';
import type { Poll, Thread, TweetDraft, TweetMedia, User } from '../types';
import VideoPlayer from '../components/VideoPlayer';

interface PublishProps {
  thread: Thread | null;
  currentUser: User;
  onBack: () => void;
  onPublish: (publishedThread: Thread) => void;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';

export const PublishScreen: React.FC<PublishProps> = ({ thread, currentUser, onBack, onPublish }) => {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [isPublishing, setIsPublishing] = useState(false);

  const tweets = thread?.tweets ?? [];
  const isPublishableTweet = (tweet: TweetDraft) => tweet.text.trim().length > 0 || tweet.media.length > 0 || Boolean(tweet.poll);
  const publishableTweets = tweets.filter(isPublishableTweet);
  const isThreadDraft = publishableTweets.length > 1;

  const showToast = (message: string, type: 'success' | 'error') => {
    setToastMessage(message);
    setToastType(type);
    window.setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  const parseApiError = async (response: Response, fallbackMessage: string) => {
    const error = await response.json().catch(() => ({}));
    return typeof error?.detail === 'string' ? error.detail : fallbackMessage;
  };

  const rollbackTweet = async (tweetId: string) => {
    const rollbackResponse = await fetch(`${API_BASE_URL}/api/v1/tweets/${tweetId}`, {
      method: 'DELETE',
    });

    if (!rollbackResponse.ok) {
      throw new Error(await parseApiError(rollbackResponse, 'Rollback failed'));
    }
  };

  const publishTweet = async (text: string, media: Array<TweetMedia>, poll?: Poll) => {
    const normalizedMedia = media.map((item) => ({
      url: item.url,
      type: item.type,
      source: item.source,
    }));

    const normalizedPoll = poll
      ? {
        question: poll.question,
        options: poll.options
          .map((option) => ({ text: option.text.trim() }))
          .filter((option) => option.text.length > 0),
      }
      : undefined;

    let createdTweetId: string | null = null;

    try {
      const tweetResponse = await fetch(`${API_BASE_URL}/api/v1/tweets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: currentUser.id,
          text,
        }),
      });

      if (!tweetResponse.ok) {
        throw new Error(await parseApiError(tweetResponse, 'Failed to publish tweet'));
      }

      const createdTweet: { id: string } = await tweetResponse.json();
      createdTweetId = createdTweet.id;

      if (normalizedMedia.length > 0) {
        const mediaResponse = await fetch(`${API_BASE_URL}/api/v1/media/bulk/${createdTweet.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(normalizedMedia),
        });

        if (!mediaResponse.ok) {
          throw new Error(await parseApiError(mediaResponse, 'Failed to attach media'));
        }
      }

      if (normalizedPoll && normalizedPoll.options.length > 0) {
        const pollResponse = await fetch(`${API_BASE_URL}/api/v1/polls`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tweet_id: createdTweet.id,
            question: normalizedPoll.question,
          }),
        });

        if (!pollResponse.ok) {
          throw new Error(await parseApiError(pollResponse, 'Failed to create poll'));
        }

        const createdPoll: { id: string } = await pollResponse.json();

        for (const option of normalizedPoll.options) {
          const optionResponse = await fetch(`${API_BASE_URL}/api/v1/polls/${createdPoll.id}/options`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(option),
          });

          if (!optionResponse.ok) {
            throw new Error(await parseApiError(optionResponse, 'Failed to create poll option'));
          }
        }
      }

      return createdTweet.id;
    } catch (error) {
      if (createdTweetId) {
        try {
          await rollbackTweet(createdTweetId);
        } catch {
          const message = error instanceof Error ? error.message : 'Publishing failed';
          throw new Error(`${message}. Rollback failed; please delete the partial tweet manually.`);
        }
      }

      throw error;
    }
  };

  // const publishThread = async () => {
  //   const tweetsPayload = tweets.map((tweet) => ({
  //     text: tweet.text.trim(),
  //     media: tweet.media.map((item) => ({
  //       url: item.url,
  //       type: item.type === 'gif' ? 'image' : item.type,
  //       source: item.source,
  //     })),
  //     poll: tweet.poll
  //       ? {
  //         question: tweet.poll.question,
  //         options: tweet.poll.options
  //           .map((option) => ({ text: option.text.trim() }))
  //           .filter((option) => option.text.length > 0),
  //       }
  //       : undefined,
  //   }));

  //   const response = await fetch(`${API_BASE_URL}/api/v1/tweets/thread`, {
  //     method: 'POST',
  //     headers: { 'Content-Type': 'application/json' },
  //     body: JSON.stringify({
  //       user_id: currentUser.id,
  //       tweets: tweetsPayload,
  //     }),
  //   });

  //   if (!response.ok) {
  //     const error = await response.json().catch(() => ({}));
  //     const detail = typeof error?.detail === 'string' ? error.detail : 'Failed to publish thread';
  //     throw new Error(detail);
  //   }
  // };

  const publishThreadTransactional = async (): Promise<Thread> => {
    const createdTweets: Array<{ id: string; draft: TweetDraft }> = [];

    try {
      for (const tweet of publishableTweets) {
        const createdTweetId = await publishTweet(tweet.text.trim(), tweet.media, tweet.poll);
        createdTweets.push({ id: createdTweetId, draft: tweet });
      }

      return {
        tweets: createdTweets.map(({ id, draft }) => ({
          ...draft,
          id,
        })),
      };
    } catch (error) {
      if (createdTweets.length > 0) {
        const rollbackResults = await Promise.allSettled(
          createdTweets.map(({ id }) => rollbackTweet(id)),
        );
        const rollbackFailed = rollbackResults.some((result) => result.status === 'rejected');

        if (rollbackFailed) {
          const message = error instanceof Error ? error.message : 'Publishing failed';
          throw new Error(`${message}. Some tweets were published and rollback failed.`);
        }
      }

      throw error;
    }
  };

  const handleFinish = async () => {
    if (isPublishing) {
      return;
    }

    if (!publishableTweets.length) {
      showToast('Cannot publish an empty tweet.', 'error');
      return;
    }

    const skippedCount = tweets.length - publishableTweets.length;

    setIsPublishing(true);

    try {
      const publishedThread = await publishThreadTransactional();

      if (skippedCount > 0) {
        showToast(`Published successfully! ${skippedCount} empty ${skippedCount === 1 ? 'tweet was' : 'tweets were'} skipped.`, 'success');
      } else {
        showToast('Published successfully!', 'success');
      }

      window.setTimeout(() => {
        onPublish(publishedThread);
      }, 900);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Publishing failed', 'error');
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-[2px] flex items-center justify-center p-2 sm:p-4"
    >
      <div className="w-full max-w-xl h-[85%] bg-[#101214] border border-white/10 rounded-3xl shadow-[0_24px_80px_rgba(0,0,0,0.6)] overflow-hidden flex flex-col">
        <div className="relative flex items-center px-4 py-3 border-b border-white/10 bg-[#101214]/95 backdrop-blur shrink-0">
          <button onClick={onBack} className="text-white/90 hover:text-white text-l font-medium px-1 py-1">
            Cancel
          </button>
          <h2 className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-semibold text-white text-lg">Publish</h2>
        </div>

        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="h-full flex flex-col py-2 animate-fade-in">
              <div className="flex flex-col items-center mb-6">
                <h3 className="text-2xl font-bold text-white mb-2">Ready to post</h3>
                <p className="text-white/65 text-center max-w-xs">
                  {publishableTweets.length > 1 ? `Your ${publishableTweets.length} tweets are queued for publishing` : 'Your tweet is ready to be published'}
                </p>
              </div>

              <div className="w-full space-y-3">
                {isThreadDraft && (
                  <div className="px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-app-peach/80">
                    Thread preview · {publishableTweets.length} posts
                  </div>
                )}

                {publishableTweets.map((tweet: TweetDraft, index: number) => {
                  const showAuthorMeta = !isThreadDraft || index === 0;

                  return (
                  <article key={tweet.id} className={"p-4 relative border-y border-white/10"}>
                    <div className="flex gap-3">
                      <div className="shrink-0 z-10 w-10 flex justify-center">
                        {showAuthorMeta ? (
                          <Avatar src={currentUser.avatar} alt={currentUser.name} />
                        ) : (
                          <span className="mt-3 h-2.5 w-2.5 rounded-full bg-app-peach ring-2 ring-[#101214]" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        {showAuthorMeta ? (
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="font-bold text-app-text truncate">{currentUser.name}</span>
                            <span className="text-app-muted truncate">@{currentUser.handle}</span>
                            <span className="text-app-muted text-sm">· 0h</span>
                          </div>
                        ) : (
                          <div className="mb-1 text-[11px] font-medium uppercase tracking-[0.08em] text-app-muted">
                            Post {index + 1} of {publishableTweets.length}
                          </div>
                        )}
                        <p className="text-app-text text-[15px] leading-relaxed whitespace-pre-wrap">
                          {tweet.text}
                        </p>

                        {tweet.media.length > 0 && (
                          <div className="mb-3 overflow-x-auto flex gap-2 py-1">
                            {tweet.media.map((media: TweetMedia, idx: number) => {
                              const isVideo = media.url.startsWith('data:video/');
                              const single = tweet.media.length === 1;

                              if (isVideo) {
                                return <VideoPlayer key={idx} url={media.url} single={single} />;
                              }

                              return (
                                <div
                                  key={idx}
                                  className={`flex-shrink-0 relative ${single ? 'max-h-[360px] max-w-[90%]' : 'h-[200px]'} rounded-2xl overflow-hidden`}
                                >
                                  <img
                                    src={media.url}
                                    alt={`Tweet media ${idx + 1}`}
                                    className={`${single ? "block max-h-[360px] w-auto h-auto" : "h-full w-full"} object-contain`}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {tweet.poll && (
                          <div className="w-[85%] mb-3 rounded-xl border border-app-border bg-app-card/20 p-3">
                            <p className="text-sm font-semibold text-app-text mb-2">{tweet.poll.question}</p>
                            <div className="space-y-2">
                              {tweet.poll.options.map((option) => {
                                return (
                                  <button
                                    key={option.id}
                                    type="button"
                                    disabled={true}
                                    className={`w-full text-left text-xs text-app-text`}
                                  >
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="truncate pr-2">
                                        {option.text}
                                      </span>
                                      <span className="text-app-muted whitespace-nowrap">0</span>
                                    </div>
                                    <div className="h-2 rounded-full bg-app-border overflow-hidden">
                                      <div className="h-full rounded-full bg-app-muted/70 w-0" />
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        <TweetActions likes={0} replies={0} reposts={0} />
                      </div>
                    </div>
                  </article>
                )})}
              </div>
            </div>
          </div>

          <div className="sticky bottom-0 flex items-center justify-between pl-5 pr-5 pt-4 pb-5 border-t border-white/10 bg-[#101214]/95 backdrop-blur">
            <div className="w-8 h-8 rounded-full bg-app-peach flex items-center justify-center">
              <Feather className="text-app-bg w-5 h-5" />
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={handleFinish}
              disabled={isPublishing}
              className="!rounded-full !px-4 !py-1.5 !text-sm"
            >
              {isPublishing ? 'Publishing...' : 'Publish'}
            </Button>
          </div>

          {toastMessage && <Toast message={toastMessage} type={toastType} />}
        </div>
      </div>
    </motion.div>
  );
};
