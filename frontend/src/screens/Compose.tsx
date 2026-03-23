import React, { useState, useRef, useEffect } from 'react';
import { X, Image, Smile, BarChart2, Globe, Plus, GripVertical, Trash2, CheckCircle, Lock, AlertTriangle, Users, Sparkles, Wand2, Hash } from 'lucide-react';
import { motion, Reorder } from 'framer-motion';
import { type Thread, type TweetDraft, type TweetMedia, type User, AudienceType } from '../types';
import { Avatar, Button, BottomSheet, Toggle, Input } from '../components/Shared';
import { EmojiPicker } from '../components/EmojiPicker';

interface ComposeProps {
    onBack: () => void;
    onNext: (thread: Thread) => void;
    currentUser: User;
}

const MAX_CHARS = 280;

export const ComposeScreen: React.FC<ComposeProps> = ({ onBack, onNext, currentUser }) => {
    const [tweets, setTweets] = useState<TweetDraft[]>([
        { id: '1', text: '', media: [] }
    ]);
    const [activeTweetIndex, setActiveTweetIndex] = useState(0);

    // Audience Settings
    const [audience, setAudience] = useState<AudienceType>(AudienceType.EVERYONE);
    const [shareToCircle, setShareToCircle] = useState(false);
    const [isSensitive, setIsSensitive] = useState(false);

    // Sheet States
    const [activeSheet, setActiveSheet] = useState<'media' | 'emoji' | 'poll' | 'audience' | 'ai' | null>(null);

    // Poll State
    const [pollQuestion, setPollQuestion] = useState('');
    const [pollOptions, setPollOptions] = useState(['', '']);

    // AI State
    const [imagePrompt, setImagePrompt] = useState('');
    const [textLoading, setTextLoading] = useState(false);
    const [imgLoading, setImgLoading] = useState(false);
    const [hashtagsLoading, setHashtagsLoading] = useState(false);
    const [enhancedText, setEnhancedText] = useState('');
    const [generatedImage, setGeneratedImage] = useState('');
    const [suggestedHashtags, setSuggestedHashtags] = useState<string[]>([]);
    const [selectedHashtags, setSelectedHashtags] = useState<string[]>([]);

    // Focus management
    const textareaRefs = useRef<(HTMLTextAreaElement | null)[]>([]);
    const mediaInputRef = useRef<HTMLInputElement | null>(null);
    const mediaActionRef = useRef<HTMLDivElement | null>(null);
    const emojiActionRef = useRef<HTMLDivElement | null>(null);
    const pollActionRef = useRef<HTMLDivElement | null>(null);
    const aiActionRef = useRef<HTMLDivElement | null>(null);
    const audienceActionRef = useRef<HTMLButtonElement | null>(null);
    const [isMediaDragActive, setIsMediaDragActive] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (containerRef.current) {
            const height = containerRef.current.offsetHeight;
            containerRef.current.style.height = `${height}px`;
        }
    }, []); // empty array = runs once on mount

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

    const handleAddMediaFiles = (files: FileList | File[]) => {
        const imageFiles = Array.from(files).filter((file) => file.type.startsWith('image/'));
        if (imageFiles.length === 0) return;

        setTweets((prev) => prev.map((t, i) => {
            if (i !== activeTweetIndex) return t;

            const newMedia: TweetMedia[] = imageFiles.map((file, idx) => {
                const mediaType: 'gif' | 'image' = file.type === 'image/gif' ? 'gif' : 'image';
                return {
                    id: `${Date.now()}-${idx}`,
                    type: mediaType,
                    url: URL.createObjectURL(file),
                };
            });

            return { ...t, media: [...t.media, ...newMedia] };
        }));

        setActiveSheet(null);
    };

    const handleMediaInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            handleAddMediaFiles(e.target.files);
            e.target.value = '';
        }
    };

    const handleMediaDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsMediaDragActive(true);
    };

    const handleMediaDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsMediaDragActive(false);
    };

    const handleMediaDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsMediaDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleAddMediaFiles(e.dataTransfer.files);
        }
    };

    const handleAddEmoji = (emoji: string) => {
        setTweets((prev) => prev.map((t, i) => {
            if (i !== activeTweetIndex) return t;
            return { ...t, text: `${t.text}${emoji}` };
        }));
    };

    const handleSavePoll = () => {
        const validOptions = pollOptions.filter(o => o.trim() !== '').map((text, i) => ({ id: i.toString(), text }));
        if (pollQuestion && validOptions.length >= 2) {
            setTweets(tweets.map((t, i) =>
                i === activeTweetIndex ? { ...t, poll: { question: pollQuestion, options: validOptions } } : t
            ));
            setPollQuestion('');
            setPollOptions(['', '']);
            setActiveSheet(null);
        }
    };

    // AI Actions
    const handleUseEnhancedText = async () => {
        setTextLoading(true);
        const response = await fetch("http://localhost:8000/api/v1/ai/enhance-text", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: tweets[activeTweetIndex].text })
        });

        const data = await response.json();
        setEnhancedText(data.enhanced);
        setSuggestedHashtags([]);
        setSelectedHashtags([]);
        setTextLoading(false);
    };

    const handleGenerateImage = async () => {
        setImgLoading(true);
        const response = await fetch("http://localhost:8000/api/v1/ai/generate-image", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt: imagePrompt })
        });

        const data = await response.json();
        setGeneratedImage(data.image_url);
        setImgLoading(false);
    };

    const handleHashtagSuggestions = async (text: string) => {
        if (!text.trim()) {
            setSuggestedHashtags([]);
            setSelectedHashtags([]);
            return;
        }

        setHashtagsLoading(true);
        const response = await fetch("http://localhost:8000/api/v1/ai/suggest-hashtags", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text })
        });

        const data = await response.json();
        const hashtags = Array.isArray(data.hashtags) ? data.hashtags.slice(0, 7) : [];
        setSuggestedHashtags(hashtags);
        setSelectedHashtags([]);
        setHashtagsLoading(false);
    };

    const toggleHashtagSelection = (tag: string) => {
        setSelectedHashtags((prev) =>
            prev.includes(tag)
                ? prev.filter((item) => item !== tag)
                : [...prev, tag]
        );
    };

    const appendSelectedHashtags = (baseText: string) => {
        if (selectedHashtags.length === 0) return baseText;

        const separator = baseText.length > 0 && !baseText.endsWith(' ') ? ' ' : '';
        return `${baseText}${separator}${selectedHashtags.join(' ')}`;
    };

    const onAiToolsOpen = () => {
        if (!enhancedText) {
            setEnhancedText(tweets[activeTweetIndex].text);
        }
    }

    const onAiToolsClose = () => {
        setTweets(prev => prev.map((t, i) => {
            if (i !== activeTweetIndex) return t;

            const updatedText = enhancedText ? appendSelectedHashtags(enhancedText) : t.text;
            const updatedMedia = generatedImage
                ? [...t.media, { id: Date.now().toString(), type: 'image' as const, url: generatedImage }]
                : t.media;

            return { ...t, text: updatedText, media: updatedMedia };
        }));

        setEnhancedText('');
        setImagePrompt('');
        setGeneratedImage('');
        setSuggestedHashtags([]);
        setSelectedHashtags([]);
        setActiveSheet(null);
    }


    const canProceed = tweets.every(t => (t.text.length > 0 && t.text.length <= MAX_CHARS) || t.media.length > 0 || !!t.poll);

    const getSheetAnchor = () => {
        if (activeSheet === 'media') return mediaActionRef;
        if (activeSheet === 'emoji') return emojiActionRef;
        if (activeSheet === 'poll') return pollActionRef;
        if (activeSheet === 'ai') return aiActionRef;
        if (activeSheet === 'audience') return audienceActionRef;
        return undefined;
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-[2px] flex items-center justify-center p-2 sm:p-4"
        >
            <div
                ref={containerRef}
                className="w-full max-w-xl bg-[#101214] border border-white/10 rounded-3xl shadow-[0_24px_80px_rgba(0,0,0,0.6)] overflow-hidden flex flex-col"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#101214]/95 backdrop-blur">
                    <button onClick={onBack} className="text-white/90 hover:text-white text-l font-medium px-1 py-1">
                        Cancel
                    </button>
                    <span className="font-semibold text-white text-lg">
                        {tweets.length > 1 ? 'New thread' : 'New thread'}
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
                                                        {currentUser.handle}
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
                                                        <div key={m.id} className="w-24 h-24 rounded-xl bg-black/30 relative shrink-0">
                                                            <img aria-label="Close" src={m.url} className="w-full h-full object-cover rounded-xl" />
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

                    <div className="h-6" />

                    <div className="sticky bottom-0 flex items-center justify-between pl-4 pr-4 pt-3 pb-0 border-t border-white/10 bg-[#101214]/95 backdrop-blur">
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
            </div>

            {/* --- Sheets --- */}

            {/* Media Sheet */}
            <BottomSheet
                isOpen={activeSheet === 'media'}
                onClose={() => setActiveSheet(null)}
                title="Add Media"
                floating
                anchorRef={getSheetAnchor()}
            >
                <div className="space-y-4">
                    <input
                        ref={mediaInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        aria-label="Upload images from device"
                        title="Upload images from device"
                        onChange={handleMediaInputChange}
                    />

                    <div
                        onDragOver={handleMediaDragOver}
                        onDragLeave={handleMediaDragLeave}
                        onDrop={handleMediaDrop}
                        className={`rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${isMediaDragActive
                            ? 'border-app-peach bg-app-peach/10'
                            : 'border-white/20 bg-black/20'
                            }`}
                    >
                        <p className="text-white font-semibold">Drag and drop images here</p>
                        <p className="text-white/60 text-sm mt-1">or choose files from your device</p>
                        <br/><br/>
                        <Button
                            variant="secondary"
                            size="sm"
                            className="mx-auto mt-4"
                            onClick={() => mediaInputRef.current?.click()}
                        >
                            Choose from device
                        </Button>
                    </div>

                    <p className="text-xs text-white/55 text-center">Supports multiple image uploads</p>
                </div>
            </BottomSheet>

            {/* Emoji Sheet */}
            <BottomSheet
                isOpen={activeSheet === 'emoji'}
                onClose={() => setActiveSheet(null)}
                title="Emojis"
                floating
                anchorRef={getSheetAnchor()}
                panelClassName="bg-[#17191d]"
            >
                <EmojiPicker onSelect={handleAddEmoji} />
            </BottomSheet>

            {/* Poll Sheet */}
            <BottomSheet
                isOpen={activeSheet === 'poll'}
                onClose={() => setActiveSheet(null)}
                title="Create Poll"
                floating
                anchorRef={getSheetAnchor()}
            >
                <div className="space-y-4">
                    <input
                        value={pollQuestion}
                        onChange={(e) => setPollQuestion(e.target.value)}
                        placeholder="Ask a question..."
                        className="w-full bg-black/25 p-3 rounded-xl border border-white/15 focus:border-app-peach outline-none text-white text-lg"
                    />
                    <div className="space-y-3">
                        {pollOptions.map((opt, i) => (
                            <input
                                key={i}
                                value={opt}
                                onChange={(e) => {
                                    const newOpts = [...pollOptions];
                                    newOpts[i] = e.target.value;
                                    setPollOptions(newOpts);
                                }}
                                placeholder={`Option ${i + 1}`}
                                className="w-full bg-black/25 p-3 rounded-xl border border-white/15 focus:border-app-peach outline-none text-white"
                            />
                        ))}
                    </div>
                    <button
                        onClick={() => setPollOptions([...pollOptions, ''])}
                        className="text-app-peach font-medium flex items-center gap-1"
                    >
                        <Plus size={18} /> Add option
                    </button>
                    <Button onClick={handleSavePoll} className="w-full mt-4">Add Poll</Button>
                </div>
            </BottomSheet>

            {/* Audience Sheet */}
            <BottomSheet
                isOpen={activeSheet === 'audience'}
                onClose={() => setActiveSheet(null)}
                title="Audience"
                floating
                anchorRef={getSheetAnchor()}
            >
                <div className="space-y-1 mb-6">
                    <h4 className="text-xs font-bold text-white/60 uppercase tracking-wider mb-2">Who can reply?</h4>
                    {[AudienceType.EVERYONE, AudienceType.FOLLOW, AudienceType.MENTIONED].map((type) => (
                        <button
                            key={type}
                            onClick={() => setAudience(type)}
                            className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${audience === type
                                ? 'bg-app-peach/10 border-app-peach'
                                : 'bg-black/20 border-white/15 hover:bg-white/5'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-full ${audience === type ? 'bg-app-peach text-[#0e1116]' : 'bg-white/10 text-white/60'}`}>
                                    {type === AudienceType.EVERYONE ? <Globe size={20} /> : type === AudienceType.FOLLOW ? <Users size={20} /> : <Lock size={20} />}
                                </div>
                                <span className={`font-medium text-lg ${audience === type ? 'text-app-peach' : 'text-white'}`}>{type}</span>
                            </div>
                            {audience === type && <CheckCircle size={20} className="text-app-peach fill-app-peach/20" />}
                        </button>
                    ))}
                </div>

                <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-black/20 rounded-xl border border-white/15">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-app-lime/10 text-app-lime rounded-full">
                                <CheckCircle size={20} />
                            </div>
                            <div>
                                <p className="font-medium text-white">Share to Circle</p>
                                <p className="text-sm text-white/60">Only visible to your Circle members</p>
                            </div>
                        </div>
                        <Toggle checked={shareToCircle} onChange={setShareToCircle} />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-black/20 rounded-xl border border-white/15">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-500/10 text-amber-500 rounded-full">
                                <AlertTriangle size={20} />
                            </div>
                            <div>
                                <p className="font-medium text-white">Sensitive content</p>
                                <p className="text-sm text-white/60">Mark this tweet as containing sensitive material</p>
                            </div>
                        </div>
                        <Toggle checked={isSensitive} onChange={setIsSensitive} />
                    </div>
                </div>
            </BottomSheet>

            {/* AI Tools Sheet */}
            <BottomSheet
                isOpen={activeSheet === 'ai'}
                onOpen={onAiToolsOpen}
                onClose={onAiToolsClose}
                onCancel={() => setActiveSheet(null)}
                title="AI Tools"
                floating
                anchorRef={getSheetAnchor()}
            >
                <div className="space-y-6">
                    {/* Enhance Text */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-app-text font-bold">
                            <Wand2 size={18} className="text-app-peach" />
                            <h4>Enhance Text</h4>
                        </div>
                        <div className="p-3 bg-app-card border border-app-border rounded-xl">
                            <p className="text-app-text text-sm italic opacity-90">{`${enhancedText}`}</p>
                        </div>
                        <Button variant="secondary" size="sm" onClick={handleUseEnhancedText} disabled={!tweets[activeTweetIndex].text.trim() || textLoading || imgLoading} className="w-full">
                            {!textLoading ? "Use enhanced text" : "Enhancing..."}
                        </Button>
                    </div>

                    <div className="h-[1px] bg-app-border" />

                    {/* Generate Image */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-app-text font-bold">
                            <Image size={18} className="text-app-peach" />
                            <h4>Generate Image</h4>
                        </div>
                        <Input
                            value={imagePrompt}
                            onChange={setImagePrompt}
                            placeholder="Describe the image you want..."
                            className="text-sm h-10"
                        />
                        {generatedImage && (
                            <div className="mt-3 w-full flex justify-center">
                                <img
                                    src={generatedImage}
                                    alt="Generated"
                                    className="max-w-full max-h-64 rounded-md object-cover border border-app-border"
                                />
                            </div>
                        )}
                        <Button variant="secondary" size="sm" onClick={handleGenerateImage} disabled={!imagePrompt.trim() || textLoading || imgLoading} className="w-full">
                            {!imgLoading ? "Generate Image" : "Generating..."}
                        </Button>
                    </div>

                    <div className="h-[1px] bg-app-border" />

                    {/* Hashtag Suggestions */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-app-text font-bold">
                            <Hash size={18} className="text-app-peach" />
                            <h4>Hashtag Suggestions</h4>
                        </div>
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleHashtagSuggestions(enhancedText)}
                            disabled={!enhancedText.trim() || hashtagsLoading || textLoading || imgLoading}
                            className="w-full disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {hashtagsLoading ? 'Generating hashtags...' : 'Generate Hashtags'}
                        </Button>

                        {suggestedHashtags.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {suggestedHashtags.map((tag) => {
                                    const selected = selectedHashtags.includes(tag);
                                    return (
                                        <button
                                            key={tag}
                                            type="button"
                                            onClick={() => toggleHashtagSelection(tag)}
                                            className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${selected
                                                ? 'bg-app-peach/20 border-app-peach text-app-peach'
                                                : 'bg-black/20 border-white/20 text-white/80 hover:border-app-peach/60'
                                                }`}
                                        >
                                            {tag}
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {selectedHashtags.length > 0 && (
                            <p className="text-xs text-white/70">
                                {selectedHashtags.length} hashtag{selectedHashtags.length === 1 ? '' : 's'} selected. They will be added when you tap Done.
                            </p>
                        )}
                    </div>
                </div>
            </BottomSheet>
        </motion.div>
    );
};