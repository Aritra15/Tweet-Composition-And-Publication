import React, { useEffect, useRef, useState } from 'react';
import { Feather, ArrowLeft, Home } from 'lucide-react';
import { Avatar } from '../components/Shared';
import { ScreenName } from '../types';
import Feed from '../components/Feed';

interface HomeProps {
  onNavigate: (screen: ScreenName) => void;
}

const MOCK_TWEETS = [
  {
    id: '1',
    author: { id: "a", name: 'Alex Rivera', handle: '@arivera', avatar: 'https://picsum.photos/100/100' },
    content: 'Just deployed the new dark mode UI. The contrast ratios are finally perfect! 🎨✨ #design #uiux',
    time: '2h',
    likes: 142,
    replies: 12,
    reposts: 8,
    media: [ 'https://picsum.photos/600/300/?1' , "https://picsum.photos/600/300/?2", "https://picsum.photos/600/300/?3" ]
  },
  {
    id: '2',
    author: { id: "b", name: 'Sarah Chen', handle: '@sarahc_dev', avatar: 'https://picsum.photos/101/101' },
    content: 'Unpopular opinion: TypeScript enums are actually good if you use them correctly. 🛡️',
    time: '4h',
    likes: 856,
    replies: 124,
    reposts: 45,
    media: []
  },
  {
    id: '3',
    isThread: true,
    tweets: [
      {
        id: '3a',
        author: { id: "c", name: 'Design Daily', handle: '@designdaily', avatar: 'https://picsum.photos/102/102' },
        content: 'Top 5 tools for mobile prototyping in 2025. Thread 🧵 👇',
        time: '6h',
        likes: 2100,
        replies: 89,
        reposts: 320,
        media: []
      },
      {
        id: '3b',
        author: { id: "d", name: 'Design Daily', handle: '@designdaily', avatar: 'https://picsum.photos/102/102' },
        content: '1. Framer - Still the king of interactions.\n2. Figma - The standard.\n3. ProtoPie - For complex sensors.',
        time: '6h',
        likes: 1800,
        replies: 45,
        reposts: 120,
        media: []
      },
      {
        id: '3c',
        author: { id: "f", name: 'Design Daily', handle: '@designdaily', avatar: 'https://picsum.photos/102/102' },
        content: '',
        time: '6h',
        likes: 1300,
        replies: 48,
        reposts: 99,
        media: [ "https://picsum.photos/600/300/?4" ]
      }
    ]
  },
];

export const HomeScreen: React.FC<HomeProps> = ({ onNavigate }) => {
  const [ tweets, setTweets ] = useState(MOCK_TWEETS);
  const [ isShowingThread, setIsShowingThread ] = useState(false);
  const [ activeTab, setActiveTab ] = useState<'foryou' | 'following'>('foryou');

  const inputRef = useRef<HTMLDivElement | null>(null);
  const [showFAB, setShowFAB] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        // If NOT visible → show FAB
        setShowFAB(!entry.isIntersecting);
      },
      {
        threshold: 0, // triggers when even a tiny bit leaves viewport
        rootMargin: "-50px",
      }
    );

    if (inputRef.current) {
      observer.observe(inputRef.current);
    }

    window.scrollTo({ top: 0, behavior: 'instant' });

    return () => {
      if (inputRef.current) {
        observer.unobserve(inputRef.current);
      }
    };
  }, [isShowingThread]);


  const goToHomeFeed = () => {
    onNavigate(ScreenName.HOME);
    setIsShowingThread(false);
    setTweets(MOCK_TWEETS);
  };

  const handleOpenThread = (twts: any) => {
    setIsShowingThread(true);
    setTweets(twts);
    setShowFAB(true); // Ensure FAB is shown when thread is open
  }

  return (
    <div className="min-h-screen bg-app-bg relative">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-app-bg/80 backdrop-blur-md border-b border-app-border px-4 py-3 flex items-center justify-between">
        <div className="w-8 h-8 rounded-full bg-app-peach flex items-center justify-center">
           {!isShowingThread ? <Feather className="text-app-bg w-5 h-5" /> : <ArrowLeft className="text-app-bg w-5 h-5" onClick={goToHomeFeed} />}
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

      {/* New Post Input */}
      {!isShowingThread && 
      <article 
        ref={inputRef}
        className="border-b border-app-border p-4 hover:bg-app-card/30 transition-colors cursor-pointer"
      >
        <div className="flex items-center bg-app-bg rounded-xl p-3 gap-3 shadow-md" style={{padding: "0"}}>
          {/* Avatar */}
          <div className="shrink-0 z-10">
            <Avatar src="https://picsum.photos/150/150" alt="Me" />
          </div>

          {/* Input */}
          <p 
            className="flex-1 text-app-muted text-[15px] leading-relaxed whitespace-pre-wrap cursor-text"
            onClick={() => onNavigate(ScreenName.COMPOSE)}
          >
            What's new?
          </p>

          {/* Post button */}
          <button 
            onClick={() => onNavigate(ScreenName.COMPOSE)}
            className="bg-app-peach text-app-bg font-semibold px-4 py-1 rounded-full hover:brightness-110 active:brightness-95 transition"
          >
            Post
          </button>
        </div>
      </article>}

      {/* Feed */}
      <Feed tweetItems={tweets} handleOpenThread={handleOpenThread} />

      {/* FAB */}
      {showFAB && <button
        aria-label="Close" 
        onClick={() => onNavigate(ScreenName.COMPOSE)}
        className="fixed bottom-8 right-8 w-16 h-16 bg-app-peach rounded-full flex items-center justify-center shadow-lg shadow-app-peach/20 hover:scale-110 active:scale-95 transition-transform z-40"
      >
        <Feather className="text-app-bg w-7 h-7" />
      </button>}
    </div>
  );
};