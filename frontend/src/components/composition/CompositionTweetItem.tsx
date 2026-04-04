import { BarChart2, Globe, GripVertical, Image, Pencil, Play, Smile, Sparkles, Trash2, X } from "lucide-react";
import { Avatar, Button } from "../Shared";
import type { TweetDraft, User } from "../../types";

interface CompositionTweetItemProps {
    tweet: TweetDraft;
    index: number;
    totalTweets: number;
    maxChars: number;
    currentUser: User;
    activeTweetIndex: number;
    audience: string;
    mediaActionRef: React.RefObject<HTMLDivElement>;
    emojiActionRef: React.RefObject<HTMLDivElement>;
    pollActionRef: React.RefObject<HTMLDivElement>;
    aiActionRef: React.RefObject<HTMLDivElement>;
    audienceActionRef: React.RefObject<HTMLButtonElement>;
    setActiveTweetIndex: React.Dispatch<React.SetStateAction<number>>;
    setActiveSheet: React.Dispatch<React.SetStateAction<'media' | 'emoji' | 'poll' | 'ai' | 'audience' | null>>;
    setTextareaRef: (index: number, el: HTMLTextAreaElement | null) => void;
    onTextChange: (index: number, text: string) => void;
    onRemoveTweet: (id: string) => void;
    onOpenMediaEditor: (tweetId: string, mediaId: string, url: string, index: number) => void;
    onRemoveMedia: (tweetId: string, mediaId: string) => void;
    onRemovePoll: (tweetId: string) => void;
}

const CompositionTweetItem: React.FC<CompositionTweetItemProps> = ({
    tweet,
    index,
    totalTweets,
    maxChars,
    currentUser,
    activeTweetIndex,
    audience,
    mediaActionRef,
    emojiActionRef,
    pollActionRef,
    aiActionRef,
    audienceActionRef,
    setActiveTweetIndex,
    setActiveSheet,
    setTextareaRef,
    onTextChange,
    onRemoveTweet,
    onOpenMediaEditor,
    onRemoveMedia,
    onRemovePoll,
}) => {
    const remainingChars = maxChars - tweet.text.length;

    return (
        <div className="flex gap-3 relative group">
            {index < totalTweets - 1 && (
                <div className="absolute left-[20px] top-[50px] bottom-[-16px] w-0.5 bg-white/20 z-0" />
            )}

            <div className="shrink-0 z-10 pt-1 flex flex-col items-center gap-2">
                {totalTweets > 1 && (
                    <div className="cursor-grab active:cursor-grabbing text-app-muted hover:text-app-peach p-1">
                        <GripVertical size={16} />
                    </div>
                )}
                <Avatar src={currentUser.avatar} alt="Me" />
            </div>

            <div className="flex-1 min-w-0 rounded-2xl p-1 border border-transparent transition-colors">
                <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2 overflow-hidden">
                        <span className="text-xs font-medium text-white/70 shrink-0">@{currentUser.handle}</span>
                        {remainingChars < 0 ? (
                            <span className="text-[10px] font-bold text-red-400 animate-pulse truncate">Character Limit Exceeded</span>
                        ) : remainingChars < 20 ? (
                            <span className="text-[10px] font-bold text-orange-400 truncate">Approaching Character Limit</span>
                        ) : null}
                    </div>
                    {totalTweets > 1 && (
                        <button
                            aria-label="Close"
                            type="button"
                            onPointerDown={(event) => event.stopPropagation()}
                            onClick={(event) => {
                                event.stopPropagation();
                                onRemoveTweet(tweet.id);
                            }}
                            className="text-white/60 hover:text-red-400 p-1 shrink-0 ml-2"
                        >
                            <Trash2 size={16} />
                        </button>
                    )}
                </div>

                <textarea
                    ref={(el) => setTextareaRef(index, el)}
                    value={tweet.text}
                    onChange={(e) => {
                        onTextChange(index, e.target.value);
                        setActiveTweetIndex(index);
                    }}
                    onFocus={() => setActiveTweetIndex(index)}
                    placeholder={index === 0 ? "What's happening?" : "Add another tweet..."}
                    className="w-full bg-transparent text-white text-lg placeholder-white/45 outline-none resize-none min-h-[88px] leading-6"
                />

                {tweet.media.length > 0 && (
                    <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
                        {tweet.media.map((m) => (
                            <div key={m.id} className="w-24 h-24 rounded-xl bg-black/30 relative shrink-0 group">
                                {m.type === "video" ? (
                                    <>
                                        <video src={m.url} className="w-full h-full object-cover rounded-xl" />
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-xl">
                                            <Play size={32} className="text-white fill-white hover:scale-110" />
                                        </div>
                                    </>
                                ) : (
                                    <img aria-label="Close" src={m.url} className="w-full h-full object-cover rounded-xl" />
                                )}
                                {m.type === "image" && (
                                    <button
                                        aria-label="Edit image"
                                        title="Edit image"
                                        className="absolute top-1 left-1 bg-black/50 p-1 rounded-full text-white hover:bg-black/70"
                                        onClick={() => onOpenMediaEditor(tweet.id, m.id, m.url, index)}
                                    >
                                        <Pencil size={12} />
                                    </button>
                                )}
                                <button
                                    aria-label="Remove media"
                                    title="Remove media"
                                    className="absolute top-1 right-1 bg-black/50 p-1 rounded-full text-white hover:bg-black/70"
                                    onClick={() => onRemoveMedia(tweet.id, m.id)}
                                >
                                    <X size={12} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

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
                        <button onClick={() => onRemovePoll(tweet.id)} className="mt-2 text-xs text-red-400 flex items-center gap-1">
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
                                        setActiveSheet("media");
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
                                        setActiveSheet("emoji");
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
                                        setActiveSheet("poll");
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
                                        setActiveSheet("ai");
                                    }}
                                    className="!text-white/65 hover:!text-white"
                                />
                            </div>
                        </div>

                        <div
                            className={`text-xs font-medium shrink-0 ml-2 ${remainingChars < 0 ? "text-red-400" : remainingChars < 20 ? "text-orange-400" : "text-app-muted"
                                }`}
                        >
                            {tweet.text.length}/{maxChars}
                        </div>
                    </div>

                    <div className="mt-2 flex items-center justify-between">
                        <button
                            ref={index === activeTweetIndex ? audienceActionRef : undefined}
                            onClick={() => {
                                setActiveTweetIndex(index);
                                setActiveSheet("audience");
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
    );
};

export default CompositionTweetItem;
