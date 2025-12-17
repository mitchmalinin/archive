'use client';

import { useSound } from '@/hooks/useSound';
import { useUIStore } from '@/stores/uiStore';

export function TerminalKeypad() {
  const { filter, setFilter, toggleMute, isMuted } = useUIStore();
  const { playButtonPress } = useSound();

  const handleRedButton = () => {
    playButtonPress();
    setFilter(filter === 'sells' ? 'all' : 'sells');
  };

  const handleGreenButton = () => {
    playButtonPress();
    setFilter(filter === 'buys' ? 'all' : 'buys');
  };

  const handleYellowButton = () => {
    playButtonPress();
    toggleMute();
  };

  const handleNumberButton = () => {
    playButtonPress();
  };

  const numberButtons = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  return (
    <div className="grid grid-cols-3 gap-3 mb-4 px-1">
      {/* Number buttons 1-9 */}
      {numberButtons.map((num) => (
        <button
          key={num}
          onClick={handleNumberButton}
          className="bg-gray-200 dark:bg-[#252525] h-10 rounded shadow-sm border-b-4 border-gray-300 dark:border-black text-gray-700 dark:text-white font-bold font-mono text-lg btn-press"
        >
          {num}
        </button>
      ))}

      {/* Red button (filter sells) */}
      <button
        onClick={handleRedButton}
        className={`h-10 rounded shadow-sm border-b-4 text-white font-bold text-xs flex items-center justify-center btn-press transition-all ${
          filter === 'sells'
            ? 'bg-red-600 border-red-800 ring-2 ring-red-400'
            : 'bg-red-500 border-red-700'
        }`}
      >
        <span className="material-symbols-outlined text-lg">close</span>
      </button>

      {/* Yellow button (mute) */}
      <button
        onClick={handleYellowButton}
        className={`h-10 rounded shadow-sm border-b-4 text-black font-bold text-xs flex items-center justify-center btn-press transition-all ${
          isMuted
            ? 'bg-yellow-600 border-yellow-800 ring-2 ring-yellow-400'
            : 'bg-yellow-500 border-yellow-700'
        }`}
      >
        {isMuted ? (
          <span className="material-symbols-outlined text-lg">volume_off</span>
        ) : (
          <span className="font-mono text-lg">0</span>
        )}
      </button>

      {/* Green button (filter buys) */}
      <button
        onClick={handleGreenButton}
        className={`h-10 rounded shadow-sm border-b-4 text-white font-bold text-xs flex items-center justify-center btn-press transition-all ${
          filter === 'buys'
            ? 'bg-green-600 border-green-800 ring-2 ring-green-400'
            : 'bg-green-500 border-green-700'
        }`}
      >
        <span className="material-symbols-outlined text-lg">check</span>
      </button>
    </div>
  );
}
