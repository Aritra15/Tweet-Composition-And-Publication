import { Bookmark, ChevronRight, HelpCircle, LogOut, Settings, User as UserIcon } from "lucide-react";
import type { User } from "../types";
import { motion } from 'framer-motion';

interface ProfileMenuProps {
  user: User;
  onClose: () => void;
  onLogout: () => void;
  onOpenProfile: () => void;
}

// --- Profile Menu ---

const MENU_ITEMS = [
  { icon: UserIcon,   label: 'Profile',        sub: 'View your public profile' },
  { icon: Bookmark,   label: 'Saved',           sub: 'Bookmarks & drafts' },
  { icon: Settings,   label: 'Settings',        sub: 'Account & preferences' },
  { icon: HelpCircle, label: 'Help & Support',  sub: 'FAQs and contact' },
];

const ProfileMenu: React.FC<ProfileMenuProps> = ({ user, onClose, onLogout, onOpenProfile }: ProfileMenuProps) => {
  const defaultAvatar = `https://www.pinterest.com/ideas/blank-profile-picture-icon/959291402616/`;

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: -8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -8 }}
        transition={{ type: 'spring', damping: 24, stiffness: 320 }}
        className="fixed top-20 right-4 z-50 w-72 bg-app-elevated border border-app-border rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* User info */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-app-border bg-app-card">
          <img
            src={user.avatar !== null ? user.avatar : defaultAvatar}
            alt={user.name}
            className="w-11 h-11 rounded-full border border-app-border object-cover"
          />
          <div className="flex-1 min-w-0">
            <p className="text-app-text font-semibold text-sm truncate">{user.name}</p>
            <p className="text-app-muted text-xs truncate">@{user.handle}</p>
          </div>
        </div>

        {/* Menu items */}
        <div className="py-1">
          {MENU_ITEMS.map(({ icon: Icon, label, sub }) => (
            <button
              key={label}
              onClick={() => {
                if (label === 'Profile') {
                  onOpenProfile();
                  return;
                }

                onClose();
              }}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-app-card transition-colors group"
            >
              <div className="w-8 h-8 rounded-lg bg-app-card group-hover:bg-app-elevated flex items-center justify-center transition-colors shrink-0">
                <Icon size={15} className="text-app-muted group-hover:text-app-peach transition-colors" />
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-app-text text-sm font-medium">{label}</p>
                <p className="text-app-muted text-xs truncate">{sub}</p>
              </div>
              <ChevronRight size={14} className="text-app-border group-hover:text-app-muted transition-colors" />
            </button>
          ))}
        </div>

        {/* Logout */}
        <div className="border-t border-app-border py-1">
          <button
            onClick={() => { onClose(); onLogout(); }}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-app-error/10 transition-colors group"
          >
            <div className="w-8 h-8 rounded-lg bg-app-card group-hover:bg-app-error/10 flex items-center justify-center transition-colors shrink-0">
              <LogOut size={15} className="text-app-muted group-hover:text-app-error transition-colors" />
            </div>
            <p className="text-app-text group-hover:text-app-error text-sm font-medium transition-colors">Sign Out</p>
          </button>
        </div>
      </motion.div>
    </>
  );
}

export default ProfileMenu;