import type { TradeFilter } from '@/lib/types';
import { create } from 'zustand';

type PrintPhase = 'printing' | 'ejecting';

// Animation speed options (in seconds)
export const ANIMATION_SPEEDS = [
  { label: '0.1x', duration: 20 },
  { label: '0.25x', duration: 8 },
  { label: '0.5x', duration: 4 },
  { label: '1x', duration: 2 },
  { label: '2x', duration: 1 },
  { label: '4x', duration: 0.5 },
] as const;

interface UIState {
  filter: TradeFilter;
  isMuted: boolean;
  isPrinting: boolean;
  printPhase: PrintPhase;
  animationSpeedIndex: number;
  posReceiptLimit: number;

  // Actions
  setFilter: (filter: TradeFilter) => void;
  toggleMute: () => void;
  setIsPrinting: (value: boolean) => void;
  setPrintPhase: (phase: PrintPhase) => void;
  cycleAnimationSpeed: () => void;
  setSecondsRemaining: (value: number) => void;
  setPosReceiptLimit: (limit: number) => void;
  reset: () => void;
}

export const useUIStore = create<UIState>()((set) => ({
  filter: 'all',
  isMuted: false,
  isPrinting: false,
  printPhase: 'printing',
  animationSpeedIndex: 3, // Default to 1x (2 seconds)
  secondsRemaining: 15,
  posReceiptLimit: 2,

  setFilter: (filter) =>
    set({
      filter,
    }),

  toggleMute: () =>
    set((state) => ({
      isMuted: !state.isMuted,
    })),

  setIsPrinting: (value) =>
    set({
      isPrinting: value,
    }),

  setPrintPhase: (phase) =>
    set({
      printPhase: phase,
    }),

  cycleAnimationSpeed: () =>
    set((state) => ({
      animationSpeedIndex: (state.animationSpeedIndex + 1) % ANIMATION_SPEEDS.length,
    })),

  setSecondsRemaining: (value) =>
    set({
      secondsRemaining: value,
    }),

  setPosReceiptLimit: (limit) =>
    set({
      posReceiptLimit: limit,
    }),

  reset: () =>
    set({
      filter: 'all',
      isMuted: false,
      isPrinting: false,
      printPhase: 'printing',
      animationSpeedIndex: 3,
      secondsRemaining: 15,
      posReceiptLimit: 2,
    }),
}));
