import { RotateCcw, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
    DOODLE_COLORS,
    EDITOR_TOOLS,
    FILTER_PRESETS,
    MIN_CROP_SIZE,
    MIN_DOODLE_WIDTH_PCT,
    TEXT_COLORS,
    type DoodlePoint,
    type DoodleStroke,
    type EditorTool,
    type FilterPreset,
    type TextOverlay,
    getCanvasFilter,
} from "./mediaEditorTypes";

export type EditingMediaTarget = {
    tweetId: string;
    mediaId: string;
    url: string;
};

interface MediaEditorModalProps {
    editingMedia: EditingMediaTarget | null;
    onClose: () => void;
    onApply: (target: EditingMediaTarget, editedUrl: string) => void;
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
const isFinitePositive = (value: number) => Number.isFinite(value) && value > 0;

const MediaEditor: React.FC<MediaEditorModalProps> = ({ editingMedia, onClose, onApply }) => {
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

    const resetEditorState = () => {
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

    useEffect(() => {
        if (!editingMedia) return;
        resetEditorState();
    }, [editingMedia]);

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
        const left = imageRect.offsetX + (safeCropX / 100) * Math.max(0, safeImageWidth - width);
        const top = imageRect.offsetY + (safeCropY / 100) * Math.max(0, safeImageHeight - height);

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

            const deltaXPct = ((event.clientX - interaction.startClientX) / interaction.imageWidth) * 100;
            const deltaYPct = ((event.clientY - interaction.startClientY) / interaction.imageHeight) * 100;
            if (!Number.isFinite(deltaXPct) || !Number.isFinite(deltaYPct)) return;

            const startLeftPct = (interaction.startCropX / 100) * (100 - interaction.startCropWidth);
            const startTopPct = (interaction.startCropY / 100) * (100 - interaction.startCropHeight);

            if (interaction.mode === "drag") {
                const nextLeftPct = clamp(startLeftPct + deltaXPct, 0, 100 - interaction.startCropWidth);
                const nextTopPct = clamp(startTopPct + deltaYPct, 0, 100 - interaction.startCropHeight);

                const nextCropX = interaction.startCropWidth >= 100 ? 0 : (nextLeftPct / (100 - interaction.startCropWidth)) * 100;
                const nextCropY = interaction.startCropHeight >= 100 ? 0 : (nextTopPct / (100 - interaction.startCropHeight)) * 100;

                if (!Number.isFinite(nextCropX) || !Number.isFinite(nextCropY)) return;
                setCropX(clamp(nextCropX, 0, 100));
                setCropY(clamp(nextCropY, 0, 100));
                return;
            }

            const nextCropWidth = clamp(interaction.startCropWidth + deltaXPct, MIN_CROP_SIZE, 100 - startLeftPct);
            const nextCropHeight = clamp(interaction.startCropHeight + deltaYPct, MIN_CROP_SIZE, 100 - startTopPct);

            const nextCropX = nextCropWidth >= 100 ? 0 : (startLeftPct / (100 - nextCropWidth)) * 100;
            const nextCropY = nextCropHeight >= 100 ? 0 : (startTopPct / (100 - nextCropHeight)) * 100;

            if (!Number.isFinite(nextCropWidth) || !Number.isFinite(nextCropHeight) || !Number.isFinite(nextCropX) || !Number.isFinite(nextCropY)) {
                return;
            }
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

            const deltaXPct = ((event.clientX - dragState.startClientX) / dragState.imageWidth) * 100;
            const deltaYPct = ((event.clientY - dragState.startClientY) / dragState.imageHeight) * 100;
            if (!Number.isFinite(deltaXPct) || !Number.isFinite(deltaYPct)) return;

            setTextOverlays((prev) =>
                prev.map((item) => {
                    if (item.id !== dragState.textId) return item;

                    return {
                        ...item,
                        xPct: clamp(dragState.startXPct + deltaXPct, 0, 100),
                        yPct: clamp(dragState.startYPct + deltaYPct, 0, 100),
                    };
                })
            );
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

    const handleClose = () => {
        onClose();
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
            ctx.drawImage(image, sourceX, sourceY, targetWidth, targetHeight, 0, 0, targetWidth, targetHeight);

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

            const displayedImageRect = getDisplayedImageRect();
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
            onApply(editingMedia, editedUrl);
            handleClose();
        } catch {
            setEditorError("Could not apply edits. Try with uploaded image files or generated images.");
        } finally {
            setIsApplyingEdit(false);
        }
    };

    if (!editingMedia) return null;

    const cropFrameStyle = getCropFrameStyle();
    const displayedImageRect = getDisplayedImageRect();

    return (
        <div className="fixed inset-0 z-[120] bg-black/65 backdrop-blur-[2px] flex items-center justify-center p-2 sm:p-4">
            <div className="w-full max-w-xl bg-[#14181f] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                    <h3 className="text-white font-semibold">Edit image</h3>
                    <button type="button" onClick={handleClose} className="text-white/70 hover:text-white" title="Close editor">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-4 space-y-4">
                    <div
                        ref={editorPreviewRef}
                        className="relative rounded-xl border border-white/10 bg-black/30 h-[40vh] min-h-[240px] max-h-[520px] overflow-hidden"
                    >
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
                            className={`absolute border-2 border-app-peach shadow-[0_0_0_9999px_rgba(0,0,0,0.45)] ${isDoodleMode ? "pointer-events-none" : ""} ${cropInteractionMode === "drag" ? "cursor-grabbing" : "cursor-grab"
                                }`}
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
                                backgroundImage:
                                    "linear-gradient(to right, rgba(255,255,255,0.2) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.2) 1px, transparent 1px)",
                                backgroundSize: "33.33% 33.33%",
                            }}
                        />
                        <div
                            className={`absolute w-4 h-4 rounded-sm bg-app-peach border border-black/30 ${isDoodleMode ? "pointer-events-none" : ""} ${cropInteractionMode === "resize" ? "cursor-se-resize" : "cursor-nwse-resize"
                                }`}
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
                                                ? "bg-app-peach/20 border-app-peach text-app-peach"
                                                : "bg-black/25 border-white/15 text-white/75 hover:border-white/30"
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
                                    aria-label="Doodle brush size"
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
                                        setTextOverlays((prev) => [
                                            ...prev,
                                            {
                                                id,
                                                text,
                                                xPct: 50,
                                                yPct: 50,
                                                color: textColor,
                                                sizePx: textSizePx,
                                            },
                                        ]);
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
                                            setTextOverlays((prev) => prev.map((item) => (item.id === activeTextId ? { ...item, color } : item)));
                                        }}
                                        className={`w-7 h-7 rounded-full border-2 ${textColor === color ? "border-app-peach" : "border-white/30"}`}
                                        style={{ backgroundColor: color }}
                                    />
                                ))}
                            </div>

                            <div className="flex items-center gap-3">
                                <label className="text-xs text-white/70">Size</label>
                                <input
                                    aria-label="Text size"
                                    type="range"
                                    min={12}
                                    max={64}
                                    value={textSizePx}
                                    onChange={(e) => {
                                        const nextSize = Number(e.target.value);
                                        setTextSizePx(nextSize);
                                        if (!activeTextId) return;
                                        setTextOverlays((prev) =>
                                            prev.map((item) => (item.id === activeTextId ? { ...item, sizePx: nextSize } : item))
                                        );
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

                    {editorError && <p className="text-xs text-red-300">{editorError}</p>}
                </div>

                <div className="px-4 py-3 border-t border-white/10 flex items-center justify-between">
                    <button
                        type="button"
                        onClick={resetEditorState}
                        className="inline-flex items-center gap-2 text-sm text-white/75 hover:text-white"
                    >
                        <RotateCcw size={14} /> Reset
                    </button>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleClose}
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
    );
};

export default MediaEditor;
