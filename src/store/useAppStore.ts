/**
 * APEX Photo Studio v1.1.0 - Zustand Store
 * Estado global de la aplicación.
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type {
  ViewMode,
  AdjustmentValues,
  AdjustmentCategory,
  HSLChannelWithLightness,
  GridOverlayType,
  Toast
} from '../types';

// ============================================================================
// APP STATE INTERFACE
// ============================================================================

interface AppState {
  // View state
  currentView: ViewMode;
  setCurrentView: (view: ViewMode) => void;

  // Image state
  imageSrc: string | null;
  originalSrc: string | null;
  setImageSrc: (src: string | null) => void;
  setOriginalSrc: (src: string | null) => void;

  // Adjustments
  adjustments: AdjustmentValues;
  updateAdjustment: (key: keyof AdjustmentValues | string, value: number) => void;
  updateHSL: (channel: string, component: keyof HSLChannelWithLightness, value: number) => void;
  resetAdjustments: (category?: AdjustmentCategory) => void;

  // History
  history: AdjustmentValues[];
  historyIndex: number;
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  addToHistory: (adjustments: AdjustmentValues) => void;

  // UI state
  isExportModalOpen: boolean;
  setExportModalOpen: (open: boolean) => void;
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;

  // Editor settings
  zoom: number;
  pan: { x: number; y: number };
  splitPosition: number;
  showSplit: boolean;
  gridOverlay: GridOverlayType;
  showZebra: boolean;
  setZoom: (zoom: number) => void;
  setPan: (pan: { x: number; y: number }) => void;
  setSplitPosition: (position: number) => void;
  setShowSplit: (show: boolean) => void;
  setGridOverlay: (grid: GridOverlayType) => void;
  setShowZebra: (show: boolean) => void;
}

// ============================================================================
// DEFAULT VALUES
// ============================================================================

const DEFAULT_HSL_CHANNEL: HSLChannelWithLightness = {
  hue: 0,
  saturation: 0,
  lightness: 0
};

const DEFAULT_ADJUSTMENTS: AdjustmentValues = {
  exposure: 0,
  contrast: 0,
  highlights: 0,
  shadows: 0,
  whites: 0,
  blacks: 0,
  temperature: 0,
  tint: 0,
  saturation: 0,
  vibrance: 0,
  clarity: 0,
  sharpness: 0,
  noiseReduction: 0,
  hsl: {
    red: { ...DEFAULT_HSL_CHANNEL },
    orange: { ...DEFAULT_HSL_CHANNEL },
    yellow: { ...DEFAULT_HSL_CHANNEL },
    green: { ...DEFAULT_HSL_CHANNEL },
    aqua: { ...DEFAULT_HSL_CHANNEL },
    blue: { ...DEFAULT_HSL_CHANNEL },
    purple: { ...DEFAULT_HSL_CHANNEL },
    magenta: { ...DEFAULT_HSL_CHANNEL }
  }
};

const MAX_HISTORY_SIZE = 50;

// ============================================================================
// STORE CREATION
// ============================================================================

export const useAppStore = create<AppState>()(
  devtools(
    persist(
      (set, get) => ({
        // ============================================================================
        // VIEW STATE
        // ============================================================================
        currentView: 'camera' as ViewMode,
        setCurrentView: (view: ViewMode) => set({ currentView: view }),

        // ============================================================================
        // IMAGE STATE
        // ============================================================================
        imageSrc: null,
        originalSrc: null,
        setImageSrc: (src: string | null) => set({ imageSrc: src }),
        setOriginalSrc: (src: string | null) => set({ originalSrc: src }),

        // ============================================================================
        // ADJUSTMENTS
        // ============================================================================
        adjustments: { ...DEFAULT_ADJUSTMENTS },

        updateAdjustment: (key: keyof AdjustmentValues | string, value: number) => {
          const { adjustments } = get();
          const newAdjustments = {
            ...adjustments,
            [key]: value
          };
          set({ adjustments: newAdjustments as AdjustmentValues });
        },

        updateHSL: (channel: string, component: keyof HSLChannelWithLightness, value: number) => {
          const { adjustments } = get();
          const hslChannel = adjustments.hsl[channel as keyof typeof adjustments.hsl];
          
          if (!hslChannel) return;

          const newAdjustments = {
            ...adjustments,
            hsl: {
              ...adjustments.hsl,
              [channel]: {
                ...hslChannel,
                [component]: value
              }
            }
          };

          set({ adjustments: newAdjustments });
        },

        resetAdjustments: (category?: AdjustmentCategory) => {
          const { adjustments, addToHistory } = get();

          let newAdjustments: AdjustmentValues;

          if (category === 'exposure') {
            newAdjustments = {
              ...adjustments,
              exposure: 0,
              contrast: 0,
              highlights: 0,
              shadows: 0,
              whites: 0,
              blacks: 0
            };
          } else if (category === 'color') {
            newAdjustments = {
              ...adjustments,
              temperature: 0,
              tint: 0,
              saturation: 0,
              vibrance: 0
            };
          } else if (category === 'detail') {
            newAdjustments = {
              ...adjustments,
              clarity: 0,
              sharpness: 0,
              noiseReduction: 0
            };
          } else if (category === 'hsl') {
            newAdjustments = {
              ...adjustments,
              hsl: {
                red: { ...DEFAULT_HSL_CHANNEL },
                orange: { ...DEFAULT_HSL_CHANNEL },
                yellow: { ...DEFAULT_HSL_CHANNEL },
                green: { ...DEFAULT_HSL_CHANNEL },
                aqua: { ...DEFAULT_HSL_CHANNEL },
                blue: { ...DEFAULT_HSL_CHANNEL },
                purple: { ...DEFAULT_HSL_CHANNEL },
                magenta: { ...DEFAULT_HSL_CHANNEL }
              }
            };
          } else {
            newAdjustments = { ...DEFAULT_ADJUSTMENTS };
          }

          addToHistory(newAdjustments);
          set({ adjustments: newAdjustments });
        },

        // ============================================================================
        // HISTORY
        // ============================================================================
        history: [{ ...DEFAULT_ADJUSTMENTS }],
        historyIndex: 0,

        get canUndo() {
          return get().historyIndex > 0;
        },

        get canRedo() {
          return get().historyIndex < get().history.length - 1;
        },

        addToHistory: (adjustments: AdjustmentValues) => {
          const { history, historyIndex } = get();

          // Remove future history if we're not at the end
          const newHistory = history.slice(0, historyIndex + 1);

          // Add new state
          newHistory.push({ ...adjustments });

          // Limit history size
          if (newHistory.length > MAX_HISTORY_SIZE) {
            newHistory.shift();
          }

          set({
            history: newHistory,
            historyIndex: newHistory.length - 1
          });
        },

        undo: () => {
          const { historyIndex, history } = get();

          if (historyIndex > 0) {
            const newIndex = historyIndex - 1;
            set({
              historyIndex: newIndex,
              adjustments: { ...history[newIndex] }
            });
          }
        },

        redo: () => {
          const { historyIndex, history } = get();

          if (historyIndex < history.length - 1) {
            const newIndex = historyIndex + 1;
            set({
              historyIndex: newIndex,
              adjustments: { ...history[newIndex] }
            });
          }
        },

        // ============================================================================
        // UI STATE
        // ============================================================================
        isExportModalOpen: false,
        setExportModalOpen: (open: boolean) => set({ isExportModalOpen: open }),

        toasts: [],
        addToast: (toast: Omit<Toast, 'id'>) => {
          const id = Math.random().toString(36).substring(7);
          const { toasts } = get();

          set({
            toasts: [...toasts, { ...toast, id }]
          });

          // Auto-remove toast
          if (toast.duration !== 0) {
            setTimeout(() => {
              get().removeToast(id);
            }, toast.duration || 3000);
          }
        },

        removeToast: (id: string) => {
          const { toasts } = get();
          set({ toasts: toasts.filter((t: Toast) => t.id !== id) });
        },

        // ============================================================================
        // EDITOR SETTINGS
        // ============================================================================
        zoom: 1,
        pan: { x: 0, y: 0 },
        splitPosition: 50,
        showSplit: false,
        gridOverlay: 'none' as GridOverlayType,
        showZebra: false,

        setZoom: (zoom: number) => set({ zoom: Math.max(0.1, Math.min(5, zoom)) }),
        setPan: (pan: { x: number; y: number }) => set({ pan }),
        setSplitPosition: (position: number) => set({ splitPosition: Math.max(0, Math.min(100, position)) }),
        setShowSplit: (show: boolean) => set({ showSplit: show }),
        setGridOverlay: (grid: GridOverlayType) => set({ gridOverlay: grid }),
        setShowZebra: (show: boolean) => set({ showZebra: show })
      }),
      {
        name: 'apex-photo-studio',
        partialize: (state) => ({
          // Only persist these fields
          currentView: state.currentView,
          adjustments: state.adjustments,
          gridOverlay: state.gridOverlay,
          showZebra: state.showZebra
        })
      }
    ),
    {
      name: 'APEX Photo Studio Store'
    }
  )
);

export default useAppStore;
