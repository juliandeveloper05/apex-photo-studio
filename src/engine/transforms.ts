/**
 * APEX Photo Studio - Geometric Transforms Engine
 * 
 * Image transformations including:
 * - Crop with normalized coordinates
 * - Rotation with bilinear interpolation
 * - Flip horizontal/vertical
 */

import type { TransformAdjustments } from '@/types';
import { clamp } from '@/utils/colorspace';

/**
 * Crop image to specified region
 * 
 * @param source - Source ImageData
 * @param crop - Crop parameters (normalized 0-1)
 * @returns Cropped ImageData
 */
export function cropImage(
  source: ImageData,
  crop: TransformAdjustments['crop']
): ImageData {
  const { width: srcW, height: srcH, data } = source;
  
  // Convert normalized coordinates to pixels
  const startX = Math.round(crop.x * srcW);
  const startY = Math.round(crop.y * srcH);
  const cropW = Math.round(crop.width * srcW);
  const cropH = Math.round(crop.height * srcH);
  
  // Clamp to valid range
  const sx = clamp(startX, 0, srcW);
  const sy = clamp(startY, 0, srcH);
  const w = clamp(cropW, 1, srcW - sx);
  const h = clamp(cropH, 1, srcH - sy);
  
  const output = new ImageData(w, h);
  const outData = output.data;
  
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const srcIdx = ((sy + y) * srcW + (sx + x)) * 4;
      const dstIdx = (y * w + x) * 4;
      
      outData[dstIdx] = data[srcIdx];
      outData[dstIdx + 1] = data[srcIdx + 1];
      outData[dstIdx + 2] = data[srcIdx + 2];
      outData[dstIdx + 3] = data[srcIdx + 3];
    }
  }
  
  return output;
}

/**
 * Rotate image by arbitrary angle
 * Uses bilinear interpolation for smooth results
 * 
 * @param source - Source ImageData
 * @param degrees - Rotation angle in degrees (positive = clockwise)
 * @returns Rotated ImageData
 */
export function rotateImage(source: ImageData, degrees: number): ImageData {
  if (degrees === 0) return cloneImageData(source);
  
  const { width: srcW, height: srcH, data } = source;
  const radians = (degrees * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  
  // Calculate new dimensions to fit rotated image
  const abscos = Math.abs(cos);
  const abssin = Math.abs(sin);
  const newW = Math.ceil(srcW * abscos + srcH * abssin);
  const newH = Math.ceil(srcW * abssin + srcH * abscos);
  
  const output = new ImageData(newW, newH);
  const outData = output.data;
  
  // Center points
  const srcCX = srcW / 2;
  const srcCY = srcH / 2;
  const dstCX = newW / 2;
  const dstCY = newH / 2;
  
  for (let y = 0; y < newH; y++) {
    for (let x = 0; x < newW; x++) {
      // Translate to center, rotate (inverse), translate back
      const dx = x - dstCX;
      const dy = y - dstCY;
      
      // Inverse rotation to find source coordinates
      const srcX = cos * dx + sin * dy + srcCX;
      const srcY = -sin * dx + cos * dy + srcCY;
      
      const dstIdx = (y * newW + x) * 4;
      
      // Check bounds
      if (srcX < 0 || srcX >= srcW || srcY < 0 || srcY >= srcH) {
        // Transparent pixel outside source
        outData[dstIdx] = 0;
        outData[dstIdx + 1] = 0;
        outData[dstIdx + 2] = 0;
        outData[dstIdx + 3] = 0;
        continue;
      }
      
      // Bilinear interpolation
      const x0 = Math.floor(srcX);
      const y0 = Math.floor(srcY);
      const x1 = Math.min(x0 + 1, srcW - 1);
      const y1 = Math.min(y0 + 1, srcH - 1);
      
      const fx = srcX - x0;
      const fy = srcY - y0;
      
      const idx00 = (y0 * srcW + x0) * 4;
      const idx10 = (y0 * srcW + x1) * 4;
      const idx01 = (y1 * srcW + x0) * 4;
      const idx11 = (y1 * srcW + x1) * 4;
      
      for (let c = 0; c < 4; c++) {
        const v00 = data[idx00 + c];
        const v10 = data[idx10 + c];
        const v01 = data[idx01 + c];
        const v11 = data[idx11 + c];
        
        const v = (1 - fx) * (1 - fy) * v00 +
                  fx * (1 - fy) * v10 +
                  (1 - fx) * fy * v01 +
                  fx * fy * v11;
        
        outData[dstIdx + c] = Math.round(v);
      }
    }
  }
  
  return output;
}

/**
 * Flip image horizontally
 */
export function flipHorizontal(source: ImageData): ImageData {
  const { width, height, data } = source;
  const output = new ImageData(width, height);
  const outData = output.data;
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const srcIdx = (y * width + x) * 4;
      const dstIdx = (y * width + (width - 1 - x)) * 4;
      
      outData[dstIdx] = data[srcIdx];
      outData[dstIdx + 1] = data[srcIdx + 1];
      outData[dstIdx + 2] = data[srcIdx + 2];
      outData[dstIdx + 3] = data[srcIdx + 3];
    }
  }
  
  return output;
}

/**
 * Flip image vertically
 */
export function flipVertical(source: ImageData): ImageData {
  const { width, height, data } = source;
  const output = new ImageData(width, height);
  const outData = output.data;
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const srcIdx = (y * width + x) * 4;
      const dstIdx = ((height - 1 - y) * width + x) * 4;
      
      outData[dstIdx] = data[srcIdx];
      outData[dstIdx + 1] = data[srcIdx + 1];
      outData[dstIdx + 2] = data[srcIdx + 2];
      outData[dstIdx + 3] = data[srcIdx + 3];
    }
  }
  
  return output;
}

/**
 * Apply all transforms to an image
 */
export function applyTransforms(
  source: ImageData,
  transform: TransformAdjustments
): ImageData {
  let result = source;
  
  // Apply rotation first
  if (transform.rotation !== 0) {
    result = rotateImage(result, transform.rotation);
  }
  
  // Apply flips
  if (transform.flipHorizontal) {
    result = flipHorizontal(result);
  }
  if (transform.flipVertical) {
    result = flipVertical(result);
  }
  
  // Apply crop last (if not full image)
  const { crop } = transform;
  if (crop.x !== 0 || crop.y !== 0 || crop.width !== 1 || crop.height !== 1) {
    result = cropImage(result, crop);
  }
  
  return result;
}

/**
 * Clone ImageData
 */
function cloneImageData(source: ImageData): ImageData {
  const clone = new ImageData(source.width, source.height);
  clone.data.set(source.data);
  return clone;
}
