import { useState, useEffect } from 'react';
import { GameList } from './components/GameList';
import { GameLobby } from './components/GameLobby';
import { TestModePanel } from './components/TestModePanel';
import { MultiViewSimulator } from './components/MultiViewSimulator';
import { supabase } from './lib/supabase';
import { Game, TelegramUser } from './types';
import { config } from './config';

function App() {
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [meetingId, setMeetingId] = useState<string>('');
  const [currentTelegramUserId, setCurrentTelegramUserId] = useState<number>(0);
  const [currentTelegramUsername, setCurrentTelegramUsername] = useState<string>('');
  const [totalParticipants, setTotalParticipants] = useState(5);
  const [initialized, setInitialized] = useState(false);
  const [showMultiView, setShowMultiView] = useState(false);
  const [activeParticipants, setActiveParticipants] = useState(0);

  useEffect(() => {
    initializeApp();

    // Ensure Telegram WebApp is ready when component mounts
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.ready();
    }
  }, []);

  async function initializeApp() {
    try {
      // Parse URL parameters
      const urlParams = new URLSearchParams(window.location.search);
      const meetingIdFromUrl = urlParams.get('m');
      const totalFromUrl = urlParams.get('t');

      if (meetingIdFromUrl && totalFromUrl) {
        setMeetingId(meetingIdFromUrl);
        setTotalParticipants(parseInt(totalFromUrl));
      } else {
        // Fallback to creating new meeting only if not in prod mode or explicitly allowed
        if (config.USE_TEST_MODE) {
          const { data: meeting } = await supabase
            .from('meetings')
            .insert({
              total_participants: 5
            })
            .select()
            .single();

          if (meeting) {
            setMeetingId(meeting.id);
            setTotalParticipants(meeting.total_participants);
          }
        }
      }

      // Initialize user data based on mode
      let telegramUserId: number;
      let telegramUsername: string;
      if (config.USE_TEST_MODE) {
        // Deterministic ID for test mode based on session storage
        const userIdStr = sessionStorage.getItem('testUserId') || `test_user_${Date.now()}`;
        telegramUserId = parseInt(userIdStr.replace('test_user_', '')) || Date.now();
        telegramUsername = sessionStorage.getItem('testUsername') || `Test User ${telegramUserId.toString().slice(-4)}`;
        sessionStorage.setItem('testUserId', telegramUserId.toString());
        sessionStorage.setItem('testUsername', telegramUsername);
      } else {
        // Check for Telegram WebApp
        if ((window as any).Telegram?.WebApp?.initDataUnsafe?.user) {
          const tgUser = (window as any).Telegram.WebApp.initDataUnsafe.user;
          telegramUserId = tgUser.id;
          telegramUsername = tgUser.username || tgUser.first_name || `User ${tgUser.id}`;
        } else {
          // Fallback for development
          telegramUserId = Date.now();
          telegramUsername = `Fallback User`;
        }
        if ((window as any).Telegram?.WebApp) {
          (window as any).Telegram.WebApp.ready();
        }
      }
      setCurrentTelegramUserId(telegramUserId);
      setCurrentTelegramUsername(telegramUsername);

      setInitialized(true);
    } catch (error) {
      console.error('Error initializing app:', error);
      setInitialized(true);
    }
  }

  function handleSelectGame(game: Game) {
    setSelectedGame(game);
  }

  function handleBack() {
    setSelectedGame(null);
  }

  async function handleChangeTotalParticipants(newTotal: number) {
    setTotalParticipants(newTotal);
    if (meetingId) {
      await supabase
        .from('meetings')
        .update({ total_participants: newTotal })
        .eq('id', meetingId);
    }
  }

  function handleAddParticipant() {
    setActiveParticipants(prev => Math.min(prev + 1, totalParticipants));
  }

  function handleRemoveParticipant() {
    setActiveParticipants(prev => Math.max(prev - 1, 0));
  }

  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center paper-texture">
        <div className="text-[#ff6b35] text-xl animate-pulse-subtle">Инициализация...</div>
      </div>
    );
  }

  if (showMultiView && meetingId) {
    return (
      <MultiViewSimulator
        meetingId={meetingId}
        totalParticipants={totalParticipants}
        onClose={() => setShowMultiView(false)}
      />
    );
  }

  return (
    <>
      {config.SHOW_TEST_PANEL && (
        <TestModePanel
          onAddParticipant={handleAddParticipant}
          onRemoveParticipant={handleRemoveParticipant}
          onChangeTotalParticipants={handleChangeTotalParticipants}
          currentParticipants={activeParticipants}
          totalParticipants={totalParticipants}
        />
      )}

      {config.SHOW_MULTI_VIEW && (
        <button
          onClick={() => setShowMultiView(true)}
          className="fixed bottom-4 right-4 z-50 bg-[#ff6b35] hover:bg-[#e55a28] text-white px-6 py-3 rounded-full shadow-lg transition-all duration-300 transform hover:scale-105 font-semibold"
        >
          Открыть мультивью
        </button>
      )}

      {selectedGame && meetingId && currentTelegramUserId ? (
        <GameLobby
          game={selectedGame}
          meetingId={meetingId}
          currentTelegramUserId={currentTelegramUserId}
          currentTelegramUsername={currentTelegramUsername}
          totalParticipants={totalParticipants}
          onBack={handleBack}
        />
      ) : (
        <GameList onSelectGame={handleSelectGame} />
      )}
    </>
  );
}

export default App;
