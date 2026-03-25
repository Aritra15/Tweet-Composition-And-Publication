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
  onPublish: () => void;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';

export const PublishScreen: React.FC<PublishProps> = ({ thread, currentUser, onBack, onPublish }) => {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [isPublishing, setIsPublishing] = useState(false);

  const tweets = thread?.tweets ?? [];

  const showToast = (message: string, type: 'success' | 'error') => {
    setToastMessage(message);
    setToastType(type);
    window.setTimeout(() => {
      setToastMessage(null);
    }, 2500);
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

    const response = await fetch(`${API_BASE_URL}/api/v1/tweets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: currentUser.id,
        text,
        media: normalizedMedia,
        poll: normalizedPoll,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      const detail = typeof error?.detail === 'string' ? error.detail : 'Failed to publish tweet';
      throw new Error(detail);
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

  const handleFinish = async () => {
    if (!tweets.length || isPublishing) {
      return;
    }

    const hasEmptyTweetText = tweets.some((tweet) => tweet.text.trim().length === 0);
    if (hasEmptyTweetText) {
      showToast('All tweets must have text before publishing', 'error');
      return;
    }

    setIsPublishing(true);

    try {
      if (tweets.length > 1) {
        // await publishThread();
        return;
      } else {
        const tweet = tweets[0];
        await publishTweet(tweet.text.trim(), tweet.media, tweet.poll);
      }

      showToast('Published successfully!', 'success');

      window.setTimeout(() => {
        onPublish();
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
                  {tweets.length > 1 ? `Your ${tweets.length} tweets are queued for publishing` : 'Your tweet is ready to be published'}
                </p>
              </div>

              <div className="w-full space-y-3">
                {tweets.map((tweet: TweetDraft) => (
                  <article key={tweet.id} className={"p-4 relative"}>
                    <div className="flex gap-3">
                      <div className="shrink-0 z-10">
                        <Avatar src={currentUser.avatar} alt={currentUser.name} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="font-bold text-app-text truncate">{currentUser.name}</span>
                          <span className="text-app-muted truncate">{currentUser.handle}</span>
                          <span className="text-app-muted text-sm">· 0h</span>
                        </div>
                        <p className="text-app-text text-[15px] leading-relaxed whitespace-pre-wrap">
                          {tweet.text}
                        </p>

                        {tweet.media.length > 0 && (
                          <div className="mb-3 overflow-x-auto flex gap-2 py-1">
                            {tweet.media.map((media : TweetMedia, idx : number) => {
                              const isVideo = media.url.startsWith('data:video/');
                              const single = tweet.media.length === 1;

                              if (isVideo) {
                                return <VideoPlayer key={idx} url={media.url} single={single} />;
                              }

                              return (
                                <div
                                  key={idx}
                                  className={`flex-shrink-0 relative ${single ? 'max-h-[360px] max-w-[90%]' : 'h-[200px]'} rounded-2xl overflow-hidden border border-app-border`}
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
                ))}
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
