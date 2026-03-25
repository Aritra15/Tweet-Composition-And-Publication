import { Download, X } from 'lucide-react';
import { useEffect } from 'react';

interface MediaLightboxProps {
    isOpen: boolean;
    url: string | null;
    type: 'image' | 'video' | null;
    onClose: () => void;
}

const MediaLightbox: React.FC<MediaLightboxProps> = ({ isOpen, url, type, onClose }) => {
    useEffect(() => {
        if (!isOpen) {
            return;
        }

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        window.addEventListener('keydown', onKeyDown);

        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [isOpen, onClose]);

    if (!isOpen || !url || !type) {
        return null;
    }

    return (
        <div
            className="fixed inset-0 z-[120] bg-black/90 backdrop-blur-[1px] p-4 sm:p-8"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-label="Media preview"
        >
            <div
                className="relative h-full w-full flex items-center justify-center"
                onClick={(event) => event.stopPropagation()}
            >
                <button
                    type="button"
                    onClick={onClose}
                    className="absolute top-2 right-2 sm:top-4 sm:right-4 z-10 w-10 h-10 border rounded-full bg-black/65 hover:bg-black/80 text-white flex items-center justify-center"
                    aria-label="Close media preview"
                >
                    <X strokeWidth={2} className="w-6 h-6" />
                </button>

                {type === 'image' && <a
                    href={url}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute top-2 left-2 sm:top-4 sm:left-4 z-10 w-10 h-10 border rounded-full bg-black/65 hover:bg-black/80 text-white flex items-center justify-center"
                    aria-label="Download media"
                >
                    <Download strokeWidth={2} className="w-5 h-5" />
                </a>}

                <div className="max-h-full max-w-full rounded-2xl overflow-hidden border border-white/20 bg-black shadow-2xl">
                    {type === 'video' ? (
                        <video
                            src={url}
                            controls
                            autoPlay
                            className="max-h-[84vh] max-w-[92vw] object-contain bg-black"
                        />
                    ) : (
                        <img
                            src={url}
                            alt="Expanded tweet media"
                            className="max-h-[84vh] max-w-[92vw] object-contain bg-black"
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default MediaLightbox;
