import { create } from 'zustand';
import type { Receipt } from '@/lib/types';
import { storage } from '@/lib/storage';

// Maximum receipts to keep (localStorage has ~5MB limit)
const MAX_RECEIPTS = 500;

interface ReceiptState {
  receipts: Receipt[];
  hoveredReceiptId: string | null;
  summaryCount: number;
  isHydrated: boolean;

  // Actions
  addReceipt: (receipt: Receipt) => void;
  toggleReceiptExpanded: (id: string) => void;
  setHoveredReceipt: (id: string | null) => void;
  hydrate: () => void;
  reset: () => void;
}

export const useReceiptStore = create<ReceiptState>()((set, get) => ({
  receipts: [],
  hoveredReceiptId: null,
  summaryCount: 0,
  isHydrated: false,

  hydrate: () => {
    if (get().isHydrated) return;

    const savedReceipts = storage.loadReceipts() as Receipt[];
    const savedSummaryCount = storage.loadSummaryCount();

    if (savedReceipts.length > 0) {
      set({
        receipts: savedReceipts,
        summaryCount: savedSummaryCount,
        isHydrated: true,
      });
    } else {
      set({ isHydrated: true });
    }
  },

  addReceipt: (receipt) =>
    set((state) => {
      // Add new receipt at the beginning (newest first)
      const newReceipts = [receipt, ...state.receipts];

      // Prune old receipts if exceeding limit
      const prunedReceipts = newReceipts.slice(0, MAX_RECEIPTS);

      const newSummaryCount = state.summaryCount + 1;

      // Persist to localStorage
      storage.saveReceipts(prunedReceipts);
      storage.saveSummaryCount(newSummaryCount);

      return {
        receipts: prunedReceipts,
        summaryCount: newSummaryCount,
      };
    }),

  toggleReceiptExpanded: (id) =>
    set((state) => ({
      receipts: state.receipts.map((r) =>
        r.id === id ? { ...r, isExpanded: !r.isExpanded } : r
      ),
    })),

  setHoveredReceipt: (id) =>
    set({
      hoveredReceiptId: id,
    }),

  reset: () => {
    storage.clearAll();
    set({
      receipts: [],
      hoveredReceiptId: null,
      summaryCount: 0,
    });
  },
}));
