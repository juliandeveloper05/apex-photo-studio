/**
 * APEX Photo Studio - Core Type Definitions
 * 
 * Professional photo editing application types covering:
 * - Image data structures
 * - Adjustment settings (Lightroom-style controls)
 * - Camera capture settings
 * - Histogram and analysis data
 * - Preset management
 * - Export configuration
 */

// ============================================================================
// ADJUSTMENT SETTINGS
// ============================================================================

/**
 * Basic exposure and tone adjustments
 * All values are normalized ranges for consistent UI mapping
 */
export interface BasicAdjustments {
  /** Exposure compensation in EV (-5 to +5) */
  exposure: number;
  /** Contrast adjustment (-100 to +100) */
  contrast: number;
  /** Highlight recovery (-100 to +100) */
  highlights: number;
  /** Shadow lift (-100 to +100) */
  shadows: number;
  /** White point adjustment (-100 to +100) */
  whites: number;
  /** Black point adjustment (-100 to +100) */
  blacks: number;
}

/**
 * Color temperature and tint adjustments
 */
export interface ColorAdjustments {
  /** Color temperature in Kelvin (2000 to 50000) */
  temperature: number;
  /** Green-Magenta tint (-100 to +100) */
  tint: number;
  /** Saturation-aware saturation boost (-100 to +100) */
  vibrance: number;
  /** Linear saturation multiplier (-100 to +100) */
  saturation: number;
}

/**
 * Detail and sharpening adjustments
 */
export interface DetailAdjustments {
  /** Local contrast enhancement (-100 to +100) */
  clarity: number;
  /** Unsharp mask amount (0 to 150) */
  sharpness: number;
  /** Sharpening radius in pixels (0.5 to 3.0) */
  sharpnessRadius: number;
  /** Luminance noise reduction (0 to 100) */
  noiseReduction: number;
}

/**
 * HSL per-channel adjustments
 * Each color has Hue, Saturation, Luminance controls
 */
export interface HSLChannel {
  hue: number;       // -100 to +100 (degree shift normalized)
  saturation: number; // -100 to +100
  luminance: number;  // -100 to +100
}

export interface HSLAdjustments {
  red: HSLChannel;
  orange: HSLChannel;
  yellow: HSLChannel;
  green: HSLChannel;
  cyan: HSLChannel;
  blue: HSLChannel;
  purple: HSLChannel;
  magenta: HSLChannel;
}

/**
 * Tone curve control point
 */
export interface CurvePoint {
  x: number; // Input value 0-255
  y: number; // Output value 0-255
}

/**
 * Tone curves for master RGB and individual channels
 */
export interface CurveAdjustments {
  rgb: CurvePoint[];
  red: CurvePoint[];
  green: CurvePoint[];
  blue: CurvePoint[];
}

/**
 * Transform adjustments (crop, rotation, flip)
 */
export interface TransformAdjustments {
  crop: {
    x: number;           // Top-left X (0-1 normalized)
    y: number;           // Top-left Y (0-1 normalized)
    width: number;       // Width (0-1 normalized)
    height: number;      // Height (0-1 normalized)
    aspectRatio: number | null; // Locked ratio or null for free
  };
  rotation: number;        // Degrees (-180 to 180)
  flipHorizontal: boolean;
  flipVertical: boolean;
}

/**
 * Lens correction adjustments
 */
export interface LensCorrectionAdjustments {
  distortion: number;        // -100 to +100 (barrel/pincushion)
  chromaticAberration: {
    redCyan: number;         // -100 to +100
    blueYellow: number;      // -100 to +100
  };
}

/**
 * Effect adjustments (vignette, grain, etc.)
 */
export interface EffectAdjustments {
  /** Vignette amount (-100 to +100) */
  vignetteAmount: number;
  /** Vignette midpoint (0 to 100) */
  vignetteMidpoint: number;
  /** Vignette roundness (-100 to +100) */
  vignetteRoundness: number;
  /** Vignette feather (0 to 100) */
  vignetteFeather: number;
  /** Vignette highlight protection (0 to 100) */
  vignetteHighlightProtection: number;
  /** Film grain amount (0 to 100) */
  grainAmount: number;
  /** Film grain size (0 to 100) */
  grainSize: number;
  /** Film grain roughness (0 to 100) */
  grainRoughness: number;
  /** Monochrome grain */
  grainMonochrome: boolean;
  /** Dehaze strength (-100 to +100) */
  dehaze: number;
}

/**
 * Split toning for shadows and highlights
 */
export interface SplitToningAdjustments {
  highlightHue: number;       // 0 to 360
  highlightSaturation: number; // 0 to 100
  shadowHue: number;          // 0 to 360
  shadowSaturation: number;   // 0 to 100
  balance: number;            // -100 to +100
}

/**
 * Complete adjustment settings combining all adjustment types
 */
export interface AdjustmentSettings {
  basic: BasicAdjustments;
  color: ColorAdjustments;
  detail: DetailAdjustments;
  hsl: HSLAdjustments;
  curves: CurveAdjustments;
  effects: EffectAdjustments;
  splitToning: SplitToningAdjustments;
  transform: TransformAdjustments;
  lensCorrection: LensCorrectionAdjustments;
}

// ============================================================================
// CAMERA SETTINGS
// ============================================================================

/**
 * Camera capture configuration
 * Note: Some settings are simulated via post-processing
 */
export interface CameraSettings {
  /** Selected camera device ID */
  deviceId: string;
  /** Resolution preset */
  resolution: 'max' | '4k' | '2k' | '1080p' | '720p';
  /** Simulated ISO sensitivity (100 to 25600) */
  iso: number;
  /** Simulated shutter speed (1/8000 to 30s) */
  shutterSpeed: string;
  /** White balance preset or Kelvin value */
  whiteBalance: 'auto' | 'daylight' | 'cloudy' | 'tungsten' | 'fluorescent' | number;
  /** Exposure compensation EV (-3 to +3) */
  exposureCompensation: number;
  /** Auto/manual focus mode */
  focusMode: 'auto' | 'manual';
  /** Self-timer delay in seconds (0, 2, 5, 10) */
  timer: number;
  /** Burst mode shots count (1, 3, 5, 10) */
  burstCount: number;
  /** Bracketing EV steps (0 = off, 1, 2, 3) */
  bracketingEV: number;
}

// ============================================================================
// HISTOGRAM AND ANALYSIS
// ============================================================================

/**
 * Histogram data for a single channel
 * 256 bins representing pixel distribution
 */
export type HistogramChannel = number[];

/**
 * Complete histogram data with all channels
 */
export interface HistogramData {
  red: HistogramChannel;
  green: HistogramChannel;
  blue: HistogramChannel;
  luminance: HistogramChannel;
  /** Maximum value across all channels for normalization */
  max: number;
}

/**
 * Image statistics for analysis display
 */
export interface ImageStatistics {
  mean: { r: number; g: number; b: number; l: number };
  median: { r: number; g: number; b: number; l: number };
  stdDev: { r: number; g: number; b: number; l: number };
  clippedHighlights: number; // Percentage of pixels
  clippedShadows: number;    // Percentage of pixels
}

// ============================================================================
// PRESET SYSTEM
// ============================================================================

export type PresetCategory = 
  | 'portrait'
  | 'landscape'
  | 'blackAndWhite'
  | 'cinematic'
  | 'vintage'
  | 'custom';

/**
 * Preset definition for saving/loading adjustment configurations
 */
export interface Preset {
  id: string;
  name: string;
  category: PresetCategory;
  description?: string;
  author?: string;
  /** Partial adjustments - only includes changed values */
  adjustments: Partial<AdjustmentSettings>;
  /** Preview thumbnail as data URL */
  thumbnail?: string;
  /** User favorite flag */
  isFavorite?: boolean;
  /** Creation timestamp */
  createdAt: number;
  /** Last modified timestamp */
  updatedAt: number;
}

// ============================================================================
// EXPORT OPTIONS
// ============================================================================

export type ExportFormat = 'jpeg' | 'png' | 'webp' | 'avif';
export type ResizeAlgorithm = 'bilinear' | 'bicubic' | 'lanczos';
export type ColorSpace = 'srgb' | 'display-p3' | 'adobe-rgb';

export interface ExportOptions {
  format: ExportFormat;
  /** JPEG/WebP quality (1-100) */
  quality: number;
  /** Output resolution */
  resolution: 'original' | '4k' | '2k' | '1080p' | '720p' | 'custom';
  /** Custom width (when resolution is 'custom') */
  customWidth?: number;
  /** Custom height (when resolution is 'custom') */
  customHeight?: number;
  /** Resize algorithm */
  resizeAlgorithm: ResizeAlgorithm;
  /** Output color space */
  colorSpace: ColorSpace;
  /** Preserve EXIF metadata */
  preserveMetadata: boolean;
  /** Add watermark */
  watermark?: {
    text: string;
    position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
    opacity: number;
    fontSize: number;
  };
}

// ============================================================================
// UI STATE
// ============================================================================

export type AppMode = 'camera' | 'editor';
export type ComparisonMode = 'off' | 'split-vertical' | 'split-horizontal' | 'side-by-side';
export type GridType = 'none' | 'thirds' | 'golden' | 'diagonal' | 'center';

export interface UIState {
  mode: AppMode;
  zoom: number; // 0.25 to 4.0 (25% to 400%)
  panOffset: { x: number; y: number };
  comparisonMode: ComparisonMode;
  comparisonPosition: number; // 0-1 for split position
  showHistogram: boolean;
  showZebras: boolean;
  zebraThreshold: { high: number; low: number };
  gridType: GridType;
  activePanel: string | null;
}

// ============================================================================
// IMAGE DATA
// ============================================================================

/**
 * Extended image metadata
 */
export interface ImageMetadata {
  width: number;
  height: number;
  fileName?: string;
  fileSize?: number;
  captureDate?: Date;
  camera?: string;
  lens?: string;
  focalLength?: number;
  aperture?: number;
  shutterSpeed?: string;
  iso?: number;
  gps?: { latitude: number; longitude: number };
}

/**
 * Main image document structure
 */
export interface ImageDocument {
  id: string;
  /** Original unmodified image data */
  original: ImageData;
  /** Currently processed image data */
  processed: ImageData;
  /** Current adjustment settings */
  adjustments: AdjustmentSettings;
  /** Image metadata */
  metadata: ImageMetadata;
  /** Undo history stack */
  history: AdjustmentSettings[];
  /** Current position in history */
  historyIndex: number;
}

// ============================================================================
// DEFAULT VALUES
// ============================================================================

export const DEFAULT_BASIC_ADJUSTMENTS: BasicAdjustments = {
  exposure: 0,
  contrast: 0,
  highlights: 0,
  shadows: 0,
  whites: 0,
  blacks: 0,
};

export const DEFAULT_COLOR_ADJUSTMENTS: ColorAdjustments = {
  temperature: 6500,
  tint: 0,
  vibrance: 0,
  saturation: 0,
};

export const DEFAULT_DETAIL_ADJUSTMENTS: DetailAdjustments = {
  clarity: 0,
  sharpness: 0,
  sharpnessRadius: 1.0,
  noiseReduction: 0,
};

export const DEFAULT_HSL_CHANNEL: HSLChannel = {
  hue: 0,
  saturation: 0,
  luminance: 0,
};

export const DEFAULT_HSL_ADJUSTMENTS: HSLAdjustments = {
  red: { ...DEFAULT_HSL_CHANNEL },
  orange: { ...DEFAULT_HSL_CHANNEL },
  yellow: { ...DEFAULT_HSL_CHANNEL },
  green: { ...DEFAULT_HSL_CHANNEL },
  cyan: { ...DEFAULT_HSL_CHANNEL },
  blue: { ...DEFAULT_HSL_CHANNEL },
  purple: { ...DEFAULT_HSL_CHANNEL },
  magenta: { ...DEFAULT_HSL_CHANNEL },
};

export const DEFAULT_CURVE_POINTS: CurvePoint[] = [
  { x: 0, y: 0 },
  { x: 255, y: 255 },
];

export const DEFAULT_CURVE_ADJUSTMENTS: CurveAdjustments = {
  rgb: [...DEFAULT_CURVE_POINTS],
  red: [...DEFAULT_CURVE_POINTS],
  green: [...DEFAULT_CURVE_POINTS],
  blue: [...DEFAULT_CURVE_POINTS],
};

export const DEFAULT_EFFECT_ADJUSTMENTS: EffectAdjustments = {
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
};

export const DEFAULT_SPLIT_TONING: SplitToningAdjustments = {
  highlightHue: 0,
  highlightSaturation: 0,
  shadowHue: 0,
  shadowSaturation: 0,
  balance: 0,
};

export const DEFAULT_TRANSFORM_ADJUSTMENTS: TransformAdjustments = {
  crop: { x: 0, y: 0, width: 1, height: 1, aspectRatio: null },
  rotation: 0,
  flipHorizontal: false,
  flipVertical: false,
};

export const DEFAULT_LENS_CORRECTION: LensCorrectionAdjustments = {
  distortion: 0,
  chromaticAberration: { redCyan: 0, blueYellow: 0 },
};

export const DEFAULT_ADJUSTMENT_SETTINGS: AdjustmentSettings = {
  basic: DEFAULT_BASIC_ADJUSTMENTS,
  color: DEFAULT_COLOR_ADJUSTMENTS,
  detail: DEFAULT_DETAIL_ADJUSTMENTS,
  hsl: DEFAULT_HSL_ADJUSTMENTS,
  curves: DEFAULT_CURVE_ADJUSTMENTS,
  effects: DEFAULT_EFFECT_ADJUSTMENTS,
  splitToning: DEFAULT_SPLIT_TONING,
  transform: DEFAULT_TRANSFORM_ADJUSTMENTS,
  lensCorrection: DEFAULT_LENS_CORRECTION,
};

export const DEFAULT_CAMERA_SETTINGS: CameraSettings = {
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

export const DEFAULT_UI_STATE: UIState = {
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
