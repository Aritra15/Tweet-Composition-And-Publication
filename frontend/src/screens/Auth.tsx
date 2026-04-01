import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Feather, Mail, Lock, User, Eye, EyeOff, ArrowRight, Loader } from 'lucide-react';
import type { User as AppUser } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';

interface AuthScreenProps {
  onAuthSuccess: (user: AppUser, token: string) => void;
}

type Tab = 'login' | 'register';

interface FieldProps {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  icon: React.ReactNode;
  rightElement?: React.ReactNode;
  autoComplete?: string;
}

const Field: React.FC<FieldProps> = ({ label, type = 'text', value, onChange, placeholder, icon, rightElement, autoComplete }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-xs font-semibold text-app-muted uppercase tracking-wider pl-1">{label}</label>
    <div className="relative flex items-center">
      <span className="absolute left-4 text-app-muted pointer-events-none">{icon}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="w-full bg-app-elevated border border-app-border text-app-text placeholder-app-muted rounded-xl pl-11 pr-11 py-3.5 text-sm outline-none focus:border-app-peach/60 focus:ring-1 focus:ring-app-peach/30 transition-all duration-200"
      />
      {rightElement && (
        <span className="absolute right-4">{rightElement}</span>
      )}
    </div>
  </div>
);

export const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthSuccess }) => {
  const [tab, setTab] = useState<Tab>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [userHandle, setUserHandle] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const switchTab = (next: Tab) => {
    setTab(next);
    setError(null);
    setEmail('');
    setPassword('');
    setUsername('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields.');
      return;
    }
    if (tab === 'register' && !username.trim()) {
      setError('Please enter a username.');
      return;
    }
    if (tab === 'register' && !userHandle.trim()) {
      setError('Please enter a user handle.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      const endpoint = tab === 'login' ? '/api/v1/auth/login' : '/api/v1/auth/register';
      const body = tab === 'login'
        ? { email: email.trim(), password }
        : { username: username.trim(), userHandle: userHandle.trim(), profilePictureUrl: null, email: email.trim(), password };

      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(typeof data?.detail === 'string' ? data.detail : 'Something went wrong.');
        return;
      }

      const appUser: AppUser = {
        id: data.user.id,
        name: data.user.username,
        handle: data.user.user_handle,
        avatar: data.user.profile_picture_url !== null ? data.user.profile_picture_url : `https://picsum.photos/seed/${data.user.id}/150/150`,
      };

      onAuthSuccess(appUser, data.token);
    } catch {
      setError('Unable to reach the server. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  const eyeButton = (
    <button
      type="button"
      onClick={() => setShowPassword((p) => !p)}
      className="text-app-muted hover:text-app-text transition-colors"
      tabIndex={-1}
    >
      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
    </button>
  );

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center px-4 py-12 bg-app-bg">

      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center gap-3 mb-10"
      >
        <div className="w-14 h-14 rounded-2xl bg-app-peach flex items-center justify-center shadow-lg shadow-app-peach/20">
          <Feather className="text-app-bg w-7 h-7" />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-app-text tracking-tight">Tweet Composer</h1>
          <p className="text-app-muted text-sm mt-1">Craft and publish your thoughts</p>
        </div>
      </motion.div>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.1 }}
        className="w-full max-w-sm bg-app-card border border-app-border rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Tabs */}
        <div className="flex border-b border-app-border">
          {(['login', 'register'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => switchTab(t)}
              className={`flex-1 py-4 text-sm font-semibold transition-colors relative ${
                tab === t ? 'text-app-text' : 'text-app-muted hover:text-app-text'
              }`}
            >
              {t === 'login' ? 'Sign In' : 'Create Account'}
              {tab === t && (
                <motion.div
                  layoutId="tab-indicator"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-app-peach"
                />
              )}
            </button>
          ))}
        </div>

        {/* Form */}
        <div className="p-6">
          <AnimatePresence mode="wait">
            <motion.form
              key={tab}
              initial={{ opacity: 0, x: tab === 'login' ? -16 : 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: tab === 'login' ? 16 : -16 }}
              transition={{ duration: 0.2 }}
              onSubmit={handleSubmit}
              className="flex flex-col gap-4"
            >
              {tab === 'register' && (
                <Field
                  label="Username"
                  value={username}
                  onChange={setUsername}
                  placeholder="yourusername"
                  icon={<User size={16} />}
                  autoComplete="username"
                />
              )}

              {tab === 'register' && (
                <Field
                  label="User Handle"
                  value={userHandle}
                  onChange={setUserHandle}
                  placeholder="yourhandle"
                  icon={<User size={16} />}
                  autoComplete="user_handle"
                />
              )}

              <Field
                label="Email"
                type="email"
                value={email}
                onChange={setEmail}
                placeholder="you@example.com"
                icon={<Mail size={16} />}
                autoComplete="email"
              />

              <Field
                label="Password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={setPassword}
                placeholder="••••••••"
                icon={<Lock size={16} />}
                rightElement={eyeButton}
                autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
              />

              {/* Error */}
              <AnimatePresence>
                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-app-error text-xs px-1"
                  >
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="mt-1 w-full flex items-center justify-center gap-2 bg-app-peach text-app-bg font-semibold py-3.5 rounded-xl hover:brightness-110 active:brightness-95 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-lg shadow-app-peach/20"
              >
                {loading
                  ? <Loader size={18} className="animate-spin" />
                  : (
                    <>
                      {tab === 'login' ? 'Sign In' : 'Create Account'}
                      <ArrowRight size={16} />
                    </>
                  )
                }
              </button>
            </motion.form>
          </AnimatePresence>

          {/* Switch tab hint */}
          <p className="text-center text-app-muted text-xs mt-5">
            {tab === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => switchTab(tab === 'login' ? 'register' : 'login')}
              className="text-app-peach hover:underline font-medium"
            >
              {tab === 'login' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </motion.div>

      {/* Footer */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="text-app-muted text-xs mt-8 text-center"
      >
        CSE-326 · Tweet Composition &amp; Publication
      </motion.p>
    </div>
  );
};
