/**
 * APEX Photo Studio - Global State Management
 * 
 * Zustand store for managing application state including:
 * - Current image data (original and processed)
 * - Adjustment settings
 * - UI state (mode, zoom, overlays)
 * - History for undo/redo
 */

import { create } from 'zustand';
import type { 
  AdjustmentSettings, 
  UIState, 
  CameraSettings,
  HistogramData
} from '@/types';

interface ImageState {
  original: ImageData | null;
  processed: ImageData | null;
  fileName: string | null;
}

interface HistoryEntry {
  adjustments: AdjustmentSettings;
  timestamp: number;
}

interface ImageStore {
  // Image state
  image: ImageState;
  setOriginalImage: (data: ImageData, fileName?: string) => void;
  setProcessedImage: (data: ImageData) => void;
  clearImage: () => void;
  
  // Adjustments
  adjustments: AdjustmentSettings;
  setAdjustments: (adjustments: Partial<AdjustmentSettings>) => void;
  resetAdjustments: () => void;
  
  // UI State
  ui: UIState;
  setUIState: (state: Partial<UIState>) => void;
  
  // Camera
  camera: CameraSettings;
  setCameraSettings: (settings: Partial<CameraSettings>) => void;
  
  // Histogram
  histogram: HistogramData | null;
  setHistogram: (data: HistogramData) => void;
  
  // History
  history: HistoryEntry[];
  historyIndex: number;
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

const defaultAdjustments: AdjustmentSettings = {
  basic: {
    exposure: 0,
    contrast: 0,
    highlights: 0,
    shadows: 0,
    whites: 0,
    blacks: 0,
  },
  color: {
    temperature: 6500,
    tint: 0,
    vibrance: 0,
    saturation: 0,
  },
  detail: {
    clarity: 0,
    sharpness: 0,
    sharpnessRadius: 1.0,
    noiseReduction: 0,
  },
  hsl: {
    red: { hue: 0, saturation: 0, luminance: 0 },
    orange: { hue: 0, saturation: 0, luminance: 0 },
    yellow: { hue: 0, saturation: 0, luminance: 0 },
    green: { hue: 0, saturation: 0, luminance: 0 },
    cyan: { hue: 0, saturation: 0, luminance: 0 },
    blue: { hue: 0, saturation: 0, luminance: 0 },
    purple: { hue: 0, saturation: 0, luminance: 0 },
    magenta: { hue: 0, saturation: 0, luminance: 0 },
  },
  curves: {
    rgb: [{ x: 0, y: 0 }, { x: 255, y: 255 }],
    red: [{ x: 0, y: 0 }, { x: 255, y: 255 }],
    green: [{ x: 0, y: 0 }, { x: 255, y: 255 }],
    blue: [{ x: 0, y: 0 }, { x: 255, y: 255 }],
  },
  effects: {
    vignetteAmount: 0,
    vignetteMidpoint: 50,
    vignetteRoundness: 0,
    vignetteFeather: 50,
    vignetteHighlightProtection: 0,
    grainAmount: 0,
    grainSize: 25,
    grainRoughness: 50,
    grainMonochrome: true,
    dehaze: 0,
  },
  splitToning: {
    highlightHue: 0,
    highlightSaturation: 0,
    shadowHue: 0,
    shadowSaturation: 0,
    balance: 0,
  },
  transform: {
    crop: { x: 0, y: 0, width: 1, height: 1, aspectRatio: null },
    rotation: 0,
    flipHorizontal: false,
    flipVertical: false,
  },
  lensCorrection: {
    distortion: 0,
    chromaticAberration: { redCyan: 0, blueYellow: 0 },
  },
};

const defaultUI: UIState = {
  mode: 'camera',
  zoom: 1,
  panOffset: { x: 0, y: 0 },
  comparisonMode: 'off',
  comparisonPosition: 0.5,
  showHistogram: true,
  showZebras: false,
  zebraThreshold: { high: 250, low: 5 },
  gridType: 'none',
  activePanel: 'basic',
};

const defaultCamera: CameraSettings = {
  deviceId: '',
  resolution: 'max',
  iso: 100,
  shutterSpeed: '1/125',
  whiteBalance: 'auto',
  exposureCompensation: 0,
  focusMode: 'auto',
  timer: 0,
  burstCount: 1,
  bracketingEV: 0,
};

export const useImageStore = create<ImageStore>()((set, get) => ({
    // Image state
    image: {
      original: null,
      processed: null,
      fileName: null,
    },
    
    setOriginalImage: (data: ImageData, fileName?: string) => {
      set({
        image: {
          original: data,
          processed: data,
          fileName: fileName || null,
        },
        history: [],
        historyIndex: -1,
      });
    },
    
    setProcessedImage: (data: ImageData) => {
      set((state) => ({
        image: { ...state.image, processed: data },
      }));
    },
    
    clearImage: () => {
      set({
        image: { original: null, processed: null, fileName: null },
        adjustments: { ...defaultAdjustments },
        history: [],
        historyIndex: -1,
      });
    },
    
    // Adjustments
    adjustments: { ...defaultAdjustments },
    
    setAdjustments: (newAdjustments: Partial<AdjustmentSettings>) => {
      set((state) => ({
        adjustments: {
          ...state.adjustments,
          ...newAdjustments,
          basic: { ...state.adjustments.basic, ...newAdjustments.basic },
          color: { ...state.adjustments.color, ...newAdjustments.color },
          detail: { ...state.adjustments.detail, ...newAdjustments.detail },
          hsl: { ...state.adjustments.hsl, ...newAdjustments.hsl },
          curves: { ...state.adjustments.curves, ...newAdjustments.curves },
          effects: { ...state.adjustments.effects, ...newAdjustments.effects },
          splitToning: { ...state.adjustments.splitToning, ...newAdjustments.splitToning },
          transform: { 
            ...state.adjustments.transform, 
            ...newAdjustments.transform,
            crop: { 
              ...state.adjustments.transform.crop, 
              ...newAdjustments.transform?.crop 
            },
          },
          lensCorrection: { 
            ...state.adjustments.lensCorrection, 
            ...newAdjustments.lensCorrection,
            chromaticAberration: {
              ...state.adjustments.lensCorrection.chromaticAberration,
              ...newAdjustments.lensCorrection?.chromaticAberration,
            },
          },
        },
      }));
    },
    
    resetAdjustments: () => {
      set({ adjustments: { ...defaultAdjustments } });
    },
    
    // UI State
    ui: { ...defaultUI },
    
    setUIState: (newState: Partial<UIState>) => {
      set((state) => ({
        ui: { ...state.ui, ...newState },
      }));
    },
    
    // Camera
    camera: { ...defaultCamera },
    
    setCameraSettings: (settings: Partial<CameraSettings>) => {
      set((state) => ({
        camera: { ...state.camera, ...settings },
      }));
    },
    
    // Histogram
    histogram: null,
    
    setHistogram: (data: HistogramData) => {
      set({ histogram: data });
    },
    
    // History
    history: [],
    historyIndex: -1,
    
    pushHistory: () => {
      const { adjustments, history, historyIndex } = get();
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push({
        adjustments: JSON.parse(JSON.stringify(adjustments)),
        timestamp: Date.now(),
      });
      
      // Limit history to 50 entries
      if (newHistory.length > 50) {
        newHistory.shift();
      }
      
      set({
        history: newHistory,
        historyIndex: newHistory.length - 1,
      });
    },
    
    undo: () => {
      const { history, historyIndex } = get();
      if (historyIndex > 0) {
        const prevEntry = history[historyIndex - 1];
        set({
          adjustments: JSON.parse(JSON.stringify(prevEntry.adjustments)),
          historyIndex: historyIndex - 1,
        });
      }
    },
    
    redo: () => {
      const { history, historyIndex } = get();
      if (historyIndex < history.length - 1) {
        const nextEntry = history[historyIndex + 1];
        set({
          adjustments: JSON.parse(JSON.stringify(nextEntry.adjustments)),
          historyIndex: historyIndex + 1,
        });
      }
    },
    
    canUndo: () => get().historyIndex > 0,
    canRedo: () => get().historyIndex < get().history.length - 1,
  }));

