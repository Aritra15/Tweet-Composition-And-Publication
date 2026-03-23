import React from 'react';
import { X, Home, type LucideIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ScreenName } from '../types';

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
    secondary: "bg-transparent border border-app-lavender text-app-lavender hover:bg-app-lavender/10 disabled:opacity-50",
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
    lg: 'w-14 h-14',
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
      className={`px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-1.5 transition-colors ${
        active
          ? 'bg-app-peach text-app-bg'
          : 'border border-app-border text-app-muted hover:border-app-lavender hover:text-app-text'
      }`}
    >
      {Icon && <Icon size={14} />}
      {label}
    </button>
  );
};

export const Toast = ({ message, type = 'success' }: { message: string; type?: 'success' | 'error' }) => (
  <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-6 py-3 rounded-xl backdrop-blur-md shadow-2xl z-50 flex items-center gap-3 animate-fade-in-up ${
    type === 'success' ? 'bg-app-elevated/90 border border-app-lime/30 text-app-lime' : 'bg-app-elevated/90 border border-app-error/30 text-app-error'
  }`}>
    <div className={`w-2 h-2 rounded-full ${type === 'success' ? 'bg-app-lime' : 'bg-app-error'}`} />
    <span className="text-app-text font-medium">{message}</span>
  </div>
);

export const Toggle = ({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) => {
  return (
    <button 
      onClick={() => onChange(!checked)}
      className={`w-12 h-7 rounded-full relative transition-colors duration-200 ${checked ? 'bg-app-peach' : 'bg-app-border'}`}
    >
      <div className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-200 ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  );
};

export const BottomSheet = ({ 
  isOpen, 
  onClose, 
  children, 
  title 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  children?: React.ReactNode; 
  title?: string;
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-[60]"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 bg-app-elevated rounded-t-3xl z-[70] max-h-[85vh] overflow-y-auto border-t border-app-border/50 shadow-2xl"
          >
            <div className="sticky top-0 bg-app-elevated/95 backdrop-blur z-10 px-6 pt-4 pb-2 flex items-center justify-between border-b border-app-border/30">
               <div className="w-12" /> {/* Spacer */}
               {/* Handle bar */}
               <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-1.5 rounded-full bg-app-border" />
               <h3 className="text-lg font-bold text-app-text mt-2">{title}</h3>
               <button onClick={onClose} className="p-2 -mr-2 text-app-muted hover:text-app-text">
                 <X size={20} />
               </button>
            </div>
            <div className="p-6 pt-2 pb-10">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export const BottomNav = ({ active, onNavigate }: { active: ScreenName, onNavigate: (screen: ScreenName) => void }) => {
    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-app-bg/90 backdrop-blur-lg border-t border-app-border flex items-center justify-center py-3 px-2 pb-6 z-30">
            <button
                onClick={() => onNavigate(ScreenName.HOME)}
                className={`p-2 transition-colors ${active === ScreenName.HOME ? 'text-app-peach' : 'text-app-muted hover:text-app-text'}`}
            >
                <Home size={24} />
            </button>
        </nav>
    );
};