import { useEffect, useState, useCallback } from 'react';
import { ArrowLeft } from 'lucide-react';
import { storageAdapter } from '../lib/adapter';
import { config } from '../config';
import { Game, GameSession, Participant, GameParticipant } from '../types';

const POLLING_FALLBACK_INTERVAL = 3000; // 3 seconds fallback polling

interface GameLobbyProps {
  game: Game;
  meetingId: string;
  currentTelegramUserId: number;
  currentTelegramUsername: string;
  totalParticipants: number;
  onBack: () => void;
}

export function GameLobby({
  game,
  meetingId,
  currentTelegramUserId,
  currentTelegramUsername,
  totalParticipants,
  onBack
}: GameLobbyProps) {
  const [session, setSession] = useState<GameSession | null>(null);
  const [participantCount, setParticipantCount] = useState(0);
  const [readyCount, setReadyCount] = useState(0);
  const [hasJoined, setHasJoined] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentParticipantId, setCurrentParticipantId] = useState<string | null>(null);
  const [inactivityTimer, setInactivityTimer] = useState<NodeJS.Timeout | null>(null);
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  const [isWebSocketConnected, setIsWebSocketConnected] = useState(false);
  const [usePollingFallback, setUsePollingFallback] = useState(false);

  const loadSessionData = useCallback(async () => {
    try {
      let gameSession = await getOrCreateSession();
      if (!gameSession) return;

      const snapshot = await storageAdapter.getSessionSnapshot(gameSession.id);
      if (!snapshot) return;

      const { participants } = snapshot;
      const userParticipant = participants.find((p: GameParticipant) => p.participant_id === currentParticipantId);

      setSession(gameSession);
      setParticipantCount(participants.length);
      setReadyCount(participants.filter((p: GameParticipant) => p.ready_to_start).length);
      setHasJoined(!!userParticipant);
      setIsReady(userParticipant?.ready_to_start || false);

      // Check if session should be cleaned up due to no participants
      if (participants.length === 0 && gameSession.status === 'waiting') {
        console.log('[GameLobby] No participants remaining - cleaning up session');
        await cleanupEmptySession(gameSession.id);
        onBack();
        return;
      }

      // Handle game start signal
      if (gameSession.status === 'in_progress' && !isGameStarted) {
        console.log('[GameLobby] Game started - stopping polling and navigating to game screen');
        setIsGameStarted(true);
        stopPolling();
        clearInactivityTimer();
        navigateToGame();
        return;
      }

      await updateLastActivity(gameSession.id);
      checkForAutoStart(gameSession.id, participants.length);
    } catch (error) {
      console.error('Error loading session:', error);
    } finally {
      setLoading(false);
    }
  }, [currentParticipantId, meetingId, game.id, isGameStarted]);

  useEffect(() => {
    initializeParticipant();

    // Handle window lifecycle events
    const handleVisibilityChange = () => {
      if (document.hidden && session?.status === 'waiting' && currentParticipantId) {
        console.log('[GameLobby] Window hidden - marking participant as left');
        // Optionally leave session when window is hidden (user switched tabs/minimized)
        // storageAdapter.leaveSession(session.id, currentParticipantId);
      }
    };

    const handleBeforeUnload = () => {
      if (session?.status === 'waiting' && currentParticipantId) {
        console.log('[GameLobby] Window closing - leaving session');
        // Synchronous call for beforeunload
        storageAdapter.leaveSession(session.id, currentParticipantId);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [session?.status, currentParticipantId]);

  useEffect(() => {
    if (!currentParticipantId) return;

    loadSessionData();

    const setupRealTimeUpdates = async () => {
      if (session?.id) {
        try {
          // Try to connect WebSocket first
          await storageAdapter.connectWebSocket(session.id);
          setIsWebSocketConnected(true);
          setUsePollingFallback(false);

          // Set up WebSocket listener
          const handleSessionUpdate = (sessionId: string, data: any) => {
            if (sessionId === session.id) {
              updateSessionFromWebSocket(data);
            }
          };

          storageAdapter.addSessionUpdateListener(handleSessionUpdate);

          return () => {
            storageAdapter.removeSessionUpdateListener(handleSessionUpdate);
          };
        } catch (error) {
          console.warn('WebSocket connection failed, falling back to polling:', error);
          setUsePollingFallback(true);
          setIsWebSocketConnected(false);
        }
      }

      // Fallback to polling if WebSocket fails or no session yet
      if (!session?.id || usePollingFallback) {
        const interval = setInterval(loadSessionData, POLLING_FALLBACK_INTERVAL);
        setPollingInterval(interval);
        return () => clearInterval(interval);
      }
    };

    const cleanup = setupRealTimeUpdates();

    return () => {
      cleanup?.then(cleanupFn => cleanupFn?.());
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [currentParticipantId, session?.id, loadSessionData, usePollingFallback]);

  const updateSessionFromWebSocket = useCallback((data: any) => {
    if (!data || !data.session || !data.participants) return;

    const { session: sessionData, participants, readyCount } = data;
    const userParticipant = participants.find((p: GameParticipant) => p.participant_id === currentParticipantId);

    setSession(sessionData);
    setParticipantCount(participants.length);
    setReadyCount(readyCount || participants.filter((p: GameParticipant) => p.ready_to_start).length);
    setHasJoined(!!userParticipant);
    setIsReady(userParticipant?.ready_to_start || false);

    // Handle game start signal from WebSocket
    if (sessionData.status === 'in_progress' && !isGameStarted) {
      console.log('[GameLobby] Game started via WebSocket - navigating to game screen');
      setIsGameStarted(true);
      stopPolling();
      clearInactivityTimer();
      navigateToGame();
    }
  }, [currentParticipantId, isGameStarted]);

  useEffect(() => {
    if (inactivityTimer) {
      clearTimeout(inactivityTimer);
    }

    // Only set inactivity timer for waiting sessions with participants
    if (session?.status === 'waiting' && participantCount > 0) {
      const timer = setTimeout(async () => {
        console.log('[GameLobby] Inactivity timeout - cleaning up session and participants');
        await cleanupInactiveSession();
        alert('Игра отменена из-за неактивности (10 минут)');
        onBack();
      }, config.INACTIVITY_TIMEOUT_MS);

      setInactivityTimer(timer);

      return () => {
        if (timer) clearTimeout(timer);
      };
    }
  }, [session?.status, session?.last_activity, participantCount]);

  // Cleanup WebSocket on unmount
  useEffect(() => {
    return () => {
      if (session?.id) {
        storageAdapter.disconnectWebSocket();
      }
    };
  }, [session?.id]);

  async function initializeParticipant() {
    try {
      const participant = await storageAdapter.getOrCreateParticipant(meetingId, currentTelegramUserId, currentTelegramUsername);
      setCurrentParticipantId(participant.id);
      console.log('[GameLobby] Participant initialized:', participant.id);
    } catch (error) {
      console.error('Error initializing participant:', error);
    }
  }

  async function getOrCreateSession(): Promise<GameSession | null> {
    try {
      // Priority: in_progress > waiting > create new
      const existingSession = await storageAdapter.getActiveSession(meetingId, game.id);
      if (existingSession) {
        console.log('[GameLobby] Found existing session:', existingSession.status, existingSession.id);
        return existingSession;
      }

      console.log('[GameLobby] Creating new waiting session');
      const newSession = await storageAdapter.createWaitingSession(meetingId, game.id);
      return newSession;
    } catch (error) {
      console.error('Error getting/creating session:', error);
      return null;
    }
  }

  async function updateLastActivity(sessionId: string) {
    try {
      await storageAdapter.updateSessionActivity(sessionId);
      console.log('[GameLobby] Updated last activity for session:', sessionId);
    } catch (error) {
      console.error('Error updating session activity:', error);
    }
  }

  async function checkForAutoStart(sessionId: string, count: number) {
    if (count === totalParticipants) {
      console.log('[GameLobby] Auto-start triggered - all participants joined');
      await storageAdapter.setSessionStatus(sessionId, 'in_progress');
    }
  }

  async function handleJoin() {
    if (!session || !currentParticipantId) return;

    try {
      console.log('[GameLobby] Joining session:', session.id, 'participant:', currentParticipantId);
      await storageAdapter.joinSession(session.id, currentParticipantId);
      setHasJoined(true);

      // Send join event to Telegram bot
      if ((window as any).Telegram?.WebApp?.sendData) {
        (window as any).Telegram.WebApp.sendData(JSON.stringify({
          event: 'join_game',
          game_id: game.id,
          session_id: session.id,
          participant_id: currentParticipantId,
          telegram_user_id: currentTelegramUserId
        }));
      }

      await loadSessionData();
    } catch (error) {
      console.error('Error joining game:', error);
    }
  }

  async function handleReady() {
    if (!session || !currentParticipantId) return;

    try {
      console.log('[GameLobby] Voting to start early:', session.id, 'participant:', currentParticipantId);
      await storageAdapter.voteEarlyStart(session.id, currentParticipantId, true);
      setIsReady(true);

      const snapshot = await storageAdapter.getSessionSnapshot(session.id);
      if (snapshot) {
        const { participants } = snapshot;
        const currentParticipants = participants.length;

        // Check if all current participants have voted to start early
        const allReady = participants.every((p: GameParticipant) => p.ready_to_start);

        if (allReady && currentParticipants >= game.min_players) {
          console.log('[GameLobby] Early start consensus reached');
          await storageAdapter.setSessionStatus(session.id, 'in_progress');
        }
      }

      await loadSessionData();
    } catch (error) {
      console.error('Error setting ready:', error);
    }
  }

  async function handleLeave() {
    if (!session || !currentParticipantId) return;

    try {
      console.log('[GameLobby] Leaving session:', session.id, 'participant:', currentParticipantId);
      await storageAdapter.leaveSession(session.id, currentParticipantId);

      // Send leave event to Telegram bot
      if ((window as any).Telegram?.WebApp?.sendData) {
        (window as any).Telegram.WebApp.sendData(JSON.stringify({
          event: 'leave_game',
          game_id: game.id,
          session_id: session.id,
          participant_id: currentParticipantId,
          telegram_user_id: currentTelegramUserId
        }));
      }

      onBack();
    } catch (error) {
      console.error('Error leaving game:', error);
    }
  }

  async function cleanupEmptySession(sessionId: string) {
    try {
      console.log('[GameLobby] Cleaning up empty session:', sessionId);
      // Mark session as completed when no participants remain
      await storageAdapter.setSessionStatus(sessionId, 'completed');
    } catch (error) {
      console.error('Error cleaning up empty session:', error);
    }
  }

  async function cleanupInactiveSession() {
    if (!session) return;

    try {
      console.log('[GameLobby] Cleaning up inactive session:', session.id);

      // Get all participants before cleanup
      const snapshot = await storageAdapter.getSessionSnapshot(session.id);
      if (snapshot) {
        const { participants } = snapshot;

        // Remove all participants from session
        for (const participant of participants) {
          await storageAdapter.leaveSession(session.id, participant.participant_id);
        }

        console.log(`[GameLobby] Removed ${participants.length} participants from inactive session`);
      }

      // Mark session as completed (effectively cleaning it up)
      await storageAdapter.setSessionStatus(session.id, 'completed');
    } catch (error) {
      console.error('Error cleaning up inactive session:', error);
    }
  }

  async function resetSession() {
    if (!session) return;

    try {
      console.log('[GameLobby] Resetting session:', session.id);
      // Note: In the new adapter pattern, we might not need to manually delete participants
      // The session status change to 'completed' should handle cleanup
      await storageAdapter.setSessionStatus(session.id, 'completed');
    } catch (error) {
      console.error('Error resetting session:', error);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center paper-texture">
        <div className="text-[#ff6b35] text-xl animate-pulse-subtle">Загрузка...</div>
      </div>
    );
  }

  const canStartEarly = participantCount >= game.min_players && participantCount < totalParticipants;
  const showReadyButton = hasJoined && canStartEarly && !isReady;
  const waitingForOthers = hasJoined && isReady && readyCount < participantCount;

  const stopPolling = () => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
      console.log('[GameLobby] Polling stopped');
    }
  };

  const clearInactivityTimer = () => {
    if (inactivityTimer) {
      clearTimeout(inactivityTimer);
      setInactivityTimer(null);
      console.log('[GameLobby] Inactivity timer cleared');
    }
  };

  const navigateToGame = () => {
    // Send start game event to Telegram bot
    if ((window as any).Telegram?.WebApp?.sendData && session) {
      (window as any).Telegram.WebApp.sendData(JSON.stringify({
        event: 'start_game',
        game_id: game.id,
        session_id: session.id,
        participant_id: currentParticipantId,
        telegram_user_id: currentTelegramUserId
      }));
    }

    if (config.TELEGRAM_WEBAPP_CLOSE_ON_START) {
      if ((window as any).Telegram?.WebApp) {
        (window as any).Telegram.WebApp.close();
      }
    } else {
      // For now, just show an alert - later this could navigate to actual game screen
      alert('Переход к игре! (здесь будет экран самой мини-игры)');
    }
  };

  return (
    <div className="min-h-screen paper-texture py-12 px-6">
      <div className="max-w-md mx-auto relative z-10">
        <button
          onClick={handleLeave}
          className="mb-6 flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft size={24} />
          <span>Выйти из игры</span>
        </button>

        <h1 className="text-3xl font-bold text-center text-gray-800 mb-2 animate-float">
          {game.name}
        </h1>

        {game.description && (
          <p className="text-center text-gray-600 mb-8">{game.description}</p>
        )}

        <div className="flex flex-col items-center space-y-6">
          <div className="w-48 h-48 rounded-full bg-[#ff6b35] flex items-center justify-center shadow-2xl transition-transform duration-300 hover:scale-105">
            <div className="text-center">
              <div className="text-6xl font-bold text-white">
                {participantCount} / {totalParticipants}
              </div>
              <div className="text-white text-sm mt-2 opacity-90">
                участников
              </div>
            </div>
          </div>

          {session?.status === 'in_progress' ? (
            <div className="text-center">
              <div className="text-2xl font-bold text-[#ff6b35] mb-2">
                Игра началась!
              </div>
              <div className="text-gray-600">
                Всем участникам отправлены инструкции
              </div>
            </div>
          ) : (
            <>
              {!hasJoined ? (
                <button
                  onClick={handleJoin}
                  className="w-full bg-[#ff6b35] hover:bg-[#e55a28] text-white font-semibold py-5 px-8 rounded-2xl shadow-lg transition-all duration-300 transform hover:scale-[1.03] hover:shadow-xl active:scale-[0.98] text-xl"
                >
                  Присоединиться
                </button>
              ) : (
                <div className="w-full space-y-4">
                  <div className="bg-green-100 text-green-800 font-semibold py-4 px-6 rounded-2xl text-center">
                    ✓ Вы присоединились
                  </div>

                  {showReadyButton && (
                    <button
                      onClick={handleReady}
                      className="w-full bg-[#ff6b35] hover:bg-[#e55a28] text-white font-semibold py-5 px-8 rounded-2xl shadow-lg transition-all duration-300 transform hover:scale-[1.03] hover:shadow-xl active:scale-[0.98] text-xl"
                    >
                      Стартовать досрочно
                    </button>
                  )}

                  {waitingForOthers && (
                    <div className="bg-blue-100 text-blue-800 font-semibold py-4 px-6 rounded-2xl text-center">
                      Ждём остальных... ({readyCount}/{participantCount})
                    </div>
                  )}
                </div>
              )}

              <div className="text-center text-gray-600 text-sm mt-4">
                <p>Минимум игроков для старта: {game.min_players}</p>
                {participantCount < game.min_players && (
                  <p className="text-[#ff6b35] font-semibold mt-2">
                    Ещё {game.min_players - participantCount} {game.min_players - participantCount === 1 ? 'игрок' : 'игрока'}
                  </p>
                )}
                <div className="mt-2 flex items-center justify-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${isWebSocketConnected ? 'bg-green-500' : usePollingFallback ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
                  <span className="text-xs">
                    {isWebSocketConnected ? 'Real-time' : usePollingFallback ? 'Polling' : 'Connecting...'}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
