import { useState } from 'react';
import { X, Plus, Grid3x3 } from 'lucide-react';
import { GameList } from './GameList';
import { GameLobby } from './GameLobby';
import { Game } from '../types';

interface ParticipantView {
  id: string;
  userId: string;
  username: string;
  selectedGame: Game | null;
}

interface MultiViewSimulatorProps {
  meetingId: string;
  totalParticipants: number;
  onClose: () => void;
}

export function MultiViewSimulator({
  meetingId,
  totalParticipants,
  onClose
}: MultiViewSimulatorProps) {
  const profiles = [
    { id: 'userA', username: 'Алексей' },
    { id: 'userB', username: 'Мария' },
    { id: 'userC', username: 'Дмитрий' },
    { id: 'userD', username: 'Елена' },
    { id: 'userE', username: 'Сергей' },
    { id: 'userF', username: 'Анна' },
  ];

  const [views, setViews] = useState<ParticipantView[]>([
    { id: '1', userId: profiles[0].id, username: profiles[0].username, selectedGame: null }
  ]);
  const [currentProfileIndex, setCurrentProfileIndex] = useState(1);

  function addView() {
    const newId = (views.length + 1).toString();
    const profile = profiles[currentProfileIndex % profiles.length];
    setViews([...views, {
      id: newId,
      userId: profile.id,
      username: profile.username,
      selectedGame: null
    }]);
    setCurrentProfileIndex(prev => prev + 1);
  }

  function removeView(id: string) {
    setViews(views.filter(v => v.id !== id));
  }

  function handleSelectGame(viewId: string, game: Game) {
    setViews(views.map(v =>
      v.id === viewId ? { ...v, selectedGame: game } : v
    ));
  }

  function handleBack(viewId: string) {
    setViews(views.map(v =>
      v.id === viewId ? { ...v, selectedGame: null } : v
    ));
  }

  const gridClass = views.length === 1
    ? 'grid-cols-1'
    : views.length === 2
    ? 'grid-cols-2'
    : views.length === 3
    ? 'grid-cols-3'
    : 'grid-cols-2';

  return (
    <div className="fixed inset-0 bg-gray-900 z-50 overflow-auto">
      <div className="sticky top-0 bg-gray-800 text-white p-4 flex items-center justify-between shadow-lg z-10">
        <div className="flex items-center gap-4">
          <Grid3x3 size={24} />
          <h2 className="text-xl font-bold">Мультивью симулятор ({views.length} участников)</h2>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={addView}
            disabled={views.length >= 6}
            className="bg-green-500 hover:bg-green-600 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition-colors"
          >
            <Plus size={18} />
            Добавить вид
          </button>
          <button
            onClick={onClose}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition-colors"
          >
            <X size={18} />
            Закрыть
          </button>
        </div>
      </div>

      <div className={`grid ${gridClass} gap-1 min-h-screen`}>
        {views.map((view) => (
          <div key={view.id} className="relative bg-white border-2 border-gray-300">
            <div className="absolute top-2 left-2 z-20 bg-gray-800 text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg">
              {view.username}
            </div>
            {views.length > 1 && (
              <button
                onClick={() => removeView(view.id)}
                className="absolute top-2 right-2 z-20 bg-red-500 hover:bg-red-600 text-white p-2 rounded-full shadow-lg transition-colors"
              >
                <X size={16} />
              </button>
            )}
            <div className="h-full overflow-auto">
              {view.selectedGame ? (
                <GameLobby
                  game={view.selectedGame}
                  meetingId={meetingId}
                  currentUserId={view.userId}
                  totalParticipants={totalParticipants}
                  onBack={() => handleBack(view.id)}
                />
              ) : (
                <GameList onSelectGame={(game) => handleSelectGame(view.id, game)} />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
