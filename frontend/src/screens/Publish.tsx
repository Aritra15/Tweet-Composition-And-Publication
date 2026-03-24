import React, { useState } from 'react';
import { X, Clock, Feather } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button, Toast } from '../components/Shared';

interface PublishProps {
  onBack: () => void;
  onPublish: () => void;
}

export const PublishScreen: React.FC<PublishProps> = ({ onBack, onPublish }) => {
  const [showToast, setShowToast] = useState(false);

  const handleFinish = () => {
    setShowToast(true);
    setTimeout(() => {
      onPublish();
    }, 2000);
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-[2px] flex items-center justify-center p-2 sm:p-4"
      >
        <div className="w-full max-w-xl bg-[#101214] border border-white/10 rounded-3xl shadow-[0_24px_80px_rgba(0,0,0,0.6)] overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#101214]/95 backdrop-blur shrink-0">
            <button onClick={onBack} className="text-white/90 hover:text-white text-l font-medium px-1 py-1">
              Cancel
            </button>
            <h2 className="font-semibold text-white text-lg">Publish</h2>
            <button aria-label="Close" onClick={onBack} className="text-white/70 hover:text-white p-1 rounded-full hover:bg-white/10">
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 px-6 py-6 overflow-y-auto">
              <div className="h-full flex flex-col items-center justify-center py-2 animate-fade-in">
                <div className="flex flex-col items-center mb-8">
                  <div className="w-20 h-20 rounded-full bg-app-peach flex items-center justify-center mb-6 text-app-bg shadow-lg shadow-app-peach/20">
                    <Clock size={40} />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">Ready to post</h3>
                  <p className="text-white/65 text-center max-w-xs">
                    Your post is ready to be published
                  </p>
                </div>

                <div className="w-full max-w-md bg-white/5 border border-white/15 rounded-xl p-4 flex items-center gap-3 text-sm text-white/85">
                  <div className="w-2 h-2 rounded-full bg-app-lime shrink-0" />
                  Will be published now
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 flex items-center justify-between pl-5 pr-5 pt-4 pb-5 border-t border-white/10 bg-[#101214]/95 backdrop-blur">
              <div className="w-8 h-8 rounded-full bg-app-peach flex items-center justify-center">
                <Feather className="text-app-bg w-5 h-5" />
              </div>
              <Button 
                variant="primary" 
                size="sm" 
                onClick={handleFinish} 
                className="!rounded-full !px-4 !py-1.5 !text-sm"
              >
                Publish
              </Button>
            </div>

            {showToast && <Toast message="Published successfully!" />}
          </div>
        </div>
      </motion.div>
    </>
  );
};
