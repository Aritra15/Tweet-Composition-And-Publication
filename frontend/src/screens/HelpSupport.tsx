import { useMemo, useState } from 'react';
import { ArrowLeft, LifeBuoy, MessageSquareWarning, Send, ShieldCheck } from 'lucide-react';
import { Toast } from '../components/Shared';
import { ScreenName, type User } from '../types';

interface HelpSupportScreenProps {
  currentUser: User;
  onNavigate: (screen: ScreenName) => void;
}

type LocalTicket = {
  id: string;
  category: string;
  subject: string;
  message: string;
  status: 'open' | 'in_progress' | 'resolved';
  createdAt: string;
};

const SUPPORT_STORAGE_KEY = 'support_tickets_local_v1';

const FAQ_ITEMS = [
  {
    question: 'How do I post a thread?',
    answer: 'Open Compose, add multiple tweet blocks using Add to thread, then publish. The app groups them in feed as one conversation.',
  },
  {
    question: 'Why is my media upload failing?',
    answer: 'Large files or unsupported formats can fail. Try image/png, image/jpeg, video/mp4, or a smaller file size.',
  },
  {
    question: 'How can I delete a post?',
    answer: 'Open the post menu from the three-dot action on your own post and choose Delete.',
  },
];

const loadTickets = (): LocalTicket[] => {
  const raw = localStorage.getItem(SUPPORT_STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as LocalTicket[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const HelpSupportScreen: React.FC<HelpSupportScreenProps> = ({ currentUser, onNavigate }) => {
  const [category, setCategory] = useState('Bug');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [tickets, setTickets] = useState<LocalTicket[]>(loadTickets);

  const openTickets = useMemo(() => tickets.filter((ticket) => ticket.status !== 'resolved'), [tickets]);

  const submitTicket = () => {
    if (!subject.trim() || !message.trim()) {
      setToast('Subject and message are required');
      return;
    }

    const nextTicket: LocalTicket = {
      id: crypto.randomUUID(),
      category,
      subject: subject.trim(),
      message: message.trim(),
      status: 'open',
      createdAt: new Date().toISOString(),
    };

    const nextTickets = [nextTicket, ...tickets];
    setTickets(nextTickets);
    localStorage.setItem(SUPPORT_STORAGE_KEY, JSON.stringify(nextTickets));

    setSubject('');
    setMessage('');
    setToast('Support ticket submitted');
  };

  return (
    <div className="rounded-xl mb-3 bg-[#1a1d21] border border-white/10 relative overflow-hidden">
      <section className="px-5 py-5 border-b border-white/10 bg-[linear-gradient(160deg,#1b1f26_0%,#11151b_100%)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 text-cyan-300 text-xs font-semibold uppercase tracking-[0.12em]">
              <LifeBuoy size={14} /> Help Center
            </div>
            <h2 className="mt-2 text-2xl font-bold text-white">Help & Support</h2>
            <p className="mt-1 text-sm text-white/70">Ask questions, report issues, and track your submitted requests.</p>
          </div>

          <button
            title="Back"
            onClick={() => onNavigate(ScreenName.HOME)}
            className="shrink-0 rounded-full border border-white/15 bg-black/20 p-2 text-white/80 hover:text-white hover:bg-black/35 transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-4 p-4">
        <div className="rounded-2xl border border-white/10 bg-[#14181d] p-4">
          <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-app-muted">Frequently Asked Questions</h3>
          <div className="mt-3 space-y-3">
            {FAQ_ITEMS.map((faq) => (
              <div key={faq.question} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <p className="text-sm font-semibold text-white">{faq.question}</p>
                <p className="mt-1 text-sm text-white/70 leading-relaxed">{faq.answer}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200 flex items-start gap-2">
            <ShieldCheck size={16} className="mt-0.5" />
            <p>Security issues should be marked as Security in the ticket category for priority handling.</p>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#14181d] p-4">
          <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-app-muted">Create Support Ticket</h3>
          <p className="mt-1 text-xs text-white/60">Signed in as @{currentUser.handle}</p>

          <div className="mt-3 space-y-3">
            <label className="block">
              <span className="text-xs text-white/70">Category</span>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="mt-1 w-full rounded-lg border border-white/15 bg-[#0f1318] px-3 py-2 text-sm text-white"
              >
                <option>Bug</option>
                <option>Feature Request</option>
                <option>Account</option>
                <option>Security</option>
              </select>
            </label>

            <label className="block">
              <span className="text-xs text-white/70">Subject</span>
              <input
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                className="mt-1 w-full rounded-lg border border-white/15 bg-[#0f1318] px-3 py-2 text-sm text-white"
                placeholder="Short summary"
              />
            </label>

            <label className="block">
              <span className="text-xs text-white/70">Message</span>
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                className="mt-1 min-h-[110px] w-full rounded-lg border border-white/15 bg-[#0f1318] px-3 py-2 text-sm text-white resize-y"
                placeholder="Describe the issue in detail"
              />
            </label>

            <button
              onClick={submitTicket}
              className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-app-peach px-4 py-2 text-sm font-semibold text-[#111315] hover:brightness-110 transition"
            >
              <Send size={14} /> Submit Ticket
            </button>
          </div>

          <div className="mt-4">
            <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-app-muted">Open Tickets</h4>
            <div className="mt-2 space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {openTickets.length === 0 && (
                <div className="rounded-lg border border-dashed border-white/20 p-3 text-xs text-white/55">
                  No open tickets yet.
                </div>
              )}

              {openTickets.map((ticket) => (
                <div key={ticket.id} className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-white truncate">{ticket.subject}</p>
                    <span className="text-[10px] uppercase tracking-[0.08em] text-amber-300">{ticket.status}</span>
                  </div>
                  <p className="mt-1 text-xs text-white/60 line-clamp-2">{ticket.message}</p>
                  <p className="mt-1 text-[11px] text-white/45 inline-flex items-center gap-1">
                    <MessageSquareWarning size={12} /> {ticket.category}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {toast && <Toast message={toast} type={toast.includes('required') ? 'error' : 'success'} />}
    </div>
  );
};
