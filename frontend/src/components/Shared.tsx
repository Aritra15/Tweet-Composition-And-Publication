import React, { useEffect, useLayoutEffect, useState } from 'react';
import { type LucideIcon, MessageCircle, Repeat, Heart, Share } from 'lucide-react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';

// --- Colors ---
// Using Tailwind classes defined in index.html config:
// app-bg, app-card, app-elevated, app-border, app-text, app-muted, app-peach, app-lavender, app-lime, app-error

export const Button = ({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  className = '',
  icon: Icon,
}: {
  children?: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive' | 'icon';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
  icon?: LucideIcon;
}) => {
  const baseStyles = "rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2 active:scale-[0.97]";

  const variants = {
    primary: "bg-app-peach text-app-bg hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-app-peach/10",
    secondary: "bg-transparent border border-app-lavender text-app-lavender hover:bg-app-lavender/10 disabled:opacity-50 disabled:cursor-not-allowed",
    ghost: "text-app-muted hover:text-app-text hover:bg-app-elevated/50",
    destructive: "text-app-error hover:bg-app-error/10",
    icon: "p-2 hover:bg-app-elevated text-app-peach rounded-full",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-5 py-2.5 text-base",
    lg: "px-6 py-3 text-lg w-full",
  };

  const iconSizes = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-12 h-12",
  };

  const selectedSize = variant === 'icon' ? (size === 'sm' ? iconSizes.sm : iconSizes.md) : sizes[size];
  const finalClass = `${baseStyles} ${variants[variant]} ${variant !== 'icon' ? selectedSize : iconSizes[size]} ${className}`;

  return (
    <button onClick={onClick} disabled={disabled} className={finalClass}>
      {Icon && <Icon size={variant === 'icon' ? 20 : 18} />}
      {children}
    </button>
  );
};

export const Avatar = ({ src, alt, size = 'md' }: { src: string; alt: string; size?: 'sm' | 'md' | 'lg' }) => {
  const sizeClass = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  }[size];

  return (
    <img
      src={src}
      alt={alt}
      className={`${sizeClass} rounded-full border border-app-border object-cover bg-app-elevated`}
    />
  );
};

export const Input = ({
  value,
  onChange,
  placeholder,
  multiline = false,
  maxLength,
  className = '',
}: {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  multiline?: boolean;
  maxLength?: number;
  className?: string;
}) => {
  const baseStyles = "w-full bg-transparent text-app-text placeholder-app-muted text-lg outline-none resize-none";

  if (multiline) {
    return (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`${baseStyles} min-h-[120px] ${className}`}
        maxLength={maxLength}
      />
    );
  }
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`${baseStyles} h-12 px-4 rounded-xl bg-app-elevated border border-app-border focus:ring-1 focus:ring-app-lavender ${className}`}
    />
  );
};

export const Chip: React.FC<{ label: string; active?: boolean; icon?: LucideIcon; onClick?: () => void }> = ({ label, active = false, icon: Icon, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-1.5 transition-colors ${active
        ? 'bg-app-peach text-app-bg'
        : 'border border-app-border text-app-muted hover:border-app-lavender hover:text-app-text'
        }`}
    >
      {Icon && <Icon size={14} />}
      {label}
    </button>
  );
};

export const Toast = ({ message, type = 'success', className = '' }: { message: string; type?: 'success' | 'error'; className?: string }) => (
  <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-6 py-3 rounded-xl backdrop-blur-md shadow-2xl z-50 flex items-center gap-3 animate-fade-in-up ${type === 'success' ? 'bg-app-elevated/90 border border-app-lime/30 text-app-lime' : 'bg-app-elevated/90 border border-app-error/30 text-app-error'} ${className}`}>
    <div className={`w-2 h-2 rounded-full ${type === 'success' ? 'bg-app-lime' : 'bg-app-error'}`} />
    <span className="text-app-text font-medium">{message}</span>
  </div>
);

export const Toggle = ({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) => {
  return (
    <button
      aria-label="Close"
      onClick={() => onChange(!checked)}
      className={`w-12 h-7 rounded-full relative transition-colors duration-200 ${checked ? 'bg-app-peach' : 'bg-app-border'}`}
    >
      <div className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-200 ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  );
};

export const BottomSheet = ({
  isOpen,
  onOpen,
  onClose,
  onCancel,
  anchorRef,
  floating = false,
  horizontalOffset = 0,
  verticalOffset = 0,
  panelClassName = '',
  children,
  title
}: {
  isOpen: boolean;
  onOpen?: () => void;
  onClose: () => void;
  onCancel?: () => void;
  anchorRef?: React.RefObject<HTMLElement | null>;
  floating?: boolean;
  horizontalOffset?: number;
  verticalOffset?: number;
  panelClassName?: string;
  children?: React.ReactNode;
  title: string;
}) => {
  const [position, setPosition] = useState<{ top: number; left: number; maxHeight: number } | null>(null);
  const dragControls = useDragControls();
  const handleBackdropClose = () => {
    if (onCancel) {
      onCancel();
      return;
    }
    onClose();
  };

  useLayoutEffect(() => {
    if (!isOpen || !floating) return;

    const computePosition = () => {
      if (!anchorRef?.current) {
        setPosition(null);
        return;
      }

      const rect = anchorRef.current.getBoundingClientRect();
      const panelWidth = 360;
      const viewportPadding = 12;
      const availableHeight = Math.max(window.innerHeight - viewportPadding * 2, 280);
      const maxHeight = Math.min(availableHeight, 520);

      let left = rect.left + (rect.width / 2) - (panelWidth / 2) + horizontalOffset;
      left = Math.max(viewportPadding, left);
      left = Math.min(window.innerWidth - panelWidth - viewportPadding, left);

      const preferTop = rect.top - maxHeight - 12;
      let top = preferTop >= viewportPadding
        ? preferTop
        : Math.min(rect.bottom + 12, window.innerHeight - maxHeight - viewportPadding);
      top = Math.max(viewportPadding, Math.min(top, window.innerHeight - maxHeight - viewportPadding));
      top += verticalOffset;

      setPosition({ top, left, maxHeight });
    };

    computePosition();
    window.addEventListener('resize', computePosition);
    window.addEventListener('scroll', computePosition, true);

    return () => {
      window.removeEventListener('resize', computePosition);
      window.removeEventListener('scroll', computePosition, true);
    };
  }, [isOpen, floating, anchorRef, horizontalOffset, verticalOffset]);

  useEffect(() => {
    if (isOpen) {
      onOpen?.();
    }
  }, [isOpen, onOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`fixed inset-0 z-[60] ${floating ? 'bg-black/25 backdrop-blur-[1px]' : 'bg-black/60'}`}
            onPointerDown={handleBackdropClose}
          />
          <motion.div
            initial={floating ? { opacity: 0, scale: 0.94, y: 8 } : { y: '100%' }}
            animate={floating ? { opacity: 1, scale: 1, y: 0 } : { y: 0 }}
            exit={floating ? { opacity: 0, scale: 0.94, y: 8 } : { y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            drag={floating ? true : 'y'}
            dragControls={dragControls}
            dragListener={false}
            dragMomentum={false}
            dragElastic={0.12}
            style={floating ? {
              top: position?.top ?? 80,
              left: position?.left ?? 12,
              width: 'min(360px, calc(100vw - 24px))',
              maxHeight: position?.maxHeight ?? 520,
            } : undefined}
            className={`fixed z-[70] overflow-y-auto border border-app-border/60 shadow-2xl ${floating
              ? 'bg-app-elevated rounded-2xl'
              : 'bottom-0 left-0 right-0 bg-app-elevated rounded-t-3xl max-h-[85vh] border-t border-app-border/50'} ${panelClassName}`}
          >
            <div
              onPointerDown={(event) => dragControls.start(event)}
              className={`sticky top-0 bg-app-elevated/95 backdrop-blur z-10 px-5 pt-3 pb-2 flex items-center justify-between border-b border-app-border/30 select-none touch-none cursor-grab active:cursor-grabbing ${floating ? 'rounded-t-2xl' : ''}`}
            >
              <div className="w-12" />
              {/* Handle bar */}
              {!floating && <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-1.5 rounded-full bg-app-border" />}
              <h3 className={`text-lg font-bold text-app-text ${floating ? '' : 'mt-2'}`}>{title}</h3>
              <button
                onPointerDown={(event) => event.stopPropagation()}
                onClick={onClose}
                className="px-3 py-1.5 -mr-2 text-sm font-semibold text-app-peach hover:text-app-text"
              >
                Done
              </button>
            </div>
            <div className={`${floating ? 'p-4 pt-2 pb-5' : 'p-6 pt-2 pb-10'}`}>
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export const TweetActions = ({ likes, replies, reposts }: { likes: number, replies: number, reposts: number }) => (
  <div className="flex items-center justify-between text-app-muted max-w-md mt-3">
    <button className="flex items-center gap-1.5 group hover:text-app-peach transition-colors">
      <MessageCircle size={18} className="group-hover:stroke-app-peach" />
      <span className="text-xs">{replies}</span>
    </button>
    <button className="flex items-center gap-1.5 group hover:text-app-lime transition-colors">
      <Repeat size={18} className="group-hover:stroke-app-lime" />
      <span className="text-xs">{reposts}</span>
    </button>
    <button className="flex items-center gap-1.5 group hover:text-app-error transition-colors">
      <Heart size={18} className="group-hover:stroke-app-error" />
      <span className="text-xs">{likes}</span>
    </button>
    <button aria-label="Close" className="flex items-center gap-1.5 group hover:text-app-lavender transition-colors">
      <Share size={18} className="group-hover:stroke-app-lavender" />
    </button>
  </div>
);