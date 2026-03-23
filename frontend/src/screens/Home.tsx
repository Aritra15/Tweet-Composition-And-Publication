import React, { useState } from 'react';
import { Feather, Heart, MessageCircle, Repeat, Share } from 'lucide-react';
import { Avatar, BottomNav } from '../components/Shared';
import { ScreenName } from '../types';

interface HomeProps {
  onNavigate: (screen: ScreenName) => void;
}

const MOCK_TWEETS = [
  {
    id: '1',
    author: { name: 'Alex Rivera', handle: '@arivera', avatar: 'https://picsum.photos/100/100' },
    content: 'Just deployed the new dark mode UI. The contrast ratios are finally perfect! 🎨✨ #design #uiux',
    time: '2h',
    likes: 142,
    replies: 12,
    reposts: 8,
    media: 'https://picsum.photos/600/300'
  },
  {
    id: '2',
    author: { name: 'Sarah Chen', handle: '@sarahc_dev', avatar: 'https://picsum.photos/101/101' },
    content: 'Unpopular opinion: TypeScript enums are actually good if you use them correctly. 🛡️',
    time: '4h',
    likes: 856,
    replies: 124,
    reposts: 45,
    media: null
  },
  {
    id: '3',
    isThread: true,
    tweets: [
      {
        id: '3a',
        author: { name: 'Design Daily', handle: '@designdaily', avatar: 'https://picsum.photos/102/102' },
        content: 'Top 5 tools for mobile prototyping in 2025. Thread 🧵 👇',
        time: '6h',
        likes: 2100,
        replies: 89,
        reposts: 320,
        media: null
      },
      {
        id: '3b',
        author: { name: 'Design Daily', handle: '@designdaily', avatar: 'https://picsum.photos/102/102' },
        content: '1. Framer - Still the king of interactions.\n2. Figma - The standard.\n3. ProtoPie - For complex sensors.',
        time: '6h',
        likes: 1800,
        replies: 45,
        reposts: 120,
        media: null
      }
    ]
  }
];

const TweetActions = ({ likes, replies, reposts }: { likes: number, replies: number, reposts: number }) => (
  <div className="flex items-center justify-between text-app-muted max-w-md pr-4 mt-3">
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
    <button className="flex items-center gap-1.5 group hover:text-app-lavender transition-colors">
      <Share size={18} className="group-hover:stroke-app-lavender" />
    </button>
  </div>
);

export const HomeScreen: React.FC<HomeProps> = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState<'foryou' | 'following'>('foryou');

  return (
    <div className="min-h-screen bg-app-bg pb-20 relative">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-app-bg/80 backdrop-blur-md border-b border-app-border px-4 py-3 flex items-center justify-between">
        <div className="w-8 h-8 rounded-full bg-app-peach flex items-center justify-center">
           <Feather className="text-app-bg w-5 h-5" />
        </div>
        
        <div className="flex gap-6">
          <button 
            onClick={() => setActiveTab('foryou')}
            className={`font-semibold text-[15px] relative py-2 ${activeTab === 'foryou' ? 'text-app-text' : 'text-app-muted'}`}
          >
            For You
            {activeTab === 'foryou' && <div className="absolute bottom-0 left-0 right-0 h-1 rounded-full bg-app-peach" />}
          </button>
          <button 
             onClick={() => setActiveTab('following')}
             className={`font-semibold text-[15px] relative py-2 ${activeTab === 'following' ? 'text-app-text' : 'text-app-muted'}`}
          >
            Following
            {activeTab === 'following' && <div className="absolute bottom-0 left-0 right-0 h-1 rounded-full bg-app-peach" />}
          </button>
        </div>

        <Avatar src="https://picsum.photos/150/150" alt="Me" size="sm" />
      </header>

      {/* Feed */}
      <div className="flex flex-col">
        {MOCK_TWEETS.map((item: any) => {
          if (item.isThread) {
            return (
              <div key={item.id} className="border-b border-app-border hover:bg-app-card/10 transition-colors pb-2">
                {item.tweets.map((tweet: any, index: number) => (
                  <article key={tweet.id} className="p-4 relative">
                    {index < item.tweets.length - 1 && (
                      <div className="absolute left-[38px] top-[60px] bottom-[-20px] w-0.5 bg-app-border" />
                    )}
                    <div className="flex gap-3">
                      <div className="shrink-0 z-10">
                        <Avatar src={tweet.author.avatar} alt={tweet.author.name} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="font-bold text-app-text truncate">{tweet.author.name}</span>
                          <span className="text-app-muted truncate">{tweet.author.handle}</span>
                          <span className="text-app-muted text-sm">· {tweet.time}</span>
                        </div>
                        <p className="text-app-text text-[15px] leading-relaxed whitespace-pre-wrap">
                          {tweet.content}
                        </p>
                        <TweetActions likes={tweet.likes} replies={tweet.replies} reposts={tweet.reposts} />
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            );
          }

          const tweet = item;
          return (
            <article key={tweet.id} className="border-b border-app-border p-4 hover:bg-app-card/30 transition-colors cursor-pointer">
              <div className="flex gap-3">
                <div className="shrink-0">
                  <Avatar src={tweet.author.avatar} alt={tweet.author.name} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="font-bold text-app-text truncate">{tweet.author.name}</span>
                    <span className="text-app-muted truncate">{tweet.author.handle}</span>
                    <span className="text-app-muted text-sm">· {tweet.time}</span>
                  </div>
                  
                  <p className="text-app-text text-[15px] leading-relaxed whitespace-pre-wrap mb-3">
                    {tweet.content}
                  </p>

                  {tweet.media && (
                    <div className="mb-3 rounded-2xl overflow-hidden border border-app-border">
                      <img src={tweet.media} alt="Tweet media" className="w-full h-auto object-cover max-h-[300px]" />
                    </div>
                  )}

                  <TweetActions likes={tweet.likes} replies={tweet.replies} reposts={tweet.reposts} />
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* Shared Bottom Nav */}
      <BottomNav active={ScreenName.HOME} onNavigate={onNavigate} />

      {/* FAB */}
      <button 
        onClick={() => onNavigate(ScreenName.COMPOSE)}
        className="fixed bottom-24 right-4 w-14 h-14 bg-app-peach rounded-full flex items-center justify-center shadow-lg shadow-app-peach/20 hover:scale-110 active:scale-95 transition-transform z-40"
      >
        <Feather className="text-app-bg w-7 h-7" />
      </button>
    </div>
  );
};