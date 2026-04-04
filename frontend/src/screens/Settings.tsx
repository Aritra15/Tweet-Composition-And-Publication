import { useState } from 'react';
import { Bell, Lock, Moon, Shield, UserCircle2 } from 'lucide-react';
import { Toggle } from '../components/Shared';
import { ScreenName, type User } from '../types';

interface SettingsScreenProps {
  currentUser: User;
  onNavigate: (screen: ScreenName) => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ currentUser, onNavigate }) => {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [privateAccount, setPrivateAccount] = useState(false);
  const [showSensitiveContent, setShowSensitiveContent] = useState(true);

  return (
    <div className="rounded-2xl bg-[#1a1d21]/95 border border-white/10 shadow-[0_18px_45px_rgba(0,0,0,0.38)] overflow-hidden">
      <section className="px-5 pt-5 pb-4 border-b border-white/10 bg-[linear-gradient(180deg,#171a1e_0%,#121417_100%)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-app-peach/80">Preferences</p>
        <h2 className="mt-2 text-2xl font-bold text-app-text">Settings</h2>
        <p className="mt-1 text-sm text-app-muted">Minimal controls for your account and app behavior.</p>
      </section>

      <section className="p-4 space-y-3">
        <div className="rounded-xl border border-white/10 bg-[#15191d] p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
              <UserCircle2 size={18} className="text-app-text" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-app-text truncate">{currentUser.name}</p>
              <p className="text-xs text-app-muted truncate">@{currentUser.handle}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-[#15191d] divide-y divide-white/10">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <Bell size={16} className="text-app-muted" />
              <div>
                <p className="text-sm font-medium text-app-text">Notifications</p>
                <p className="text-xs text-app-muted">Mentions and engagement alerts</p>
              </div>
            </div>
            <Toggle checked={notificationsEnabled} onChange={setNotificationsEnabled} />
          </div>

          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <Lock size={16} className="text-app-muted" />
              <div>
                <p className="text-sm font-medium text-app-text">Private Account</p>
                <p className="text-xs text-app-muted">Only approved followers can view posts</p>
              </div>
            </div>
            <Toggle checked={privateAccount} onChange={setPrivateAccount} />
          </div>

          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <Shield size={16} className="text-app-muted" />
              <div>
                <p className="text-sm font-medium text-app-text">Sensitive Content</p>
                <p className="text-xs text-app-muted">Show media marked as sensitive</p>
              </div>
            </div>
            <Toggle checked={showSensitiveContent} onChange={setShowSensitiveContent} />
          </div>

          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <Moon size={16} className="text-app-muted" />
              <div>
                <p className="text-sm font-medium text-app-text">Theme</p>
                <p className="text-xs text-app-muted">Dark mode is enabled by default</p>
              </div>
            </div>
            <span className="text-xs font-semibold text-app-peach">Dark</span>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={() => onNavigate(ScreenName.HOME)}
            className="rounded-full bg-app-peach px-4 py-2 text-sm font-semibold text-[#111315] hover:brightness-110 transition"
          >
            Done
          </button>
        </div>
      </section>
    </div>
  );
};
