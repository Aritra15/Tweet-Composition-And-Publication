import { Reorder } from "framer-motion";
import { Image, BarChart2, Feather, Globe, GripVertical, Plus, Smile, Sparkles, Trash2, X, Play } from "lucide-react";
import { useRef } from "react";
import { Avatar, Button } from "./Shared";
import type { TweetDraft, User } from "../types";

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
    mediaActionRef: React.RefObject<HTMLDivElement | null>;
    emojiActionRef: React.RefObject<HTMLDivElement | null>;
    pollActionRef: React.RefObject<HTMLDivElement | null>;
    aiActionRef: React.RefObject<HTMLDivElement | null>;
    audienceActionRef: React.RefObject<HTMLButtonElement | null>;
}

const CompositionArea: React.FC<CompositionAreaProps> = ({onBack, onNext, currentUser, tweets, setTweets, activeTweetIndex, setActiveTweetIndex, setActiveSheet, audience, mediaActionRef, emojiActionRef, pollActionRef, aiActionRef, audienceActionRef}) => {
    const textareaRefs = useRef<(HTMLTextAreaElement | null)[]>([]);

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
        setTweets(tweets.filter(t => t.id !== id));
    };

    const handleTextChange = (text: string) => {
        setTweets(tweets.map((t, i) => i === activeTweetIndex ? { ...t, text } : t));
    };

    const canProceed = tweets.every(t => (t.text.length > 0 && t.text.length <= MAX_CHARS) || t.media.length > 0 || t.poll);

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
                        const remainingChars = MAX_CHARS - tweet.text.length;

                        return (
                            <Reorder.Item key={tweet.id} value={tweet} className="relative">
                                <div className="flex gap-3 relative group">
                                    {/* Connector Line for Thread */}
                                    {index < tweets.length - 1 && (
                                        <div className="absolute left-[20px] top-[50px] bottom-[-16px] w-0.5 bg-white/20 z-0" />
                                    )}

                                    <div className="shrink-0 z-10 pt-1 flex flex-col items-center gap-2">
                                        {tweets.length > 1 && (
                                            <div className="cursor-grab active:cursor-grabbing text-app-muted hover:text-app-peach p-1">
                                                <GripVertical size={16} />
                                            </div>
                                        )}
                                        <Avatar src={currentUser.avatar} alt="Me" />
                                    </div>

                                    <div className="flex-1 min-w-0 rounded-2xl p-1 border border-transparent transition-colors">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                <span className="text-xs font-medium text-white/70 shrink-0">
                                                    @{currentUser.handle}
                                                </span>
                                                {remainingChars < 0 ? (
                                                    <span className="text-[10px] font-bold text-red-400 animate-pulse truncate">
                                                        Character Limit Exceeded
                                                    </span>
                                                ) : remainingChars < 20 ? (
                                                    <span className="text-[10px] font-bold text-orange-400 truncate">
                                                        Approaching Character Limit
                                                    </span>
                                                ) : null}
                                            </div>
                                            {tweets.length > 1 && (
                                                <button
                                                    aria-label="Close"
                                                    onClick={() => handleRemoveTweet(tweet.id)}
                                                    className="text-white/60 hover:text-red-400 p-1 shrink-0 ml-2"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>

                                        <textarea
                                            ref={el => { textareaRefs.current[index] = el; }}
                                            value={tweet.text}
                                            onChange={(e) => {
                                                handleTextChange(e.target.value);
                                                setActiveTweetIndex(index);
                                            }}
                                            onFocus={() => setActiveTweetIndex(index)}
                                            placeholder={index === 0 ? "What's happening?" : "Add another tweet..."}
                                            className="w-full bg-transparent text-white text-lg placeholder-white/45 outline-none resize-none min-h-[88px] leading-6"
                                        />

                                        {/* Media Preview */}
                                        {tweet.media.length > 0 && (
                                            <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
                                                {tweet.media.map(m => (
                                                    <div key={m.id} className="w-24 h-24 rounded-xl bg-black/30 relative shrink-0 group">
                                                        {m.type === 'video' ? (
                                                            <>
                                                                <video
                                                                    src={m.url}
                                                                    className="w-full h-full object-cover rounded-xl"
                                                                />
                                                                <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-xl">
                                                                    <Play size={32} className="text-white fill-white hover:scale-110" />
                                                                </div>
                                                            </>
                                                        ) : (
                                                            <img aria-label="Close" src={m.url} className="w-full h-full object-cover rounded-xl" />
                                                        )}
                                                        <button
                                                            aria-label="Close"
                                                            className="absolute top-1 right-1 bg-black/50 p-1 rounded-full text-white"
                                                            onClick={() => {
                                                                const newMedia = tweet.media.filter(media => media.id !== m.id);
                                                                setTweets(tweets.map(t => t.id === tweet.id ? { ...t, media: newMedia } : t));
                                                            }}
                                                        >
                                                            <X size={12} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Poll Preview */}
                                        {tweet.poll && (
                                            <div className="mt-3 p-3 rounded-xl border border-white/15 bg-white/5">
                                                <p className="font-semibold text-white mb-2">{tweet.poll.question}</p>
                                                <div className="space-y-2">
                                                    {tweet.poll.options.map((opt, i) => (
                                                        <div key={i} className="h-8 rounded-lg border border-white/15 flex items-center px-3 text-sm text-white/70">
                                                            {opt.text}
                                                        </div>
                                                    ))}
                                                </div>
                                                <button
                                                    onClick={() => setTweets(tweets.map(t => t.id === tweet.id ? { ...t, poll: undefined } : t))}
                                                    className="mt-2 text-xs text-red-400 flex items-center gap-1"
                                                >
                                                    <Trash2 size={12} /> Remove poll
                                                </button>
                                            </div>
                                        )}

                                        <div className="bottom-0 mt-3 border-t border-white/10 bg-[#101214]/95 backdrop-blur rounded-b-2xl px-1 py-2">
                                            <div className="flex items-center justify-between">
                                                <div className="flex gap-1 flex-1">
                                                    <div ref={index === activeTweetIndex ? mediaActionRef : undefined}>
                                                        <Button
                                                            variant="icon"
                                                            icon={Image}
                                                            onClick={() => {
                                                                setActiveTweetIndex(index);
                                                                setActiveSheet('media');
                                                            }}
                                                            className="!text-white/65 hover:!text-white"
                                                        />
                                                    </div>
                                                    <div ref={index === activeTweetIndex ? emojiActionRef : undefined}>
                                                        <Button
                                                            variant="icon"
                                                            icon={Smile}
                                                            onClick={() => {
                                                                setActiveTweetIndex(index);
                                                                setActiveSheet('emoji');
                                                            }}
                                                            className="!text-white/65 hover:!text-white"
                                                        />
                                                    </div>
                                                    <div ref={index === activeTweetIndex ? pollActionRef : undefined}>
                                                        <Button
                                                            variant="icon"
                                                            icon={BarChart2}
                                                            onClick={() => {
                                                                setActiveTweetIndex(index);
                                                                setActiveSheet('poll');
                                                            }}
                                                            className="!text-white/65 hover:!text-white"
                                                        />
                                                    </div>
                                                    <div ref={index === activeTweetIndex ? aiActionRef : undefined}>
                                                        <Button
                                                            variant="icon"
                                                            icon={Sparkles}
                                                            onClick={() => {
                                                                setActiveTweetIndex(index);
                                                                setActiveSheet('ai');
                                                            }}
                                                            className="!text-white/65 hover:!text-white"
                                                        />
                                                    </div>
                                                </div>

                                                <div className={`text-xs font-medium shrink-0 ml-2 ${remainingChars < 0 ? 'text-red-400' :
                                                    remainingChars < 20 ? 'text-orange-400' : 'text-app-muted'
                                                    }`}>
                                                    {tweet.text.length}/{MAX_CHARS}
                                                </div>
                                            </div>

                                            <div className="mt-2 flex items-center justify-between">
                                                <button
                                                    ref={index === activeTweetIndex ? audienceActionRef : undefined}
                                                    onClick={() => {
                                                        setActiveTweetIndex(index);
                                                        setActiveSheet('audience');
                                                    }}
                                                    className="text-app-peach text-sm font-medium flex items-center gap-2 px-3 py-1.5 rounded-full border border-app-peach/60 hover:bg-app-peach/10 transition-colors shrink-0"
                                                >
                                                    <Globe size={14} />
                                                    {audience}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
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
        </div>
    );
};

export default CompositionArea;