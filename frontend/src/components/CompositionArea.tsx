import { Reorder } from "framer-motion";
import { Feather, Plus } from "lucide-react";
import { useRef, useState } from "react";
import type { TweetDraft, User } from "../types";
import { Button } from "./Shared";
import CompositionTweetItem from "./composition/CompositionTweetItem";
import MediaEditor, { type EditingMediaTarget } from "./composition/MediaEditor";

const MAX_CHARS = 280;

interface CompositionAreaProps {
    onBack: () => void;
    onNext: (data: { tweets: TweetDraft[] }) => void;
    currentUser: User;
    tweets: TweetDraft[];
    setTweets: React.Dispatch<React.SetStateAction<TweetDraft[]>>;
    activeTweetIndex: number;
    setActiveTweetIndex: React.Dispatch<React.SetStateAction<number>>;
    setActiveSheet: React.Dispatch<React.SetStateAction<'media' | 'emoji' | 'poll' | 'ai' | 'audience' | null>>;
    audience: string;
    mediaActionRef: React.RefCallback<HTMLDivElement>;
    emojiActionRef: React.RefCallback<HTMLDivElement>;
    pollActionRef: React.RefCallback<HTMLDivElement>;
    aiActionRef: React.RefCallback<HTMLDivElement>;
    audienceActionRef: React.RefCallback<HTMLButtonElement>;
}

const CompositionArea: React.FC<CompositionAreaProps> = ({ onBack, onNext, currentUser, tweets, setTweets, activeTweetIndex, setActiveTweetIndex, setActiveSheet, audience, mediaActionRef, emojiActionRef, pollActionRef, aiActionRef, audienceActionRef }) => {
    const textareaRefs = useRef<(HTMLTextAreaElement | null)[]>([]);
    const [editingMedia, setEditingMedia] = useState<EditingMediaTarget | null>(null);

    const handleAddTweet = () => {
        const newId = Date.now().toString();
        setTweets([...tweets, { id: newId, text: '', media: [] }]);
        setTimeout(() => {
            const idx = tweets.length;
            textareaRefs.current[idx]?.focus();
            setActiveTweetIndex(idx);
        }, 50);
    };

    const handleRemoveTweet = (id: string) => {
        if (tweets.length === 1) return;

        const removedIndex = tweets.findIndex((tweet) => tweet.id === id);
        if (removedIndex === -1) return;

        setTweets((prev) => prev.filter((tweet) => tweet.id !== id));
        setActiveTweetIndex((prevIndex) => {
            if (prevIndex > removedIndex) return prevIndex - 1;
            if (prevIndex === removedIndex) return Math.max(0, prevIndex - 1);
            return prevIndex;
        });
    };

    const handleTextChange = (index: number, text: string) => {
        setTweets(tweets.map((t, i) => i === index ? { ...t, text } : t));
    };

    const openMediaEditor = (tweetId: string, mediaId: string, url: string) => {
        setEditingMedia({ tweetId, mediaId, url });
    };

    const applyMediaEdits = (target: EditingMediaTarget, editedUrl: string) => {
        setTweets((prev) => prev.map((tweet) => {
            if (tweet.id !== target.tweetId) return tweet;

            return {
                ...tweet,
                media: tweet.media.map((item) => {
                    if (item.id !== target.mediaId) return item;
                    return { ...item, url: editedUrl };
                }),
            };
        }));
        setEditingMedia(null);
    };

    const removeMedia = (tweetId: string, mediaId: string) => {
        setTweets((prev) => prev.map((tweet) => {
            if (tweet.id !== tweetId) return tweet;
            return { ...tweet, media: tweet.media.filter((media) => media.id !== mediaId) };
        }));
    };

    const removePoll = (tweetId: string) => {
        setTweets((prev) => prev.map((tweet) => (tweet.id === tweetId ? { ...tweet, poll: undefined } : tweet)));
    };

    const hasPublishableTweet = tweets.some((tweet) => tweet.text.trim().length > 0 || tweet.media.length > 0 || Boolean(tweet.poll));
    const hasInvalidLength = tweets.some((tweet) => tweet.text.length > MAX_CHARS);
    const canProceed = hasPublishableTweet && !hasInvalidLength;
    return (
        <div
            className="w-full max-w-xl h-[85%] bg-[#101214] border border-white/10 rounded-3xl shadow-[0_24px_80px_rgba(0,0,0,0.6)] overflow-hidden flex flex-col"
        >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#101214]/95 backdrop-blur">
                <button onClick={onBack} className="text-white/90 hover:text-white text-l font-medium px-1 py-1">
                    Cancel
                </button>
                <span className="font-semibold text-white text-lg">
                    {tweets.length > 1 ? 'New thread' : 'New tweet'}
                </span>
                <button
                    className="px-3 py-1.5 -mr-2 text-l font-bold text-app-peach hover:text-app-text"
                >
                    Drafts
                </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto px-4 py-4 scroll-smooth">
                <Reorder.Group axis="y" values={tweets} onReorder={setTweets} className="space-y-4">
                    {tweets.map((tweet, index) => {
                        return (
                            <Reorder.Item key={tweet.id} value={tweet} className="relative">
                                <CompositionTweetItem
                                    tweet={tweet}
                                    index={index}
                                    totalTweets={tweets.length}
                                    maxChars={MAX_CHARS}
                                    currentUser={currentUser}
                                    activeTweetIndex={activeTweetIndex}
                                    audience={audience}
                                    mediaActionRef={mediaActionRef}
                                    emojiActionRef={emojiActionRef}
                                    pollActionRef={pollActionRef}
                                    aiActionRef={aiActionRef}
                                    audienceActionRef={audienceActionRef}
                                    setActiveTweetIndex={setActiveTweetIndex}
                                    setActiveSheet={setActiveSheet}
                                    setTextareaRef={(tweetIndex, el) => {
                                        textareaRefs.current[tweetIndex] = el;
                                    }}
                                    onTextChange={handleTextChange}
                                    onRemoveTweet={handleRemoveTweet}
                                    onOpenMediaEditor={(tweetId, mediaId, url, tweetIndex) => {
                                        setActiveTweetIndex(tweetIndex);
                                        openMediaEditor(tweetId, mediaId, url);
                                    }}
                                    onRemoveMedia={removeMedia}
                                    onRemovePoll={removePoll}
                                />
                            </Reorder.Item>
                        )
                    })}
                </Reorder.Group>

                <div className="ml-[52px] mt-4">
                    <button
                        onClick={handleAddTweet}
                        className="flex items-center gap-2 text-app-peach hover:text-sky-200 transition-colors py-2 px-3 rounded-xl hover:bg-white/5"
                    >
                        <Plus size={20} />
                        <span className="font-medium">Add to thread</span>
                    </button>
                </div>

                <div className="h-4" />
            </div>

            <div className="sticky bottom-0 flex items-center justify-between pl-4 pr-4 pt-3 pb-4 border-t border-white/10 bg-[#101214]/95 backdrop-blur">
                <div className="w-8 h-8 rounded-full bg-app-peach flex items-center justify-center">
                    <Feather className="text-app-bg w-5 h-5" />
                </div>
                <Button
                    variant="primary"
                    size="sm"
                    disabled={!canProceed}
                    onClick={() => onNext({ tweets })}
                    className="!rounded-full !px-4 !py-1.5 !text-sm"
                >
                    Post
                </Button>
            </div>

            <MediaEditor
                editingMedia={editingMedia}
                onClose={() => setEditingMedia(null)}
                onApply={applyMediaEdits}
            />
        </div>
    );
};

export default CompositionArea;