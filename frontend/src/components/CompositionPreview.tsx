import { Reorder } from "framer-motion";
import { Image, BarChart2, Feather, Globe, GripVertical, Plus, Smile, Sparkles, Trash2, X, Play, Pencil, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Avatar, Button } from "./Shared";
import type { TweetDraft, User } from "../types";

const MAX_CHARS = 280;
const MIN_CROP_SIZE = 20;
const MIN_DOODLE_WIDTH_PCT = 0.25;

type FilterPreset = "none" | "warm" | "mono" | "sepia" | "noir" | "retro" | "bright";
type EditorTool = "none" | "filter" | "doodle" | "text";
type DoodlePoint = { xPct: number; yPct: number };
type DoodleStroke = { color: string; widthPct: number; points: DoodlePoint[] };
type TextOverlay = {
    id: string;
    text: string;
    xPct: number;
    yPct: number;
    color: string;
    sizePx: number;
};

const FILTER_PRESETS: Array<{ id: FilterPreset; label: string }> = [
    { id: "none", label: "Original" },
    { id: "warm", label: "Warm" },
    { id: "mono", label: "Mono" },
    { id: "sepia", label: "Sepia" },
    { id: "noir", label: "Noir" },
    { id: "retro", label: "Retro" },
    { id: "bright", label: "Bright" },
];

const DOODLE_COLORS = ["#ffffff", "#f59e0b", "#ef4444", "#22c55e", "#3b82f6", "#a855f7", "#111827"];
const TEXT_COLORS = ["#ffffff", "#000000", "#f59e0b", "#ef4444", "#22c55e", "#3b82f6", "#a855f7"];
const EDITOR_TOOLS: Array<{ id: EditorTool; label: string }> = [
    { id: "doodle", label: "Doodle" },
    { id: "text", label: "Text" },
    { id: "filter", label: "Filter" },
];

const getCanvasFilter = (preset: FilterPreset): string => {
    if (preset === "warm") return "saturate(1.15) contrast(1.05) sepia(0.12)";
    if (preset === "mono") return "grayscale(1) contrast(1.1)";
    if (preset === "sepia") return "sepia(0.7) contrast(1.05)";
    if (preset === "noir") return "grayscale(1) contrast(1.28) brightness(0.9)";
    if (preset === "retro") return "sepia(0.28) saturate(0.95) hue-rotate(-8deg) contrast(0.94)";
    if (preset === "bright") return "brightness(1.12) saturate(1.08)";
    return "none";
};

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
    const editorPreviewRef = useRef<HTMLDivElement | null>(null);
    const cropInteractionRef = useRef<{
        mode: "drag" | "resize";
        startClientX: number;
        startClientY: number;
        imageWidth: number;
        imageHeight: number;
        startCropWidth: number;
        startCropHeight: number;
        startCropX: number;
        startCropY: number;
    } | null>(null);
    const activeDoodleStrokeRef = useRef<DoodleStroke | null>(null);
    const textDragRef = useRef<{
        textId: string;
        startClientX: number;
        startClientY: number;
        imageWidth: number;
        imageHeight: number;
        startXPct: number;
        startYPct: number;
    } | null>(null);
    const [editingMedia, setEditingMedia] = useState<{ tweetId: string; mediaId: string; url: string } | null>(null);
    const [cropWidth, setCropWidth] = useState(100);
    const [cropHeight, setCropHeight] = useState(100);
    const [cropX, setCropX] = useState(0);
    const [cropY, setCropY] = useState(0);
    const [filterPreset, setFilterPreset] = useState<FilterPreset>("none");
    const [editorError, setEditorError] = useState<string | null>(null);
    const [isApplyingEdit, setIsApplyingEdit] = useState(false);
    const [cropInteractionMode, setCropInteractionMode] = useState<"idle" | "drag" | "resize">("idle");
    const [editorImageNaturalSize, setEditorImageNaturalSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
    const [isDoodleMode, setIsDoodleMode] = useState(false);
    const [doodleColor, setDoodleColor] = useState(DOODLE_COLORS[0]);
    const [doodleSizePx, setDoodleSizePx] = useState(6);
    const [doodleStrokes, setDoodleStrokes] = useState<DoodleStroke[]>([]);
    const [isDoodling, setIsDoodling] = useState(false);
    const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([]);
    const [activeTextId, setActiveTextId] = useState<string | null>(null);
    const [textInputValue, setTextInputValue] = useState("");
    const [textColor, setTextColor] = useState(TEXT_COLORS[0]);
    const [textSizePx, setTextSizePx] = useState(24);
    const [isDraggingText, setIsDraggingText] = useState(false);
    const [activeEditorTool, setActiveEditorTool] = useState<EditorTool>("none");

    const activeCanvasFilter = useMemo(() => getCanvasFilter(filterPreset), [filterPreset]);

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

    const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
    const isFinitePositive = (value: number) => Number.isFinite(value) && value > 0;

    const getDisplayedImageRect = () => {
        const previewEl = editorPreviewRef.current;
        if (!previewEl) {
            return { offsetX: 0, offsetY: 0, width: 1, height: 1 };
        }

        const previewWidth = previewEl.clientWidth;
        const previewHeight = previewEl.clientHeight;
        if (previewWidth <= 0 || previewHeight <= 0) {
            return { offsetX: 0, offsetY: 0, width: 1, height: 1 };
        }

        const naturalWidth = editorImageNaturalSize.width;
        const naturalHeight = editorImageNaturalSize.height;

        if (naturalWidth <= 0 || naturalHeight <= 0) {
            return { offsetX: 0, offsetY: 0, width: previewWidth, height: previewHeight };
        }

        const imageRatio = naturalWidth / naturalHeight;
        const previewRatio = previewWidth / previewHeight;

        if (imageRatio > previewRatio) {
            const width = previewWidth;
            const height = width / imageRatio;
            return {
                offsetX: 0,
                offsetY: (previewHeight - height) / 2,
                width,
                height,
            };
        }

        const height = previewHeight;
        const width = height * imageRatio;
        return {
            offsetX: (previewWidth - width) / 2,
            offsetY: 0,
            width,
            height,
        };
    };

    const getCropFrameStyle = () => {
        const imageRect = getDisplayedImageRect();
        const safeImageWidth = isFinitePositive(imageRect.width) ? imageRect.width : 1;
        const safeImageHeight = isFinitePositive(imageRect.height) ? imageRect.height : 1;
        const safeCropWidth = Number.isFinite(cropWidth) ? cropWidth : 100;
        const safeCropHeight = Number.isFinite(cropHeight) ? cropHeight : 100;
        const safeCropX = Number.isFinite(cropX) ? cropX : 0;
        const safeCropY = Number.isFinite(cropY) ? cropY : 0;

        const width = Math.max(1, (safeCropWidth / 100) * safeImageWidth);
        const height = Math.max(1, (safeCropHeight / 100) * safeImageHeight);
        const left = imageRect.offsetX + ((safeCropX / 100) * Math.max(0, safeImageWidth - width));
        const top = imageRect.offsetY + ((safeCropY / 100) * Math.max(0, safeImageHeight - height));

        return { left, top, width, height };
    };

    const getPointOnImage = (clientX: number, clientY: number): DoodlePoint | null => {
        const previewEl = editorPreviewRef.current;
        if (!previewEl) return null;

        const previewRect = previewEl.getBoundingClientRect();
        const imageRect = getDisplayedImageRect();
        if (!isFinitePositive(imageRect.width) || !isFinitePositive(imageRect.height)) return null;

        const localX = clientX - previewRect.left - imageRect.offsetX;
        const localY = clientY - previewRect.top - imageRect.offsetY;

        return {
            xPct: clamp((localX / imageRect.width) * 100, 0, 100),
            yPct: clamp((localY / imageRect.height) * 100, 0, 100),
        };
    };

    const startDoodle = (event: React.MouseEvent<SVGSVGElement>) => {
        if (!isDoodleMode) return;
        event.preventDefault();

        const point = getPointOnImage(event.clientX, event.clientY);
        if (!point) return;

        const imageRect = getDisplayedImageRect();
        if (!isFinitePositive(imageRect.width)) return;
        const widthPct = Math.max(MIN_DOODLE_WIDTH_PCT, (doodleSizePx / Math.max(1, imageRect.width)) * 100);

        const newStroke: DoodleStroke = {
            color: doodleColor,
            widthPct,
            points: [point],
        };

        activeDoodleStrokeRef.current = newStroke;
        setDoodleStrokes((prev) => [...prev, newStroke]);
        setIsDoodling(true);
    };

    const continueDoodle = (event: React.MouseEvent<SVGSVGElement>) => {
        if (!isDoodling || !activeDoodleStrokeRef.current) return;
        event.preventDefault();

        const point = getPointOnImage(event.clientX, event.clientY);
        if (!point) return;

        activeDoodleStrokeRef.current = {
            ...activeDoodleStrokeRef.current,
            points: [...activeDoodleStrokeRef.current.points, point],
        };

        setDoodleStrokes((prev) => {
            if (prev.length === 0) return prev;
            const next = [...prev];
            next[next.length - 1] = activeDoodleStrokeRef.current as DoodleStroke;
            return next;
        });
    };

    const endDoodle = () => {
        setIsDoodling(false);
        activeDoodleStrokeRef.current = null;
    };

    const startTextDrag = (textId: string, event: React.MouseEvent<HTMLDivElement>) => {
        if (isDoodleMode) return;
        event.preventDefault();
        event.stopPropagation();

        const imageRect = getDisplayedImageRect();
        if (!isFinitePositive(imageRect.width) || !isFinitePositive(imageRect.height)) return;

        const targetText = textOverlays.find((item) => item.id === textId);
        if (!targetText) return;

        textDragRef.current = {
            textId,
            startClientX: event.clientX,
            startClientY: event.clientY,
            imageWidth: imageRect.width,
            imageHeight: imageRect.height,
            startXPct: targetText.xPct,
            startYPct: targetText.yPct,
        };
        setActiveTextId(textId);
        setIsDraggingText(true);
    };

    const startCropInteraction = (mode: "drag" | "resize", event: React.MouseEvent<HTMLDivElement>) => {
        if (isDoodleMode) return;
        if (!editorPreviewRef.current) return;
        event.preventDefault();

        const imageRect = getDisplayedImageRect();
        if (!isFinitePositive(imageRect.width) || !isFinitePositive(imageRect.height)) return;
        cropInteractionRef.current = {
            mode,
            startClientX: event.clientX,
            startClientY: event.clientY,
            imageWidth: imageRect.width,
            imageHeight: imageRect.height,
            startCropWidth: cropWidth,
            startCropHeight: cropHeight,
            startCropX: cropX,
            startCropY: cropY,
        };
        setCropInteractionMode(mode);
    };

    useEffect(() => {
        if (cropInteractionMode === "idle") return;

        const handleMouseMove = (event: MouseEvent) => {
            const interaction = cropInteractionRef.current;
            if (!interaction) return;
            if (!isFinitePositive(interaction.imageWidth) || !isFinitePositive(interaction.imageHeight)) return;

            const deltaXPct = (event.clientX - interaction.startClientX) / interaction.imageWidth * 100;
            const deltaYPct = (event.clientY - interaction.startClientY) / interaction.imageHeight * 100;
            if (!Number.isFinite(deltaXPct) || !Number.isFinite(deltaYPct)) return;

            const startLeftPct = (interaction.startCropX / 100) * (100 - interaction.startCropWidth);
            const startTopPct = (interaction.startCropY / 100) * (100 - interaction.startCropHeight);

            if (interaction.mode === "drag") {
                const nextLeftPct = clamp(startLeftPct + deltaXPct, 0, 100 - interaction.startCropWidth);
                const nextTopPct = clamp(startTopPct + deltaYPct, 0, 100 - interaction.startCropHeight);

                const nextCropX = interaction.startCropWidth >= 100
                    ? 0
                    : (nextLeftPct / (100 - interaction.startCropWidth)) * 100;
                const nextCropY = interaction.startCropHeight >= 100
                    ? 0
                    : (nextTopPct / (100 - interaction.startCropHeight)) * 100;

                if (!Number.isFinite(nextCropX) || !Number.isFinite(nextCropY)) return;
                setCropX(clamp(nextCropX, 0, 100));
                setCropY(clamp(nextCropY, 0, 100));
                return;
            }

            const nextCropWidth = clamp(interaction.startCropWidth + deltaXPct, MIN_CROP_SIZE, 100 - startLeftPct);
            const nextCropHeight = clamp(interaction.startCropHeight + deltaYPct, MIN_CROP_SIZE, 100 - startTopPct);

            const nextCropX = nextCropWidth >= 100
                ? 0
                : (startLeftPct / (100 - nextCropWidth)) * 100;
            const nextCropY = nextCropHeight >= 100
                ? 0
                : (startTopPct / (100 - nextCropHeight)) * 100;

            if (!Number.isFinite(nextCropWidth) || !Number.isFinite(nextCropHeight) || !Number.isFinite(nextCropX) || !Number.isFinite(nextCropY)) return;
            setCropWidth(nextCropWidth);
            setCropHeight(nextCropHeight);
            setCropX(clamp(nextCropX, 0, 100));
            setCropY(clamp(nextCropY, 0, 100));
        };

        const handleMouseUp = () => {
            setCropInteractionMode("idle");
            cropInteractionRef.current = null;
        };

        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);

        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
        };
    }, [cropInteractionMode, isDoodleMode]);

    useEffect(() => {
        if (!isDoodling) return;

        const handleMouseUp = () => endDoodle();
        window.addEventListener("mouseup", handleMouseUp);

        return () => {
            window.removeEventListener("mouseup", handleMouseUp);
        };
    }, [isDoodling]);

    useEffect(() => {
        const shouldEnableDoodle = activeEditorTool === "doodle";
        setIsDoodleMode(shouldEnableDoodle);

        if (!shouldEnableDoodle) {
            endDoodle();
        }
    }, [activeEditorTool]);

    useEffect(() => {
        if (!isDraggingText) return;

        const handleMouseMove = (event: MouseEvent) => {
            const dragState = textDragRef.current;
            if (!dragState) return;
            if (!isFinitePositive(dragState.imageWidth) || !isFinitePositive(dragState.imageHeight)) return;

            const deltaXPct = (event.clientX - dragState.startClientX) / dragState.imageWidth * 100;
            const deltaYPct = (event.clientY - dragState.startClientY) / dragState.imageHeight * 100;
            if (!Number.isFinite(deltaXPct) || !Number.isFinite(deltaYPct)) return;

            setTextOverlays((prev) => prev.map((item) => {
                if (item.id !== dragState.textId) return item;

                return {
                    ...item,
                    xPct: clamp(dragState.startXPct + deltaXPct, 0, 100),
                    yPct: clamp(dragState.startYPct + deltaYPct, 0, 100),
                };
            }));
        };

        const handleMouseUp = () => {
            setIsDraggingText(false);
            textDragRef.current = null;
        };

        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);

        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
        };
    }, [isDraggingText]);

    const openMediaEditor = (tweetId: string, mediaId: string, url: string) => {
        setEditingMedia({ tweetId, mediaId, url });
        setCropWidth(100);
        setCropHeight(100);
        setCropX(0);
        setCropY(0);
        setFilterPreset("none");
        setIsDoodleMode(false);
        setDoodleColor(DOODLE_COLORS[0]);
        setDoodleSizePx(6);
        setDoodleStrokes([]);
        setIsDoodling(false);
        setTextOverlays([]);
        setActiveTextId(null);
        setTextInputValue("");
        setTextColor(TEXT_COLORS[0]);
        setTextSizePx(24);
        setActiveEditorTool("none");
        setEditorError(null);
    };

    const closeMediaEditor = () => {
        setEditingMedia(null);
        setEditorError(null);
        setCropInteractionMode("idle");
        cropInteractionRef.current = null;
        setEditorImageNaturalSize({ width: 0, height: 0 });
        setIsDoodling(false);
        activeDoodleStrokeRef.current = null;
        setIsDraggingText(false);
        textDragRef.current = null;
    };

    const applyMediaEdits = async () => {
        if (!editingMedia) return;

        setIsApplyingEdit(true);
        setEditorError(null);

        try {
            const image = new window.Image();
            image.crossOrigin = "anonymous";

            await new Promise<void>((resolve, reject) => {
                image.onload = () => resolve();
                image.onerror = () => reject(new Error("Failed to load image for editing."));
                image.src = editingMedia.url;
            });

            const sourceWidth = image.naturalWidth;
            const sourceHeight = image.naturalHeight;

            const targetWidth = Math.max(1, Math.round((cropWidth / 100) * sourceWidth));
            const targetHeight = Math.max(1, Math.round((cropHeight / 100) * sourceHeight));
            const sourceX = Math.round((cropX / 100) * Math.max(0, sourceWidth - targetWidth));
            const sourceY = Math.round((cropY / 100) * Math.max(0, sourceHeight - targetHeight));

            const canvas = document.createElement("canvas");
            canvas.width = targetWidth;
            canvas.height = targetHeight;

            const ctx = canvas.getContext("2d");
            if (!ctx) {
                throw new Error("Unable to create image editor canvas context.");
            }

            ctx.filter = activeCanvasFilter;
            ctx.drawImage(
                image,
                sourceX,
                sourceY,
                targetWidth,
                targetHeight,
                0,
                0,
                targetWidth,
                targetHeight
            );

            ctx.filter = "none";
            for (const stroke of doodleStrokes) {
                if (stroke.points.length < 2) continue;

                ctx.beginPath();
                ctx.strokeStyle = stroke.color;
                ctx.lineCap = "round";
                ctx.lineJoin = "round";
                ctx.lineWidth = Math.max(1, (stroke.widthPct / 100) * sourceWidth);

                stroke.points.forEach((point, index) => {
                    const sourcePointX = (point.xPct / 100) * sourceWidth;
                    const sourcePointY = (point.yPct / 100) * sourceHeight;
                    const outputX = sourcePointX - sourceX;
                    const outputY = sourcePointY - sourceY;

                    if (index === 0) {
                        ctx.moveTo(outputX, outputY);
                    } else {
                        ctx.lineTo(outputX, outputY);
                    }
                });

                ctx.stroke();
            }

            for (const textItem of textOverlays) {
                const text = textItem.text.trim();
                if (!text) continue;

                const sourceTextX = (textItem.xPct / 100) * sourceWidth;
                const sourceTextY = (textItem.yPct / 100) * sourceHeight;
                const outputX = sourceTextX - sourceX;
                const outputY = sourceTextY - sourceY;

                ctx.fillStyle = textItem.color;
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.font = `${Math.max(10, (textItem.sizePx / Math.max(1, displayedImageRect.width)) * sourceWidth)}px sans-serif`;

                const lines = text.split("\n");
                const lineHeight = Math.max(12, (textItem.sizePx / Math.max(1, displayedImageRect.width)) * sourceWidth * 1.2);
                const startY = outputY - ((lines.length - 1) * lineHeight) / 2;

                lines.forEach((line, index) => {
                    ctx.fillText(line, outputX, startY + index * lineHeight);
                });
            }

            const editedUrl = canvas.toDataURL("image/png", 0.95);

            setTweets((prev) => prev.map((tweet) => {
                if (tweet.id !== editingMedia.tweetId) return tweet;

                return {
                    ...tweet,
                    media: tweet.media.map((item) => {
                        if (item.id !== editingMedia.mediaId) return item;
                        return { ...item, url: editedUrl };
                    }),
                };
            }));

            closeMediaEditor();
        } catch {
            setEditorError("Could not apply edits. Try with uploaded image files or generated images.");
        } finally {
            setIsApplyingEdit(false);
        }
    };

    const canProceed = tweets.every(t => (t.text.length > 0 && t.text.length <= MAX_CHARS) || t.media.length > 0 || t.poll);
    const cropFrameStyle = getCropFrameStyle();
    const displayedImageRect = getDisplayedImageRect();

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
                                                        {m.type === 'image' && (
                                                            <button
                                                                aria-label="Edit image"
                                                                title="Edit image"
                                                                className="absolute top-1 left-1 bg-black/50 p-1 rounded-full text-white hover:bg-black/70"
                                                                onClick={() => {
                                                                    setActiveTweetIndex(index);
                                                                    openMediaEditor(tweet.id, m.id, m.url);
                                                                }}
                                                            >
                                                                <Pencil size={12} />
                                                            </button>
                                                        )}
                                                        <button
                                                            aria-label="Remove media"
                                                            title="Remove media"
                                                            className="absolute top-1 right-1 bg-black/50 p-1 rounded-full text-white hover:bg-black/70"
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

            {editingMedia && (
                <div className="fixed inset-0 z-[120] bg-black/65 backdrop-blur-[2px] flex items-center justify-center p-2 sm:p-4">
                    <div className="w-full max-w-xl bg-[#14181f] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                            <h3 className="text-white font-semibold">Edit image</h3>
                            <button
                                type="button"
                                onClick={closeMediaEditor}
                                className="text-white/70 hover:text-white"
                                title="Close editor"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="p-4 space-y-4">
                            <div ref={editorPreviewRef} className="relative rounded-xl border border-white/10 bg-black/30 h-[40vh] min-h-[240px] max-h-[520px] overflow-hidden">
                                <img
                                    src={editingMedia.url}
                                    alt="Editing preview"
                                    className="w-full h-full object-contain"
                                    style={{ filter: activeCanvasFilter }}
                                    onLoad={(event) => {
                                        const img = event.currentTarget;
                                        setEditorImageNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
                                    }}
                                />
                                <div
                                    className={`absolute border-2 border-app-peach shadow-[0_0_0_9999px_rgba(0,0,0,0.45)] ${isDoodleMode ? "pointer-events-none" : ""} ${cropInteractionMode === "drag" ? "cursor-grabbing" : "cursor-grab"}`}
                                    style={{
                                        width: `${cropFrameStyle.width}px`,
                                        height: `${cropFrameStyle.height}px`,
                                        left: `${cropFrameStyle.left}px`,
                                        top: `${cropFrameStyle.top}px`,
                                    }}
                                    onMouseDown={(event) => startCropInteraction("drag", event)}
                                />
                                <div
                                    className="absolute border border-white/30 pointer-events-none"
                                    style={{
                                        width: `${cropFrameStyle.width}px`,
                                        height: `${cropFrameStyle.height}px`,
                                        left: `${cropFrameStyle.left}px`,
                                        top: `${cropFrameStyle.top}px`,
                                        backgroundImage: "linear-gradient(to right, rgba(255,255,255,0.2) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.2) 1px, transparent 1px)",
                                        backgroundSize: "33.33% 33.33%",
                                    }}
                                />
                                <div
                                    className={`absolute w-4 h-4 rounded-sm bg-app-peach border border-black/30 ${isDoodleMode ? "pointer-events-none" : ""} ${cropInteractionMode === "resize" ? "cursor-se-resize" : "cursor-nwse-resize"}`}
                                    style={{
                                        left: `${cropFrameStyle.left + cropFrameStyle.width - 8}px`,
                                        top: `${cropFrameStyle.top + cropFrameStyle.height - 8}px`,
                                    }}
                                    onMouseDown={(event) => {
                                        event.stopPropagation();
                                        startCropInteraction("resize", event);
                                    }}
                                />
                                <svg
                                    className={`absolute ${isDoodleMode ? "pointer-events-auto" : "pointer-events-none"}`}
                                    style={{
                                        left: `${displayedImageRect.offsetX}px`,
                                        top: `${displayedImageRect.offsetY}px`,
                                        width: `${displayedImageRect.width}px`,
                                        height: `${displayedImageRect.height}px`,
                                        cursor: isDoodleMode ? "crosshair" : "default",
                                    }}
                                    viewBox="0 0 100 100"
                                    preserveAspectRatio="none"
                                    onMouseDown={startDoodle}
                                    onMouseMove={continueDoodle}
                                    onMouseUp={endDoodle}
                                    onMouseLeave={endDoodle}
                                >
                                    {doodleStrokes.map((stroke, index) => (
                                        <polyline
                                            key={`${stroke.color}-${index}`}
                                            points={stroke.points.map((point) => `${point.xPct},${point.yPct}`).join(" ")}
                                            fill="none"
                                            stroke={stroke.color}
                                            strokeWidth={stroke.widthPct}
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    ))}
                                </svg>

                                {textOverlays.map((textItem) => (
                                    <div
                                        key={textItem.id}
                                        onMouseDown={(event) => startTextDrag(textItem.id, event)}
                                        className={`absolute select-none ${isDoodleMode ? "pointer-events-none" : "cursor-move"}`}
                                        style={{
                                            left: `${displayedImageRect.offsetX + (textItem.xPct / 100) * displayedImageRect.width}px`,
                                            top: `${displayedImageRect.offsetY + (textItem.yPct / 100) * displayedImageRect.height}px`,
                                            transform: "translate(-50%, -50%)",
                                            color: textItem.color,
                                            fontSize: `${textItem.sizePx}px`,
                                            fontWeight: 700,
                                            textShadow: "0 1px 2px rgba(0,0,0,0.55)",
                                            whiteSpace: "pre-wrap",
                                            padding: "2px 6px",
                                            borderRadius: "6px",
                                            border: activeTextId === textItem.id ? "1px dashed rgba(255,255,255,0.7)" : "1px dashed transparent",
                                            background: activeTextId === textItem.id ? "rgba(0,0,0,0.25)" : "transparent",
                                        }}
                                        title="Drag text"
                                    >
                                        {textItem.text}
                                    </div>
                                ))}
                            </div>

                            <div className="flex items-center gap-2 pt-1">
                                {EDITOR_TOOLS.map((tool) => (
                                    <button
                                        key={tool.id}
                                        type="button"
                                        onClick={() => setActiveEditorTool((prev) => (prev === tool.id ? "none" : tool.id))}
                                        className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${activeEditorTool === tool.id
                                            ? "bg-app-peach/20 border-app-peach text-app-peach"
                                            : "bg-black/25 border-white/15 text-white/75 hover:border-white/30"
                                            }`}
                                    >
                                        {tool.label}
                                    </button>
                                ))}
                            </div>

                            {activeEditorTool === "filter" && (
                                <div className="space-y-2">
                                <p className="text-xs uppercase tracking-wider text-white/60">Filters</p>
                                <div className="flex flex-wrap gap-2">
                                    {FILTER_PRESETS.map((preset) => (
                                        <button
                                            key={preset.id}
                                            type="button"
                                            onClick={() => setFilterPreset(preset.id)}
                                            className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${filterPreset === preset.id
                                                ? 'bg-app-peach/20 border-app-peach text-app-peach'
                                                : 'bg-black/25 border-white/15 text-white/75 hover:border-white/30'
                                                }`}
                                        >
                                            {preset.label}
                                        </button>
                                    ))}
                                </div>
                                </div>
                            )}

                            {activeEditorTool === "doodle" && (
                                <div className="space-y-2">
                                <p className="text-xs uppercase tracking-wider text-white/60">Doodle</p>

                                <div className="flex flex-wrap gap-2">
                                    {DOODLE_COLORS.map((color) => (
                                        <button
                                            key={color}
                                            type="button"
                                            title={color}
                                            onClick={() => setDoodleColor(color)}
                                            className={`w-7 h-7 rounded-full border-2 ${doodleColor === color ? "border-app-peach" : "border-white/30"}`}
                                            style={{ backgroundColor: color }}
                                        />
                                    ))}
                                </div>

                                <div className="flex items-center gap-3">
                                    <label className="text-xs text-white/70">Brush</label>
                                    <input
                                        type="range"
                                        min={2}
                                        max={24}
                                        value={doodleSizePx}
                                        onChange={(e) => setDoodleSizePx(Number(e.target.value))}
                                        className="w-full"
                                    />
                                    <span className="text-xs text-white/70 w-8 text-right">{doodleSizePx}</span>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setDoodleStrokes((prev) => prev.slice(0, -1))}
                                        disabled={doodleStrokes.length === 0}
                                        className="px-2.5 py-1.5 rounded-lg border border-white/15 text-xs text-white/80 hover:bg-white/5 disabled:opacity-50"
                                    >
                                        Undo
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setDoodleStrokes([])}
                                        disabled={doodleStrokes.length === 0}
                                        className="px-2.5 py-1.5 rounded-lg border border-white/15 text-xs text-white/80 hover:bg-white/5 disabled:opacity-50"
                                    >
                                        Clear
                                    </button>
                                </div>
                                </div>
                            )}

                            {activeEditorTool === "text" && (
                                <div className="space-y-2">
                                <p className="text-xs uppercase tracking-wider text-white/60">Text</p>
                                <div className="flex gap-2">
                                    <input
                                        value={textInputValue}
                                        onChange={(e) => setTextInputValue(e.target.value)}
                                        placeholder="Type text..."
                                        className="flex-1 bg-black/25 border border-white/15 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-app-peach"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const text = textInputValue.trim();
                                            if (!text) return;

                                            const id = `text-${Date.now()}`;
                                            setTextOverlays((prev) => [...prev, {
                                                id,
                                                text,
                                                xPct: 50,
                                                yPct: 50,
                                                color: textColor,
                                                sizePx: textSizePx,
                                            }]);
                                            setActiveTextId(id);
                                            setTextInputValue("");
                                        }}
                                        className="px-3 py-2 rounded-lg bg-app-peach text-app-bg text-sm font-semibold hover:brightness-110"
                                    >
                                        Add
                                    </button>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    {TEXT_COLORS.map((color) => (
                                        <button
                                            key={color}
                                            type="button"
                                            title={color}
                                            onClick={() => {
                                                setTextColor(color);
                                                if (!activeTextId) return;
                                                setTextOverlays((prev) => prev.map((item) => item.id === activeTextId ? { ...item, color } : item));
                                            }}
                                            className={`w-7 h-7 rounded-full border-2 ${textColor === color ? "border-app-peach" : "border-white/30"}`}
                                            style={{ backgroundColor: color }}
                                        />
                                    ))}
                                </div>

                                <div className="flex items-center gap-3">
                                    <label className="text-xs text-white/70">Size</label>
                                    <input
                                        type="range"
                                        min={12}
                                        max={64}
                                        value={textSizePx}
                                        onChange={(e) => {
                                            const nextSize = Number(e.target.value);
                                            setTextSizePx(nextSize);
                                            if (!activeTextId) return;
                                            setTextOverlays((prev) => prev.map((item) => item.id === activeTextId ? { ...item, sizePx: nextSize } : item));
                                        }}
                                        className="w-full"
                                    />
                                    <span className="text-xs text-white/70 w-8 text-right">{textSizePx}</span>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (!activeTextId) return;
                                            setTextOverlays((prev) => prev.filter((item) => item.id !== activeTextId));
                                            setActiveTextId(null);
                                        }}
                                        disabled={!activeTextId}
                                        className="px-2.5 py-1.5 rounded-lg border border-white/15 text-xs text-white/80 hover:bg-white/5 disabled:opacity-50"
                                    >
                                        Remove Selected
                                    </button>
                                </div>
                                </div>
                            )}

                            <p className="text-xs text-white/65">Use the tool buttons to switch between Doodle, Text, and Filter. Click an active tool again to deselect and keep only crop controls active.</p>

                            {editorError && <p className="text-xs text-red-300">{editorError}</p>}
                        </div>

                        <div className="px-4 py-3 border-t border-white/10 flex items-center justify-between">
                            <button
                                type="button"
                                onClick={() => {
                                    setCropWidth(100);
                                    setCropHeight(100);
                                    setCropX(0);
                                    setCropY(0);
                                    setFilterPreset("none");
                                    setDoodleStrokes([]);
                                    setTextOverlays([]);
                                    setActiveTextId(null);
                                    setTextInputValue("");
                                    setTextColor(TEXT_COLORS[0]);
                                    setTextSizePx(24);
                                }}
                                className="inline-flex items-center gap-2 text-sm text-white/75 hover:text-white"
                            >
                                <RotateCcw size={14} /> Reset
                            </button>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={closeMediaEditor}
                                    className="px-3 py-1.5 rounded-lg border border-white/15 text-white/80 hover:text-white hover:bg-white/5"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={() => void applyMediaEdits()}
                                    disabled={isApplyingEdit}
                                    className="px-3 py-1.5 rounded-lg bg-app-peach text-app-bg font-semibold hover:brightness-110 disabled:opacity-60"
                                >
                                    {isApplyingEdit ? "Applying..." : "Apply"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CompositionArea;