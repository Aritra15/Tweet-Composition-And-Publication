import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { HomeScreen } from './screens/Home';
import { ComposeScreen } from './screens/Compose';
import { PublishScreen } from './screens/Publish';
import { ScreenName, type Thread } from './types';
import './App.css';

const MOCK_USER = {
  id: 'me',
  name: 'Demo User',
  handle: '@demo_user',
  avatar: 'https://picsum.photos/150/150',
};

function App() {
  const [currentScreen, setCurrentScreen] = useState<ScreenName>(ScreenName.HOME);
  const [_draftThread, setDraftThread] = useState<Thread | null>(null);

  const navigate = (screen: ScreenName) => setCurrentScreen(screen);

  const handleComposeNext = (thread: Thread) => {
    setDraftThread(thread);
    navigate(ScreenName.PUBLISH);
  };

  const handlePublishComplete = () => {
    setDraftThread(null);
    navigate(ScreenName.HOME);
  };

  // Determine if we are in a modal flow
  const isModal = currentScreen === ScreenName.COMPOSE || currentScreen === ScreenName.PUBLISH;

  return (
    <div className="max-w-md mx-auto min-h-screen bg-app-bg text-app-text overflow-hidden relative shadow-2xl">
      {/* Main screen - render Home when not in modal, or keep Home in background when modal is open */}
      {!isModal ? <HomeScreen onNavigate={navigate} /> : <HomeScreen onNavigate={navigate} />}

      <AnimatePresence>
        {currentScreen === ScreenName.COMPOSE && (
          <ComposeScreen
            key="compose"
            onBack={() => navigate(ScreenName.HOME)}
            onNext={handleComposeNext}
            currentUser={MOCK_USER}
          />
        )}

        {currentScreen === ScreenName.PUBLISH && (
          <PublishScreen
            key="publish"
            onBack={() => navigate(ScreenName.COMPOSE)}
            onPublish={handlePublishComplete}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
