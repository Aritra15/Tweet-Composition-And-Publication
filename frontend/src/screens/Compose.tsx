import React, { useState, useRef } from 'react';
import { X, Image, Smile, BarChart2, Globe, Plus, GripVertical, Trash2, CheckCircle, Lock, AlertTriangle, Users, Feather, Sparkles, Wand2, Hash } from 'lucide-react';
import { motion, Reorder } from 'framer-motion';
import { type Thread, type TweetDraft, type User, AudienceType } from '../types';
import { Avatar, Button, BottomSheet, Toggle, Chip, Input } from '../components/Shared';

interface ComposeProps {
  onBack: () => void;
  onNext: (thread: Thread) => void;
  currentUser: User;
}

const MAX_CHARS = 280;

const PLACEHOLDER_IMAGES = [
    'https://picsum.photos/400/300?random=1',
    'https://picsum.photos/400/300?random=2',
    'https://picsum.photos/400/300?random=3',
    'https://picsum.photos/400/300?random=4',
    'https://picsum.photos/400/300?random=5',
    'https://picsum.photos/400/300?random=6',
];

const EMOJIS = ['😀', '😂', '😍', '🔥', '🚀', '💯', '🤔', '👍', '👎', '🎉', '✨', '💀', '🤡', '👀', '🙌', '💩', '💙', '✅'];

const MOCK_HASHTAGS = ['#design', '#uiux', '#mobile', '#frontend', '#react', '#webdev', '#coding', '#tech'];

export const ComposeScreen: React.FC<ComposeProps> = ({ onBack, onNext, currentUser }) => {
  const [tweets, setTweets] = useState<TweetDraft[]>([
    { id: '1', text: '', media: [] }
  ]);
  const [activeTweetIndex, setActiveTweetIndex] = useState(0);

  // Audience Settings
  const [audience, setAudience] = useState<AudienceType>(AudienceType.EVERYONE);
  const [shareToCircle, setShareToCircle] = useState(false);
  const [isSensitive, setIsSensitive] = useState(false);

  // Sheet States
  const [activeSheet, setActiveSheet] = useState<'media' | 'emoji' | 'poll' | 'audience' | 'ai' | null>(null);

  // Poll State
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);

  // AI State
  const [imagePrompt, setImagePrompt] = useState('');

  // Focus management
  const textareaRefs = useRef<(HTMLTextAreaElement | null)[]>([]);

  const handleAddTweet = () => {
    const newId = Date.now().toString();
    setTweets([...tweets, { id: newId, text: '', media: [] }]);
    setTimeout(() => {
        const idx = tweets.length;
        textareaRefs.current[idx]?.focus();
        setActiveTweetIndex(idx);
    }, 50);
  };

  const handleRemoveTweet = (id: string) => {
    if (tweets.length === 1) return;
    setTweets(tweets.filter(t => t.id !== id));
  };

  const handleTextChange = (id: string, text: string) => {
    setTweets(tweets.map(t => t.id === id ? { ...t, text } : t));
  };

  const handleAddMedia = (url: string) => {
      setTweets(tweets.map((t, i) => 
          i === activeTweetIndex 
          ? { ...t, media: [...t.media, { id: Date.now().toString(), type: 'image', url }] } 
          : t
      ));
      setActiveSheet(null);
  };

  const handleAddEmoji = (emoji: string) => {
      const currentText = tweets[activeTweetIndex].text;
      handleTextChange(tweets[activeTweetIndex].id, currentText + emoji);
  };

  const handleSavePoll = () => {
      const validOptions = pollOptions.filter(o => o.trim() !== '').map((text, i) => ({ id: i.toString(), text }));
      if (pollQuestion && validOptions.length >= 2) {
          setTweets(tweets.map((t, i) => 
            i === activeTweetIndex ? { ...t, poll: { question: pollQuestion, options: validOptions } } : t
          ));
          setPollQuestion('');
          setPollOptions(['', '']);
          setActiveSheet(null);
      }
  };

  // AI Actions
  const handleUseEnhancedText = () => {
    handleTextChange(tweets[activeTweetIndex].id, "This is a clearer, more engaging version of your tweet that captures the audience's attention instantly! ✨");
    setActiveSheet(null);
  };

  const handleGenerateImage = () => {
    // Mock generation
    handleAddMedia(`https://picsum.photos/400/300?seed=${imagePrompt}`);
    setImagePrompt('');
    setActiveSheet(null);
  };

  const handleAddHashtag = (tag: string) => {
    const currentText = tweets[activeTweetIndex].text;
    handleTextChange(tweets[activeTweetIndex].id, currentText + (currentText.length > 0 && !currentText.endsWith(' ') ? ' ' : '') + tag);
  };

  const canProceed = tweets.every(t => t.text.length > 0 && t.text.length <= MAX_CHARS);

  return (
    <motion.div 
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className="fixed inset-0 z-50 bg-app-bg flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-app-border bg-app-bg/95 backdrop-blur">
        <button aria-label="Close" onClick={onBack} className="text-app-text hover:text-app-muted p-2 -ml-2">
          <X size={24} />
        </button>
        <span className="font-semibold text-app-text text-lg">
          {tweets.length > 1 ? 'New Thread' : 'New Tweet'}
        </span>
        <Button 
          variant="primary" 
          size="sm" 
          disabled={!canProceed}
          onClick={() => onNext({ tweets })}
        >
          Next
        </Button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 scroll-smooth">
        <Reorder.Group axis="y" values={tweets} onReorder={setTweets} className="space-y-6">
          {tweets.map((tweet, index) => {
            const remainingChars = MAX_CHARS - tweet.text.length;
            
            return (
            <Reorder.Item key={tweet.id} value={tweet} className="relative">
              <div className="flex gap-3 relative group">
                {/* Connector Line for Thread */}
                {index < tweets.length - 1 && (
                  <div className="absolute left-[20px] top-[50px] bottom-[-24px] w-0.5 bg-app-border z-0" />
                )}

                <div className="shrink-0 z-10 pt-1 flex flex-col items-center gap-2">
                   {tweets.length > 1 && (
                      <div className="cursor-grab active:cursor-grabbing text-app-muted hover:text-app-peach p-1">
                          <GripVertical size={16} />
                      </div>
                   )}
                   <Avatar src={currentUser.avatar} alt="Me" />
                </div>

                <div className="flex-1 min-w-0 bg-app-card rounded-2xl p-4 shadow-sm border border-transparent focus-within:border-app-lavender/30 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                     <div className="flex items-center gap-2 overflow-hidden">
                        <span className="text-xs font-medium text-app-muted shrink-0">
                            {currentUser.handle}
                        </span>
                        {remainingChars < 0 ? (
                            <span className="text-[10px] font-bold text-app-error animate-pulse truncate">
                                Character Limit Exceeded
                            </span>
                        ) : remainingChars < 20 ? (
                            <span className="text-[10px] font-bold text-orange-400 truncate">
                                Approaching Character Limit
                            </span>
                        ) : null}
                     </div>
                     {tweets.length > 1 && (
                         <button 
                            aria-label="Close"
                            onClick={() => handleRemoveTweet(tweet.id)}
                            className="text-app-muted hover:text-app-error p-1 shrink-0 ml-2"
                         >
                            <Trash2 size={16} />
                         </button>
                     )}
                  </div>

                  <textarea
                    ref={el => { textareaRefs.current[index] = el; }}
                    value={tweet.text}
                    onChange={(e) => {
                        handleTextChange(tweet.id, e.target.value);
                        setActiveTweetIndex(index);
                    }}
                    onFocus={() => setActiveTweetIndex(index)}
                    placeholder={index === 0 ? "What's happening?" : "Add another tweet..."}
                    className="w-full bg-transparent text-app-text text-lg placeholder-app-muted outline-none resize-none min-h-[100px]"
                    style={{ lineHeight: '1.5' }}
                  />

                  {/* Media Preview */}
                  {tweet.media.length > 0 && (
                      <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
                          {tweet.media.map(m => (
                              <div key={m.id} className="w-24 h-24 rounded-xl bg-app-elevated relative shrink-0">
                                  <img aria-label="Close" src={m.url} className="w-full h-full object-cover rounded-xl" />
                                  <button 
                                    aria-label="Close"
                                    className="absolute top-1 right-1 bg-black/50 p-1 rounded-full text-white"
                                    onClick={() => {
                                        const newMedia = tweet.media.filter(media => media.id !== m.id);
                                        setTweets(tweets.map(t => t.id === tweet.id ? { ...t, media: newMedia } : t));
                                    }}
                                  >
                                    <X size={12} />
                                  </button>
                              </div>
                          ))}
                      </div>
                  )}

                  {/* Poll Preview */}
                  {tweet.poll && (
                      <div className="mt-3 p-3 rounded-xl border border-app-border bg-app-elevated">
                          <p className="font-semibold text-app-text mb-2">{tweet.poll.question}</p>
                          <div className="space-y-2">
                              {tweet.poll.options.map((opt, i) => (
                                  <div key={i} className="h-8 rounded-lg border border-app-border flex items-center px-3 text-sm text-app-muted">
                                      {opt.text}
                                  </div>
                              ))}
                          </div>
                          <button 
                             onClick={() => setTweets(tweets.map(t => t.id === tweet.id ? { ...t, poll: undefined } : t))}
                             className="mt-2 text-xs text-app-error flex items-center gap-1"
                          >
                             <Trash2 size={12} /> Remove poll
                          </button>
                      </div>
                  )}

                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-app-border/50">
                     <div className="flex items-center gap-3 overflow-hidden">
                       <button 
                          onClick={() => setActiveSheet('audience')}
                          className="text-app-peach text-sm font-medium flex items-center gap-2 px-3 py-1.5 rounded-full border border-app-peach hover:bg-app-peach/10 transition-colors shrink-0"
                       >
                          <Globe size={14} />
                          {audience}
                       </button>
                     </div>
                     
                     <div className={`text-xs font-medium shrink-0 ml-2 ${
                         remainingChars < 0 ? 'text-app-error' : 
                         remainingChars < 20 ? 'text-orange-400' : 'text-app-muted'
                     }`}>
                        {tweet.text.length}/{MAX_CHARS}
                     </div>
                  </div>
                </div>
              </div>
            </Reorder.Item>
          )})}
        </Reorder.Group>

        <div className="ml-[52px] mt-4">
          <button 
            onClick={handleAddTweet}
            className="flex items-center gap-2 text-app-peach hover:text-app-lavender transition-colors py-2 px-3 rounded-xl hover:bg-app-elevated/50"
          >
            <Plus size={20} />
            <span className="font-medium">Add another tweet</span>
          </button>
        </div>
        
        <div className="h-32" />
      </div>

      {/* Sticky Bottom Controls */}
      <div className="absolute bottom-0 left-0 right-0 bg-app-bg border-t border-app-border px-4 py-3 pb-8">
        <div className="flex items-center justify-between max-w-md mx-auto">
           <div className="flex gap-1 flex-1">
              <Button variant="icon" icon={Image} onClick={() => setActiveSheet('media')} />
              <Button variant="icon" icon={Smile} onClick={() => setActiveSheet('emoji')} />
              <Button variant="icon" icon={BarChart2} onClick={() => setActiveSheet('poll')} />
              <Button variant="icon" icon={Sparkles} onClick={() => setActiveSheet('ai')} />
           </div>
           
           <div className="h-6 w-[1px] bg-app-border mx-2" />

           {/* Branding Icon (Replaces Progress Indicator) */}
           <div className="w-8 h-8 rounded-full bg-app-peach flex items-center justify-center">
              <Feather className="text-app-bg w-5 h-5" />
           </div>
        </div>
      </div>

      {/* --- Sheets --- */}

      {/* Media Sheet */}
      <BottomSheet isOpen={activeSheet === 'media'} onClose={() => setActiveSheet(null)} title="Add Media">
          <div className="grid grid-cols-3 gap-3">
              {PLACEHOLDER_IMAGES.map((url, i) => (
                  <button key={i} onClick={() => handleAddMedia(url)} className="aspect-square rounded-xl overflow-hidden hover:opacity-80 transition-opacity">
                      <img src={url} alt="Media" className="w-full h-full object-cover" />
                  </button>
              ))}
          </div>
      </BottomSheet>

      {/* Emoji Sheet */}
      <BottomSheet isOpen={activeSheet === 'emoji'} onClose={() => setActiveSheet(null)} title="Emojis">
          <div className="grid grid-cols-6 gap-2">
              {EMOJIS.map((emoji, i) => (
                  <button key={i} onClick={() => handleAddEmoji(emoji)} className="text-3xl p-2 hover:bg-app-elevated rounded-xl">
                      {emoji}
                  </button>
              ))}
          </div>
      </BottomSheet>

      {/* Poll Sheet */}
      <BottomSheet isOpen={activeSheet === 'poll'} onClose={() => setActiveSheet(null)} title="Create Poll">
          <div className="space-y-4">
              <input 
                  value={pollQuestion}
                  onChange={(e) => setPollQuestion(e.target.value)}
                  placeholder="Ask a question..."
                  className="w-full bg-app-card p-3 rounded-xl border border-app-border focus:border-app-peach outline-none text-app-text text-lg"
              />
              <div className="space-y-3">
                  {pollOptions.map((opt, i) => (
                      <input 
                          key={i}
                          value={opt}
                          onChange={(e) => {
                              const newOpts = [...pollOptions];
                              newOpts[i] = e.target.value;
                              setPollOptions(newOpts);
                          }}
                          placeholder={`Option ${i + 1}`}
                          className="w-full bg-app-elevated p-3 rounded-xl border border-app-border focus:border-app-lavender outline-none text-app-text"
                      />
                  ))}
              </div>
              <button 
                 onClick={() => setPollOptions([...pollOptions, ''])}
                 className="text-app-peach font-medium flex items-center gap-1"
              >
                  <Plus size={18} /> Add option
              </button>
              <Button onClick={handleSavePoll} className="w-full mt-4">Add Poll</Button>
          </div>
      </BottomSheet>

      {/* Audience Sheet */}
      <BottomSheet isOpen={activeSheet === 'audience'} onClose={() => setActiveSheet(null)} title="Audience">
          <div className="space-y-1 mb-6">
              <h4 className="text-xs font-bold text-app-muted uppercase tracking-wider mb-2">Who can reply?</h4>
              {[AudienceType.EVERYONE, AudienceType.FOLLOW, AudienceType.MENTIONED].map((type) => (
                  <button
                    key={type}
                    onClick={() => setAudience(type)}
                    className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${
                        audience === type 
                        ? 'bg-app-peach/10 border-app-peach' 
                        : 'bg-app-card border-app-border hover:bg-app-elevated'
                    }`}
                  >
                     <div className="flex items-center gap-3">
                         <div className={`p-2 rounded-full ${audience === type ? 'bg-app-peach text-app-bg' : 'bg-app-elevated text-app-muted'}`}>
                             {type === AudienceType.EVERYONE ? <Globe size={20} /> : type === AudienceType.FOLLOW ? <Users size={20} /> : <Lock size={20} />}
                         </div>
                         <span className={`font-medium text-lg ${audience === type ? 'text-app-peach' : 'text-app-text'}`}>{type}</span>
                     </div>
                     {audience === type && <CheckCircle size={20} className="text-app-peach fill-app-peach/20" />}
                  </button>
              ))}
          </div>
          
          <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-app-card rounded-xl border border-app-border">
                  <div className="flex items-center gap-3">
                      <div className="p-2 bg-app-lime/10 text-app-lime rounded-full">
                          <CheckCircle size={20} />
                      </div>
                      <div>
                          <p className="font-medium text-app-text">Share to Circle</p>
                          <p className="text-sm text-app-muted">Only visible to your Circle members</p>
                      </div>
                  </div>
                  <Toggle checked={shareToCircle} onChange={setShareToCircle} />
              </div>

              <div className="flex items-center justify-between p-4 bg-app-card rounded-xl border border-app-border">
                  <div className="flex items-center gap-3">
                      <div className="p-2 bg-amber-500/10 text-amber-500 rounded-full">
                          <AlertTriangle size={20} />
                      </div>
                      <div>
                          <p className="font-medium text-app-text">Sensitive content</p>
                          <p className="text-sm text-app-muted">Mark this tweet as containing sensitive material</p>
                      </div>
                  </div>
                  <Toggle checked={isSensitive} onChange={setIsSensitive} />
              </div>
          </div>
      </BottomSheet>

      {/* AI Tools Sheet */}
      <BottomSheet isOpen={activeSheet === 'ai'} onClose={() => setActiveSheet(null)} title="AI Tools">
          <div className="space-y-6">
              {/* Enhance Text */}
              <div className="space-y-3">
                  <div className="flex items-center gap-2 text-app-text font-bold">
                      <Wand2 size={18} className="text-app-peach" />
                      <h4>Enhance Text</h4>
                  </div>
                  <div className="p-3 bg-app-card border border-app-border rounded-xl">
                      <p className="text-app-text text-sm italic opacity-90">"This is a clearer, more engaging version of your tweet that captures the audience's attention instantly! ✨"</p>
                  </div>
                  <Button variant="secondary" size="sm" onClick={handleUseEnhancedText} className="w-full">
                      Use enhanced text
                  </Button>
              </div>

              <div className="h-[1px] bg-app-border" />

              {/* Generate Image */}
              <div className="space-y-3">
                  <div className="flex items-center gap-2 text-app-text font-bold">
                      <Image size={18} className="text-app-peach" />
                      <h4>Generate Image</h4>
                  </div>
                  <Input 
                      value={imagePrompt} 
                      onChange={setImagePrompt} 
                      placeholder="Describe the image you want..." 
                      className="text-sm h-10"
                  />
                  <Button variant="secondary" size="sm" onClick={handleGenerateImage} disabled={!imagePrompt.trim()} className="w-full">
                      Generate Image
                  </Button>
              </div>

              <div className="h-[1px] bg-app-border" />

              {/* Hashtag Suggestions */}
              <div className="space-y-3">
                  <div className="flex items-center gap-2 text-app-text font-bold">
                      <Hash size={18} className="text-app-peach" />
                      <h4>Hashtag Suggestions</h4>
                  </div>
                  <div className="flex flex-wrap gap-2">
                      {MOCK_HASHTAGS.map(tag => (
                          <Chip key={tag} label={tag} onClick={() => handleAddHashtag(tag)} />
                      ))}
                  </div>
              </div>
          </div>
      </BottomSheet>
    </motion.div>
  );
};