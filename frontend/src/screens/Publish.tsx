import React, { useState } from 'react';
import { X, Clock } from 'lucide-react';
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
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" />
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed inset-x-0 bottom-0 top-20 z-50 bg-app-bg rounded-t-3xl border-t border-app-border flex flex-col shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-app-border shrink-0">
          <h2 className="font-bold text-app-text text-xl">Publish</h2>
          <button onClick={onBack} className="text-app-muted hover:text-app-text p-1 rounded-full hover:bg-app-elevated">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 flex flex-col min-h-0">
            {/* Content Area - Centered */}
            <div className="flex-1 px-6 overflow-y-auto">
              <div className="h-full flex flex-col items-center justify-center pb-12 animate-fade-in">
                  <div className="flex flex-col items-center mb-8">
                      <div className="w-20 h-20 rounded-full bg-app-peach flex items-center justify-center mb-6 text-app-bg shadow-lg shadow-app-peach/20">
                          <Clock size={40} />
                      </div>
                      <h3 className="text-2xl font-bold text-app-text mb-2">Ready to post</h3>
                      <p className="text-app-muted text-center max-w-xs">
                          Your post is ready to be published
                      </p>
                  </div>

                  <div className="w-full max-w-md bg-app-card/30 border border-app-border rounded-xl p-4 flex items-center gap-3 text-sm text-app-text">
                       <div className="w-2 h-2 rounded-full bg-app-lime shrink-0" />
                       Will be published now
                  </div>
              </div>
            </div>
        </div>

        <div className="mt-auto p-6 bg-app-bg border-t border-app-border shrink-0">
            <Button variant="primary" size="lg" onClick={handleFinish} className="w-full">
                Publish Now
            </Button>
        </div>

        {showToast && <Toast message="Published successfully!" />}
      </motion.div>
    </>
  );
};
