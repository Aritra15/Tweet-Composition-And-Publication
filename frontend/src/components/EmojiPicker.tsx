import React, { useEffect, useRef } from 'react';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';

interface EmojiPickerProps {
    onSelect: (emoji: string) => void;
}

export const EmojiPicker: React.FC<EmojiPickerProps> = ({ onSelect }) => {
    const containerRef = useRef<HTMLDivElement>(null);

    const handleEmojiSelect = (emoji: { native?: string }) => {
        if (!emoji.native) return;
        onSelect(emoji.native);
    };

    useEffect(() => {
        if (!containerRef.current) return;

        // em-emoji-picker is a web component — must set width directly on the element
        const picker = containerRef.current.querySelector('em-emoji-picker') as HTMLElement;
        if (picker) {
            picker.style.width = '100%';
            picker.style.minWidth = '100%';
            picker.style.maxWidth = '100%';
            picker.style.height = '350px';
            picker.style.minHeight = '350px';
            picker.style.maxHeight = '350px';
            picker.style.border = 'none';
        }
    }, []);

    return (
        <div className="w-full rounded-2xl border border-app-border bg-app-card overflow-hidden">
            <div ref={containerRef} className="w-full">
                <Picker
                    data={data}
                    onEmojiSelect={handleEmojiSelect}
                    theme="dark"
                    set="native"
                    locale="en"
                    navPosition="bottom"
                    previewPosition="none"
                    searchPosition="sticky"
                    skinTonePosition="search"
                    maxFrequentRows={2}
                    perLine={10}
                    emojiSize={24}
                    emojiButtonSize={38}
                    dynamicWidth={true}
                    icons="solid"
                />
            </div>
        </div>
    );
};