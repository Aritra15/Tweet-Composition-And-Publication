import { useEffect, useRef, useState } from "react";

interface VideoPlayerProps {
    url: string;
    single: boolean;
    headerRef?: React.RefObject<HTMLElement | null>;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ url, single, headerRef }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const progressBarRef = useRef<HTMLDivElement>(null);
    const [muted, setMuted] = useState(true);
    const [paused, setPaused] = useState(false);
    const [progress, setProgress] = useState(0);
    const [hovered, setHovered] = useState(false);
    const [dragging, setDragging] = useState(false);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const controlsRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [showTime, setShowTime] = useState(true);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const observer = new ResizeObserver((entries) => {
            const width = entries[0].contentRect.width;
            // play(18) + mute(16) + time(~70) + gaps(~32) + min progress bar(~60) = ~196
            setShowTime(width >= 200);
        });

        observer.observe(container);
        return () => observer.disconnect();
    }, []);

    const handleLoadedMetadata = () => {
        if (videoRef.current) {
            setDuration(videoRef.current.duration);
        }
    };

    const handleTimeUpdate = () => {
        if (dragging) return;
        const video = videoRef.current;
        if (!video) return;
        setCurrentTime(video.currentTime);
        setProgress((video.currentTime / video.duration) * 100);
    };

    const formatTime = (seconds: number): string => {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const toggleMute = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (videoRef.current) {
            videoRef.current.muted = !muted;
            setMuted(!muted);
        }
    };

    const togglePlay = (e: React.MouseEvent) => {
        e.stopPropagation();
        const video = videoRef.current;
        if (!video) return;
        if (video.paused) {
            video.play();
            setPaused(false);
        } else {
            video.pause();
            setPaused(true);
        }
    };

    const seekToPosition = (clientX: number) => {
        const bar = progressBarRef.current;
        const video = videoRef.current;
        if (!bar || !video) return;
        const rect = bar.getBoundingClientRect();
        const ratio = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
        video.currentTime = ratio * video.duration;
        setProgress(ratio * 100);
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        e.stopPropagation();
        setDragging(true);
        seekToPosition(e.clientX);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!dragging) return;
        seekToPosition(e.clientX);
    };

    const handleMouseUp = (e: React.MouseEvent) => {
        if (!dragging) return;
        setDragging(false);
        seekToPosition(e.clientX);
    };

    // Handle drag going outside the bar
    useEffect(() => {
        if (!dragging) return;
        const onMouseMove = (e: MouseEvent) => seekToPosition(e.clientX);
        const onMouseUp = (e: MouseEvent) => {
            seekToPosition(e.clientX);
            setDragging(false);
        };
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };
    }, [dragging]);

    useEffect(() => {
        const video = videoRef.current;
        if (!video || (headerRef && !headerRef.current)) return;

        const checkVisibility = () => {
            const videoRect = video.getBoundingClientRect();
            const headerBottom = headerRef ? headerRef.current!.getBoundingClientRect().bottom : 0;
            const videoHeight = videoRect.height;

            // How far the video has gone under the header
            const hiddenUnderHeader = Math.max(0, headerBottom - videoRect.top);
            const hiddenFraction = hiddenUnderHeader / videoHeight;

            if (hiddenFraction >= 0.9) {
                video.muted = true;
                setMuted(true);
            }
        };

        window.addEventListener('scroll', checkVisibility);

        return () => window.removeEventListener('scroll', checkVisibility);
    }, [headerRef]);

    useEffect(() => {
        const checkOverflow = () => {
            const controls = controlsRef.current;
            const container = containerRef.current;
            if (!controls || !container) return;
            setShowTime(controls.scrollWidth <= container.offsetWidth);
        };

        checkOverflow();
        window.addEventListener('resize', checkOverflow);
        return () => window.removeEventListener('resize', checkOverflow);
    }, []);

    return (
        <div
            ref={containerRef}
            className={`flex-shrink-0 relative ${single ? 'h-[360px] w-fit max-w-[90%]' : 'h-[200px]'} rounded-2xl overflow-hidden border border-app-border bg-black`}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            <video
                ref={videoRef}
                src={url}
                className="w-full h-full object-contain"
                autoPlay
                loop
                muted={muted}
                playsInline
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
            />

            {/* Floating controls — shown on hover */}
            <div className={`absolute bottom-0 left-0 right-0 transition-opacity duration-200 ${hovered ? 'opacity-100' : 'opacity-0'}`}>
                {/* Gradient backdrop */}
                <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/70 to-transparent pointer-events-none rounded-b-2xl" />

                {/* Controls row */}
                <div ref={controlsRef} className="relative flex items-center gap-2 px-3 pb-3 pt-6">
                    {/* Play/Pause */}
                    <button
                        onClick={togglePlay}
                        className="text-white hover:text-white/80 transition-colors shrink-0"
                    >
                        {paused ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                <polygon points="5 3 19 12 5 21 5 3" />
                            </svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                <rect x="6" y="4" width="4" height="16" />
                                <rect x="14" y="4" width="4" height="16" />
                            </svg>
                        )}
                    </button>

                    {/* Progress bar */}
                    <div
                        ref={progressBarRef}
                        className="flex-1 h-1.5 bg-white/30 rounded-full cursor-pointer relative group/bar"
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                    >
                        <div
                            className="h-full bg-white rounded-full pointer-events-none"
                            style={{ width: `${progress}%` }}
                        />
                        {/* Drag handle */}
                        <div
                            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow pointer-events-none transition-opacity"
                            style={{ left: `${progress}%`, transform: 'translate(-50%, -50%)' }}
                        />
                    </div>

                    {/* Time */}
                    {showTime && <span className="text-white text-[10px] whitespace-nowrap shrink-0">
                        {formatTime(currentTime)} / {formatTime(duration)}
                    </span>}

                    {/* Mute/Unmute */}
                    <button
                        onClick={toggleMute}
                        className="text-white hover:text-white/80 transition-colors shrink-0"
                    >
                        {muted ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                                <line x1="23" y1="9" x2="17" y2="15" />
                                <line x1="17" y1="9" x2="23" y2="15" />
                            </svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                                <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                            </svg>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default VideoPlayer;