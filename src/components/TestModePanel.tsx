import { Settings, Users, Plus, Minus } from 'lucide-react';
import { useState } from 'react';

interface TestModePanelProps {
  onAddParticipant: () => void;
  onRemoveParticipant: () => void;
  onChangeTotalParticipants: (total: number) => void;
  currentParticipants: number;
  totalParticipants: number;
}

export function TestModePanel({
  onAddParticipant,
  onRemoveParticipant,
  onChangeTotalParticipants,
  currentParticipants,
  totalParticipants
}: TestModePanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 right-4 z-50 bg-gray-800 hover:bg-gray-700 text-white p-3 rounded-full shadow-lg transition-all duration-300 transform hover:scale-110"
        title="Тестовый режим"
      >
        <Settings size={24} />
      </button>

      {isOpen && (
        <div className="fixed top-20 right-4 z-50 bg-white rounded-2xl shadow-2xl p-6 w-80 border-2 border-gray-200">
          <div className="flex items-center gap-2 mb-4 pb-4 border-b border-gray-200">
            <Settings size={20} className="text-gray-700" />
            <h3 className="font-bold text-gray-800">Тестовый режим</h3>
          </div>

          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-700">Всего участников</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onChangeTotalParticipants(Math.max(2, totalParticipants - 1))}
                    className="bg-blue-500 hover:bg-blue-600 text-white p-1 rounded-lg transition-colors"
                  >
                    <Minus size={16} />
                  </button>
                  <span className="text-xl font-bold text-blue-700 w-8 text-center">
                    {totalParticipants}
                  </span>
                  <button
                    onClick={() => onChangeTotalParticipants(totalParticipants + 1)}
                    className="bg-blue-500 hover:bg-blue-600 text-white p-1 rounded-lg transition-colors"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-green-50 p-4 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <Users size={18} className="text-green-700" />
                <span className="text-sm font-semibold text-gray-700">
                  Активные: {currentParticipants}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={onAddParticipant}
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-lg transition-colors font-semibold flex items-center justify-center gap-2"
                >
                  <Plus size={16} />
                  Добавить
                </button>
                <button
                  onClick={onRemoveParticipant}
                  disabled={currentParticipants === 0}
                  className="flex-1 bg-red-500 hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-2 px-4 rounded-lg transition-colors font-semibold flex items-center justify-center gap-2"
                >
                  <Minus size={16} />
                  Убрать
                </button>
              </div>
            </div>

            <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded-lg">
              <p className="font-semibold mb-1">Как использовать:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Откройте страницу в нескольких окнах</li>
                <li>Каждое окно = отдельный участник</li>
                <li>Меняйте общее количество участников</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
