/**
 * APEX Photo Studio - Core Image Processing Engine
 * 
 * Main entry point for all image processing operations.
 * Orchestrates the adjustment pipeline and manages processing state.
 * 
 * Pipeline Order:
 * 1. Lens Correction (distortion, CA)
 * 2. Temperature & Tint
 * 3. Exposure & Contrast
 * 4. Highlights/Shadows/Whites/Blacks
 * 5. Curves
 * 6. HSL per-color
 * 7. Vibrance & Saturation
 * 8. Split Toning
 * 9. Effects (Vignette, Dehaze)
 * 10. Grain (last)
 */

import type { AdjustmentSettings } from '@/types';
import { clamp, normalizeRgb, denormalizeRgb, getLuminance } from '@/utils/colorspace';
import { 
  adjustHighlights, 
  adjustShadows, 
  adjustWhites, 
  adjustBlacks,
  adjustTemperature,
  adjustTint,
  adjustVibrance,
  adjustSaturation,
  applyHSLAdjustments,
  applyCurveAdjustments,
  calculateVignette,
  applyVignette,
  applyDehaze,
  applyGrain,
  applySplitToning,
  correctDistortion,
  getChromaticAberrationFactors,
  sampleBilinear,
} from './adjustments';

/**
 * Clone ImageData for non-destructive editing
 */
export function cloneImageData(source: ImageData): ImageData {
  const clone = new ImageData(source.width, source.height);
  clone.data.set(source.data);
  return clone;
}

/**
 * Process a single pixel with all basic adjustments (without position-dependent effects)
 */
function processPixel(
  r: number, g: number, b: number,
  settings: AdjustmentSettings
): { r: number; g: number; b: number } {
  const { basic, color, hsl, curves, effects, splitToning } = settings;
  let rgb = normalizeRgb(r, g, b);
  
  // 1. Temperature
  rgb = adjustTemperature(rgb, color.temperature);
  
  // 2. Tint
  rgb = adjustTint(rgb, color.tint);
  
  // 3. Exposure
  const expMultiplier = Math.pow(2, basic.exposure);
  rgb = {
    r: clamp(rgb.r * expMultiplier, 0, 1),
    g: clamp(rgb.g * expMultiplier, 0, 1),
    b: clamp(rgb.b * expMultiplier, 0, 1),
  };
  
  // 4. Contrast
  if (basic.contrast !== 0) {
    const factor = (basic.contrast + 100) / 100;
    rgb = {
      r: clamp((rgb.r - 0.5) * factor + 0.5, 0, 1),
      g: clamp((rgb.g - 0.5) * factor + 0.5, 0, 1),
      b: clamp((rgb.b - 0.5) * factor + 0.5, 0, 1),
    };
  }
  
  // 5. Tonal adjustments
  rgb = adjustHighlights(rgb, basic.highlights);
  rgb = adjustShadows(rgb, basic.shadows);
  rgb = adjustWhites(rgb, basic.whites);
  rgb = adjustBlacks(rgb, basic.blacks);
  
  // 6. Curves
  rgb = applyCurveAdjustments(rgb, curves);
  
  // 7. HSL per-color
  rgb = applyHSLAdjustments(rgb, hsl);
  
  // 8. Vibrance & Saturation
  rgb = adjustVibrance(rgb, color.vibrance);
  rgb = adjustSaturation(rgb, color.saturation);
  
  // 9. Split Toning
  rgb = applySplitToning(rgb, splitToning);
  
  // 10. Dehaze
  rgb = applyDehaze(rgb, effects.dehaze);
  
  return denormalizeRgb(rgb);
}

/**
 * Process entire image with all adjustments
 */
export function processImage(
  source: ImageData,
  settings: AdjustmentSettings
): ImageData {
  const { width, height, data } = source;
  let output = new ImageData(width, height);
  let outData = output.data;
  
  const { effects, lensCorrection } = settings;
  
  // Check if lens correction is needed
  const needsLensCorrection = 
    lensCorrection.distortion !== 0 || 
    lensCorrection.chromaticAberration.redCyan !== 0 ||
    lensCorrection.chromaticAberration.blueYellow !== 0;
  
  // Pre-calculate CA factors
  const caFactors = needsLensCorrection ? 
    getChromaticAberrationFactors(
      lensCorrection.chromaticAberration.redCyan,
      lensCorrection.chromaticAberration.blueYellow
    ) : { r: 1, g: 1, b: 1 };
  
  // Random seed for grain (changes each render for animation effect)
  const grainSeed = Date.now() % 10000;
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      
      let r: number, g: number, b: number;
      
      if (needsLensCorrection) {
        // Normalize coordinates to -1 to 1
        const nx = (x / width - 0.5) * 2;
        const ny = (y / height - 0.5) * 2;
        
        // Apply distortion correction
        const corrected = correctDistortion(nx, ny, lensCorrection.distortion);
        
        // Sample each channel with CA offset
        const srcRX = ((corrected.x * caFactors.r) / 2 + 0.5) * width;
        const srcRY = ((corrected.y * caFactors.r) / 2 + 0.5) * height;
        const srcGX = ((corrected.x * caFactors.g) / 2 + 0.5) * width;
        const srcGY = ((corrected.y * caFactors.g) / 2 + 0.5) * height;
        const srcBX = ((corrected.x * caFactors.b) / 2 + 0.5) * width;
        const srcBY = ((corrected.y * caFactors.b) / 2 + 0.5) * height;
        
        r = sampleBilinear(data, width, height, srcRX, srcRY, 0);
        g = sampleBilinear(data, width, height, srcGX, srcGY, 1);
        b = sampleBilinear(data, width, height, srcBX, srcBY, 2);
      } else {
        r = data[i];
        g = data[i + 1];
        b = data[i + 2];
      }
      
      // Apply non-position-dependent adjustments
      const result = processPixel(r, g, b, settings);
      
      // Convert to normalized for remaining adjustments
      let rgb = normalizeRgb(result.r, result.g, result.b);
      
      // Apply vignette (position-dependent)
      if (effects.vignetteAmount !== 0) {
        const vignetteFactor = calculateVignette(x, y, width, height, effects);
        const luminance = getLuminance(rgb);
        rgb = applyVignette(rgb, luminance, vignetteFactor, effects.vignetteHighlightProtection);
      }
      
      // Apply grain (position-dependent, last effect)
      if (effects.grainAmount > 0) {
        rgb = applyGrain(
          rgb, x, y, 
          effects.grainAmount, 
          effects.grainSize,
          effects.grainRoughness,
          effects.grainMonochrome,
          grainSeed
        );
      }
      
      const final = denormalizeRgb(rgb);
      outData[i] = final.r;
      outData[i + 1] = final.g;
      outData[i + 2] = final.b;
      outData[i + 3] = data[i + 3]; // Preserve alpha
    }
  }
  
  return output;
}

/**
 * Process image in tiles for large images
 * Note: This simple tiled version doesn't apply position-dependent effects like vignette correctly
 * For full accuracy with all effects, use processImage instead
 */
export function processImageTiled(
  source: ImageData,
  settings: AdjustmentSettings,
  _tileSize: number = 256,
  onProgress?: (progress: number) => void
): ImageData {
  // For now, delegate to the full processImage since we have position-dependent effects
  // TODO: Implement proper tiled processing with vignette/grain coordinate tracking
  onProgress?.(0);
  const result = processImage(source, settings);
  onProgress?.(1);
  return result;
}

/**
 * Apply gaussian blur for clarity/sharpening
 */
export function applyGaussianBlur(
  source: ImageData,
  radius: number
): ImageData {
  const { data, width, height } = source;
  const output = new ImageData(width, height);
  const outData = output.data;
  
  // Generate gaussian kernel
  const size = Math.ceil(radius * 3) * 2 + 1;
  const kernel: number[] = [];
  const sigma = radius / 3;
  let sum = 0;
  
  for (let i = 0; i < size; i++) {
    const x = i - Math.floor(size / 2);
    const g = Math.exp(-(x * x) / (2 * sigma * sigma));
    kernel.push(g);
    sum += g;
  }
  
  // Normalize kernel
  for (let i = 0; i < size; i++) {
    kernel[i] /= sum;
  }
  
  // Horizontal pass
  const temp = new Float32Array(data.length);
  const halfSize = Math.floor(size / 2);
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0;
      
      for (let k = 0; k < size; k++) {
        const sx = clamp(x + k - halfSize, 0, width - 1);
        const i = (y * width + sx) * 4;
        r += data[i] * kernel[k];
        g += data[i + 1] * kernel[k];
        b += data[i + 2] * kernel[k];
      }
      
      const i = (y * width + x) * 4;
      temp[i] = r;
      temp[i + 1] = g;
      temp[i + 2] = b;
      temp[i + 3] = data[i + 3];
    }
  }
  
  // Vertical pass
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0;
      
      for (let k = 0; k < size; k++) {
        const sy = clamp(y + k - halfSize, 0, height - 1);
        const i = (sy * width + x) * 4;
        r += temp[i] * kernel[k];
        g += temp[i + 1] * kernel[k];
        b += temp[i + 2] * kernel[k];
      }
      
      const i = (y * width + x) * 4;
      outData[i] = clamp(Math.round(r), 0, 255);
      outData[i + 1] = clamp(Math.round(g), 0, 255);
      outData[i + 2] = clamp(Math.round(b), 0, 255);
      outData[i + 3] = temp[i + 3];
    }
  }
  
  return output;
}

/**
 * Apply unsharp mask for sharpening
 */
export function applyUnsharpMask(
  source: ImageData,
  amount: number,
  radius: number,
  threshold: number
): ImageData {
  const blurred = applyGaussianBlur(source, radius);
  const { data, width, height } = source;
  const blurData = blurred.data;
  const output = new ImageData(width, height);
  const outData = output.data;
  
  const factor = amount / 100;
  
  for (let i = 0; i < data.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      const orig = data[i + c];
      const blur = blurData[i + c];
      const diff = orig - blur;
      
      if (Math.abs(diff) > threshold) {
        outData[i + c] = clamp(Math.round(orig + diff * factor), 0, 255);
      } else {
        outData[i + c] = orig;
      }
    }
    outData[i + 3] = data[i + 3];
  }
  
  return output;
}
