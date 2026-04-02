export const MIN_CROP_SIZE = 20;
export const MIN_DOODLE_WIDTH_PCT = 0.25;

export type FilterPreset = "none" | "warm" | "mono" | "sepia" | "noir" | "retro" | "bright";
export type EditorTool = "none" | "filter" | "doodle" | "text";

export type DoodlePoint = { xPct: number; yPct: number };
export type DoodleStroke = { color: string; widthPct: number; points: DoodlePoint[] };

export type TextOverlay = {
    id: string;
    text: string;
    xPct: number;
    yPct: number;
    color: string;
    sizePx: number;
};

export const FILTER_PRESETS: Array<{ id: FilterPreset; label: string }> = [
    { id: "none", label: "Original" },
    { id: "warm", label: "Warm" },
    { id: "mono", label: "Mono" },
    { id: "sepia", label: "Sepia" },
    { id: "noir", label: "Noir" },
    { id: "retro", label: "Retro" },
    { id: "bright", label: "Bright" },
];

export const DOODLE_COLORS = ["#ffffff", "#f59e0b", "#ef4444", "#22c55e", "#3b82f6", "#a855f7", "#111827"];
export const TEXT_COLORS = ["#ffffff", "#000000", "#f59e0b", "#ef4444", "#22c55e", "#3b82f6", "#a855f7"];

export const EDITOR_TOOLS: Array<{ id: EditorTool; label: string }> = [
    { id: "doodle", label: "Doodle" },
    { id: "text", label: "Text" },
    { id: "filter", label: "Filter" },
];

export const getCanvasFilter = (preset: FilterPreset): string => {
    if (preset === "warm") return "saturate(1.15) contrast(1.05) sepia(0.12)";
    if (preset === "mono") return "grayscale(1) contrast(1.1)";
    if (preset === "sepia") return "sepia(0.7) contrast(1.05)";
    if (preset === "noir") return "grayscale(1) contrast(1.28) brightness(0.9)";
    if (preset === "retro") return "sepia(0.28) saturate(0.95) hue-rotate(-8deg) contrast(0.94)";
    if (preset === "bright") return "brightness(1.12) saturate(1.08)";
    return "none";
};
