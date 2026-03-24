import React, { useState, useRef} from 'react';
import { Image, Globe, Plus, CheckCircle, Lock, AlertTriangle, Users, Wand2, Hash } from 'lucide-react';
import { motion } from 'framer-motion';
import { type Thread, type TweetDraft, type TweetMedia, type User, AudienceType } from '../types';
import { Button, BottomSheet, Toggle, Input } from '../components/Shared';
import { EmojiPicker } from '../components/EmojiPicker';
import CompositionArea from '../components/CompositionArea';

interface ComposeProps {
    onBack: () => void;
    onNext: (thread: Thread) => void;
    currentUser: User;
}



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
    const mediaInputRef = useRef<HTMLInputElement | null>(null);
    const mediaActionRef = useRef<HTMLDivElement | null>(null);
    const emojiActionRef = useRef<HTMLDivElement | null>(null);
    const pollActionRef = useRef<HTMLDivElement | null>(null);
    const aiActionRef = useRef<HTMLDivElement | null>(null);
    const audienceActionRef = useRef<HTMLButtonElement | null>(null);
    const [isMediaDragActive, setIsMediaDragActive] = useState(false);

    // empty array = runs once on mount

    

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
                mediaActionRef={mediaActionRef}
                emojiActionRef={emojiActionRef}
                pollActionRef={pollActionRef}
                aiActionRef={aiActionRef}
                audienceActionRef={audienceActionRef}
            />

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