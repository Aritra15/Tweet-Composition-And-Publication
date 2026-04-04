import React, { useRef, useState } from 'react';
import { Image, Globe, Plus, CheckCircle, Lock, AlertTriangle, Users, Wand2, Hash, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { type Thread, type TweetDraft, type TweetMedia, type User, AudienceType } from '../types';
import { Button, BottomSheet, Toggle, Input, Toast } from '../components/Shared';
import { EmojiPicker } from '../components/EmojiPicker';
import CompositionArea from '../components/CompositionArea';

interface ComposeProps {
    onBack: () => void;
    onNext: (thread: Thread) => void;
    currentUser: User;
    initialThread?: Thread | null;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';
const MAX_MEDIA_PER_TWEET = 4;
const MAX_VIDEO_PER_TWEET = 1;

export const ComposeScreen: React.FC<ComposeProps> = ({ onBack, onNext, currentUser, initialThread }) => {
    const [tweets, setTweets] = useState<TweetDraft[]>(
        initialThread?.tweets?.length
            ? initialThread.tweets
            : [{ id: '1', text: '', media: [] }]
    );
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
    const [pollError, setPollError] = useState<string | null>(null);

    // AI State
    const [imagePrompt, setImagePrompt] = useState('');
    const [textLoading, setTextLoading] = useState(false);
    const [imgLoading, setImgLoading] = useState(false);
    const [hashtagsLoading, setHashtagsLoading] = useState(false);
    const [enhancedText, setEnhancedText] = useState('');
    const [generatedImages, setGeneratedImages] = useState<string[]>([]);
    const [suggestedHashtags, setSuggestedHashtags] = useState<string[]>([]);
    const [selectedHashtags, setSelectedHashtags] = useState<string[]>([]);

    // Focus management
    const mediaInputRef = useRef<HTMLInputElement | null>(null);
    const mediaActionRef = useRef<HTMLDivElement>(null);
    const emojiActionRef = useRef<HTMLDivElement>(null);
    const pollActionRef = useRef<HTMLDivElement>(null);
    const aiActionRef = useRef<HTMLDivElement>(null);
    const audienceActionRef = useRef<HTMLButtonElement>(null);

    const setMediaActionRef = (element: HTMLDivElement | null) => {
        mediaActionRef.current = element;
    };

    const setEmojiActionRef = (element: HTMLDivElement | null) => {
        emojiActionRef.current = element;
    };

    const setPollActionRef = (element: HTMLDivElement | null) => {
        pollActionRef.current = element;
    };

    const setAiActionRef = (element: HTMLDivElement | null) => {
        aiActionRef.current = element;
    };

    const setAudienceActionRef = (element: HTMLButtonElement | null) => {
        audienceActionRef.current = element;
    };
    const [isMediaDragActive, setIsMediaDragActive] = useState(false);
    const [mediaToastMessage, setMediaToastMessage] = useState<string | null>(null);

    const showMediaToast = (message: string) => {
        setMediaToastMessage(message);
        window.setTimeout(() => setMediaToastMessage(null), 2500);
    };

    const fileToDataUrl = (file: File): Promise<string> =>
        new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
            reader.readAsDataURL(file);
        });

    const handleAddMediaFiles = async (files: FileList | File[]) => {
        const activeTweet = tweets[activeTweetIndex];
        if (!activeTweet) return;

        const supportedFiles = Array.from(files).filter((file) =>
            file.type.startsWith('image/') || file.type.startsWith('video/')
        );
        if (supportedFiles.length === 0) {
            showMediaToast('Only image and video files are supported.');
            return;
        }

        const availableSlots = MAX_MEDIA_PER_TWEET - activeTweet.media.length;
        if (availableSlots <= 0) {
            showMediaToast(`You can upload up to ${MAX_MEDIA_PER_TWEET} media files.`);
            setActiveSheet(null);
            return;
        }

        const existingVideoCount = activeTweet.media.filter((media) => media.type === 'video').length;
        const acceptedFiles: File[] = [];
        let videoCount = existingVideoCount;
        let skippedMedia = 0;
        let skippedVideos = 0;

        for (const file of supportedFiles) {
            if (acceptedFiles.length >= availableSlots) {
                skippedMedia += 1;
                continue;
            }

            const isVideo = file.type.startsWith('video/');
            if (isVideo && videoCount >= MAX_VIDEO_PER_TWEET) {
                skippedVideos += 1;
                continue;
            }

            acceptedFiles.push(file);
            if (isVideo) {
                videoCount += 1;
            }
        }

        if (acceptedFiles.length === 0) {
            showMediaToast('Only one video is allowed per tweet.');
            setActiveSheet(null);
            return;
        }

        const mediaDataUrls = await Promise.all(acceptedFiles.map((file) => fileToDataUrl(file)));

        setTweets((prev) => prev.map((t, i) => {
            if (i !== activeTweetIndex) return t;

            const newMedia: TweetMedia[] = acceptedFiles.map((file, idx) => {
                const mediaType: 'image' | 'video' =
                    file.type.startsWith('video/')
                        ? 'video'
                        : 'image';
                return {
                    id: `${Date.now()}-${idx}`,
                    type: mediaType,
                    url: mediaDataUrls[idx],
                    source: 'upload',
                };
            });

            return { ...t, media: [...t.media, ...newMedia] };
        }));

        setActiveSheet(null);

        if (skippedMedia > 0 || skippedVideos > 0) {
            const parts: string[] = [];
            if (skippedMedia > 0) parts.push(`max ${MAX_MEDIA_PER_TWEET} media allowed`);
            if (skippedVideos > 0) parts.push('only one video allowed');
            showMediaToast(`Some files were skipped: ${parts.join(', ')}.`);
        }
    };

    const handleMediaInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            void handleAddMediaFiles(e.target.files);
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
            void handleAddMediaFiles(e.dataTransfer.files);
        }
    };

    const handleAddEmoji = (emoji: string) => {
        setTweets((prev) => prev.map((t, i) => {
            if (i !== activeTweetIndex) return t;
            return { ...t, text: `${t.text}${emoji}` };
        }));
    };

    const handleSavePoll = () => {
        const trimmedQuestion = pollQuestion.trim();
        const hasEmptyOption = pollOptions.some((option) => option.trim() === '');

        if (!trimmedQuestion) {
            setPollError('Poll question is required.');
            return;
        }

        if (hasEmptyOption) {
            setPollError('All poll options are required.');
            return;
        }

        const normalizedOptions = pollOptions.map((text, i) => ({ id: i.toString(), text: text.trim() }));

        setTweets(tweets.map((t, i) =>
            i === activeTweetIndex ? { ...t, poll: { question: trimmedQuestion, options: normalizedOptions } } : t
        ));
        setPollQuestion('');
        setPollOptions(['', '']);
        setPollError(null);
        setActiveSheet(null);
    };

    const resetPollSheetState = () => {
        setPollQuestion('');
        setPollOptions(['', '']);
        setPollError(null);
    };

    const handleAddPollOption = () => {
        if (pollOptions.length >= 4) {
            return;
        }

        setPollOptions((prev) => [...prev, '']);
        if (pollError) {
            setPollError('All poll options are required.');
        }
    };

    const handleRemovePollOption = (indexToRemove: number) => {
        if (pollOptions.length <= 2) {
            return;
        }

        setPollOptions((prev) => {
            const next = prev.filter((_, index) => index !== indexToRemove);
            if (pollError) {
                const stillHasEmpty = next.some((option) => option.trim() === '');
                setPollError(stillHasEmpty ? 'All poll options are required.' : null);
            }
            return next;
        });
    };

    // AI Actions
    const handleUseEnhancedText = async () => {
        setTextLoading(true);
        const response = await fetch(`${API_BASE_URL}/api/v1/ai/enhance-text`, {
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
        const activeTweet = tweets[activeTweetIndex];
        const availableSlots = activeTweet ? Math.max(0, MAX_MEDIA_PER_TWEET - activeTweet.media.length) : 0;
        if (availableSlots == 0) {
            showMediaToast(`Only ${MAX_MEDIA_PER_TWEET} media files are allowed per tweet.`);
            return;
        }

        setImgLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/v1/ai/generate-image`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt: imagePrompt })
            });

            if (!response.ok) {
                showMediaToast('Failed to generate image. Please try again.');
                setImgLoading(false);
                return;
            }

            const data = await response.json();
            setGeneratedImages(prev => [...prev, data.image_url]);
            setImagePrompt('');
        } catch (error) {
            showMediaToast('Error generating image. Please try again.');
            console.error('Image generation error:', error);
        } finally {
            setImgLoading(false);
        }
    };

    const handleHashtagSuggestions = async (text: string) => {
        if (!text.trim()) {
            setSuggestedHashtags([]);
            setSelectedHashtags([]);
            return;
        }

        setHashtagsLoading(true);
        const response = await fetch(`${API_BASE_URL}/api/v1/ai/suggest-hashtags`, {
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

    const resetAiToolsState = () => {
        setEnhancedText('');
        setImagePrompt('');
        setGeneratedImages([]);
        setSuggestedHashtags([]);
        setSelectedHashtags([]);
    };

    const handleApplyAiEnhancements = () => {
        setTweets(prev => prev.map((t, i) => {
            if (i !== activeTweetIndex) return t;

            const updatedText = enhancedText ? appendSelectedHashtags(enhancedText) : t.text;
            const updatedMedia = generatedImages.length > 0
                ? [...t.media, ...generatedImages.map((url, idx): TweetMedia => ({
                    id: `ai-generated-${Date.now()}-${idx}`,
                    type: 'image',
                    url,
                    source: 'ai',
                }))]
                : t.media;

            return { ...t, text: updatedText, media: updatedMedia };
        }));

        resetAiToolsState();
        setActiveSheet(null);
    };

    const handleDismissSheet = () => {
        if (activeSheet === 'poll') {
            resetPollSheetState();
        }

        if (activeSheet === 'ai') {
            resetAiToolsState();
        }

        if (activeSheet === 'media') {
            setIsMediaDragActive(false);
        }

        setActiveSheet(null);
    };

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
            <CompositionArea
                onBack={onBack}
                onNext={onNext}
                currentUser={currentUser}
                tweets={tweets}
                setTweets={setTweets}
                activeTweetIndex={activeTweetIndex}
                setActiveTweetIndex={setActiveTweetIndex}
                setActiveSheet={setActiveSheet}
                audience={audience}
                mediaActionRef={setMediaActionRef}
                emojiActionRef={setEmojiActionRef}
                pollActionRef={setPollActionRef}
                aiActionRef={setAiActionRef}
                audienceActionRef={setAudienceActionRef}
            />

            {/* --- Sheets --- */}

            {/* Media Sheet */}
            <BottomSheet
                isOpen={activeSheet === 'media'}
                onClose={handleDismissSheet}
                onCancel={handleDismissSheet}
                title="Add Media"
                floating
                anchorRef={getSheetAnchor()}
            >
                <div className="space-y-4">
                    <input
                        ref={mediaInputRef}
                        type="file"
                        accept="image/*,video/*"
                        multiple
                        className="hidden"
                        aria-label="Upload media from device"
                        title="Upload media from device"
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
                        <p className="text-white font-semibold">Drag and drop media here</p>
                        <p className="text-white/60 text-sm mt-1">or choose image/video files from your device</p>
                        <br /><br />
                        <Button
                            variant="secondary"
                            size="sm"
                            className="mx-auto mt-4"
                            onClick={() => mediaInputRef.current?.click()}
                        >
                            Choose from device
                        </Button>
                    </div>

                    <p className="text-xs text-white/55 text-center">Up to 4 media per tweet, with at most 1 video</p>
                </div>
            </BottomSheet>

            {/* Emoji Sheet */}
            <BottomSheet
                isOpen={activeSheet === 'emoji'}
                onClose={handleDismissSheet}
                onCancel={handleDismissSheet}
                title="Emojis"
                floating
                anchorRef={getSheetAnchor()}
                horizontalOffset={-252}
                verticalOffset={104}
                panelClassName="bg-[#17191d]"
            >
                <EmojiPicker onSelect={handleAddEmoji} />
            </BottomSheet>

            {/* Poll Sheet */}
            <BottomSheet
                isOpen={activeSheet === 'poll'}
                onClose={handleDismissSheet}
                onCancel={handleDismissSheet}
                title="Create Poll"
                floating
                anchorRef={getSheetAnchor()}
            >
                <div className="space-y-4">
                    <input
                        value={pollQuestion}
                        onChange={(e) => {
                            setPollQuestion(e.target.value);
                            if (pollError) {
                                setPollError(null);
                            }
                        }}
                        placeholder="Ask a question..."
                        className="w-full bg-black/25 p-3 rounded-xl border border-white/15 focus:border-app-peach outline-none text-white text-lg"
                    />
                    <div className="space-y-3">
                        {pollOptions.map((opt, i) => (
                            <div key={i} className="relative">
                                <input
                                    value={opt}
                                    onChange={(e) => {
                                        const newOpts = [...pollOptions];
                                        newOpts[i] = e.target.value;
                                        setPollOptions(newOpts);

                                        if (pollError) {
                                            const hasAnyEmpty = newOpts.some((option) => option.trim() === '');
                                            setPollError(hasAnyEmpty ? 'All poll options are required.' : null);
                                        }
                                    }}
                                    placeholder={`Option ${i + 1}`}
                                    className={`w-full bg-black/25 p-3 rounded-xl border focus:border-app-peach outline-none text-white ${pollError ? 'border-red-400/80' : 'border-white/15'} ${pollOptions.length > 2 ? 'pr-10' : ''}`}
                                />
                                {pollOptions.length > 2 && (
                                    <button
                                        type="button"
                                        aria-label={`Remove option ${i + 1}`}
                                        onClick={() => handleRemovePollOption(i)}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full text-white/70 hover:text-white hover:bg-white/10"
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                    {pollError && (
                        <p className="text-sm text-red-300">{pollError}</p>
                    )}
                    {pollOptions.length < 4 && (
                        <button
                            onClick={handleAddPollOption}
                            className="text-app-peach font-medium flex items-center gap-1"
                        >
                            <Plus size={18} /> Add option
                        </button>
                    )}
                    <Button onClick={handleSavePoll} className="w-full mt-4">Add Poll</Button>
                </div>
            </BottomSheet>

            {/* Audience Sheet */}
            <BottomSheet
                isOpen={activeSheet === 'audience'}
                onClose={handleDismissSheet}
                onCancel={handleDismissSheet}
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
                onClose={handleDismissSheet}
                onCancel={handleDismissSheet}
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
                        {generatedImages.length > 0 && (
                            <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
                                {generatedImages.map((url, id) => (
                                    <div key={id} className="w-24 h-24 rounded-xl bg-black/30 relative shrink-0">
                                        <img aria-label="Close" src={url} className="w-full h-full object-cover rounded-xl" />
                                        <button
                                            aria-label="Close"
                                            className="absolute top-1 right-1 bg-black/50 p-1 rounded-full text-white"
                                            onClick={() => {
                                                const newMedia = generatedImages.filter((_, idx) => idx !== id);
                                                setGeneratedImages(newMedia);
                                            }}
                                        >
                                            <X size={12} />
                                        </button>
                                    </div>
                                ))}
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
                            className="w-full"
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
                                {selectedHashtags.length} hashtag{selectedHashtags.length === 1 ? '' : 's'} selected. They will be added when you apply enhancements.
                            </p>
                        )}
                    </div>

                    <Button
                        onClick={handleApplyAiEnhancements}
                        disabled={textLoading || imgLoading || hashtagsLoading}
                        className="w-full mt-2"
                    >
                        Apply enhancements
                    </Button>
                </div>
            </BottomSheet>

            {mediaToastMessage && <Toast message={mediaToastMessage} type="error" className="z-[90]" />}
        </motion.div>
    );
};