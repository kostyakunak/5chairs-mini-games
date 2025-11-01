import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Game } from '../types';

interface GameListProps {
  onSelectGame: (game: Game) => void;
}

export function GameList({ onSelectGame }: GameListProps) {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGames();
  }, []);

  async function loadGames() {
    try {
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .order('name');

      if (error) throw error;
      setGames(data || []);
    } catch (error) {
      console.error('Error loading games:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center paper-texture">
        <div className="text-[#ff6b35] text-xl animate-pulse-subtle">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen paper-texture py-12 px-6">
      <div className="max-w-md mx-auto">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-8 animate-float relative z-10">
          Мини-игры
        </h1>

        <div className="space-y-4 relative z-10">
          {games.map((game) => (
            <button
              key={game.id}
              onClick={() => onSelectGame(game)}
              className="w-full bg-[#ff6b35] hover:bg-[#e55a28] text-white font-semibold py-5 px-6 rounded-2xl shadow-lg transition-all duration-300 transform hover:scale-[1.03] hover:shadow-xl active:scale-[0.98]"
            >
              <div className="text-xl">{game.name}</div>
              {game.description && (
                <div className="text-sm opacity-90 mt-1">{game.description}</div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
