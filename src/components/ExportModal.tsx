/**
 * APEX Photo Studio - Export Modal Component
 * 
 * Export dialog with:
 * - Format selection (JPEG, PNG, WebP)
 * - Quality slider
 * - Resolution presets
 * - Download functionality
 */

import { useState, useCallback, useMemo } from 'react';
import { Download, X, Image, FileImage, Sparkles } from 'lucide-react';
import { useImageStore } from '@/hooks/useImageStore';
import { saveAs } from 'file-saver';

type ExportFormat = 'jpeg' | 'png' | 'webp';

interface Resolution {
  label: string;
  width: number | null;
  height: number | null;
}

const RESOLUTIONS: Resolution[] = [
  { label: 'Original', width: null, height: null },
  { label: '4K (3840×2160)', width: 3840, height: 2160 },
  { label: '2K (2560×1440)', width: 2560, height: 1440 },
  { label: '1080p (1920×1080)', width: 1920, height: 1080 },
  { label: '720p (1280×720)', width: 1280, height: 720 },
  { label: 'Instagram Square', width: 1080, height: 1080 },
  { label: 'Instagram Portrait', width: 1080, height: 1350 },
  { label: 'Instagram Story', width: 1080, height: 1920 },
];

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ExportModal({ isOpen, onClose }: ExportModalProps) {
  const { image } = useImageStore();
  const [format, setFormat] = useState<ExportFormat>('jpeg');
  const [quality, setQuality] = useState(90);
  const [resolutionIndex, setResolutionIndex] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  
  // Get current image dimensions
  const originalWidth = image.processed?.width || 0;
  const originalHeight = image.processed?.height || 0;
  
  // Calculate output dimensions
  const outputDimensions = useMemo(() => {
    const resolution = RESOLUTIONS[resolutionIndex];
    
    if (!resolution.width || !resolution.height) {
      return { width: originalWidth, height: originalHeight };
    }
    
    // Maintain aspect ratio
    const aspectRatio = originalWidth / originalHeight;
    const targetAspect = resolution.width / resolution.height;
    
    if (aspectRatio > targetAspect) {
      // Image is wider - fit to width
      return {
        width: resolution.width,
        height: Math.round(resolution.width / aspectRatio),
      };
    } else {
      // Image is taller - fit to height
      return {
        width: Math.round(resolution.height * aspectRatio),
        height: resolution.height,
      };
    }
  }, [resolutionIndex, originalWidth, originalHeight]);
  
  // Estimate file size
  const estimatedSize = useMemo(() => {
    const pixels = outputDimensions.width * outputDimensions.height;
    
    if (format === 'png') {
      // PNG is lossless, roughly 3 bytes per pixel (compressed)
      return pixels * 0.5;
    } else if (format === 'webp') {
      // WebP is ~30% smaller than JPEG at same quality
      return pixels * 3 * (quality / 100) * 0.15;
    } else {
      // JPEG estimation
      return pixels * 3 * (quality / 100) * 0.2;
    }
  }, [format, quality, outputDimensions]);
  
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };
  
  const handleExport = useCallback(async () => {
    if (!image.processed) return;
    
    setIsExporting(true);
    
    try {
      // Create a canvas with the output dimensions
      const canvas = document.createElement('canvas');
      canvas.width = outputDimensions.width;
      canvas.height = outputDimensions.height;
      const ctx = canvas.getContext('2d')!;
      
      // If we need to resize, we need to draw the image scaled
      if (outputDimensions.width !== originalWidth || outputDimensions.height !== originalHeight) {
        // Create temp canvas with original image
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = originalWidth;
        tempCanvas.height = originalHeight;
        const tempCtx = tempCanvas.getContext('2d')!;
        tempCtx.putImageData(image.processed, 0, 0);
        
        // Draw scaled to output canvas
        ctx.drawImage(tempCanvas, 0, 0, outputDimensions.width, outputDimensions.height);
      } else {
        ctx.putImageData(image.processed, 0, 0);
      }
      
      // Get mime type
      const mimeType = format === 'jpeg' ? 'image/jpeg' : 
                       format === 'png' ? 'image/png' : 
                       'image/webp';
      
      // Convert to blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          blob => blob ? resolve(blob) : reject(new Error('Failed to create blob')),
          mimeType,
          format === 'png' ? undefined : quality / 100
        );
      });
      
      // Generate filename
      const baseName = image.fileName?.replace(/\.[^.]+$/, '') || 'apex-export';
      const extension = format === 'jpeg' ? 'jpg' : format;
      const fileName = `${baseName}-${outputDimensions.width}x${outputDimensions.height}.${extension}`;
      
      // Download
      saveAs(blob, fileName);
      
      onClose();
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  }, [image, format, quality, outputDimensions, originalWidth, originalHeight, onClose]);
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 glass-panel rounded-xl shadow-2xl animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--apex-border)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
              <Download className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[var(--apex-text-primary)]">Export Image</h2>
              <p className="text-[10px] text-[var(--apex-text-muted)]">
                {originalWidth} × {originalHeight} px
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[var(--apex-bg-hover)] transition-colors"
          >
            <X className="w-4 h-4 text-[var(--apex-text-muted)]" />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Format Selection */}
          <div>
            <label className="text-[10px] text-[var(--apex-text-secondary)] font-medium uppercase tracking-wider mb-2 block">
              Format
            </label>
            <div className="flex gap-2">
              {(['jpeg', 'png', 'webp'] as ExportFormat[]).map(f => (
                <button
                  key={f}
                  onClick={() => setFormat(f)}
                  className={`flex-1 py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-2 ${
                    format === f 
                      ? 'bg-[var(--apex-accent)] text-white' 
                      : 'bg-[var(--apex-bg-dark)] text-[var(--apex-text-muted)] hover:bg-[var(--apex-bg-hover)]'
                  }`}
                >
                  {f === 'jpeg' && <Image className="w-3.5 h-3.5" />}
                  {f === 'png' && <FileImage className="w-3.5 h-3.5" />}
                  {f === 'webp' && <Sparkles className="w-3.5 h-3.5" />}
                  <span className="text-xs font-medium uppercase">{f}</span>
                </button>
              ))}
            </div>
          </div>
          
          {/* Quality Slider (for lossy formats) */}
          {format !== 'png' && (
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-[10px] text-[var(--apex-text-secondary)] font-medium uppercase tracking-wider">
                  Quality
                </label>
                <span className="text-xs text-[var(--apex-text-primary)] font-mono">{quality}%</span>
              </div>
              <input
                type="range"
                min={1}
                max={100}
                value={quality}
                onChange={e => setQuality(parseInt(e.target.value))}
                className="w-full h-1.5 bg-[var(--apex-bg-dark)] rounded-full appearance-none cursor-pointer
                           [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 
                           [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full 
                           [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2
                           [&::-webkit-slider-thumb]:border-[var(--apex-accent)] [&::-webkit-slider-thumb]:cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-[var(--apex-text-dim)] mt-1">
                <span>Smaller file</span>
                <span>Better quality</span>
              </div>
            </div>
          )}
          
          {/* Resolution */}
          <div>
            <label className="text-[10px] text-[var(--apex-text-secondary)] font-medium uppercase tracking-wider mb-2 block">
              Resolution
            </label>
            <select
              value={resolutionIndex}
              onChange={e => setResolutionIndex(parseInt(e.target.value))}
              className="w-full py-2 px-3 rounded-lg bg-[var(--apex-bg-dark)] border border-[var(--apex-border)]
                         text-xs text-[var(--apex-text-primary)] cursor-pointer
                         focus:outline-none focus:border-[var(--apex-accent)]"
            >
              {RESOLUTIONS.map((res, i) => (
                <option key={i} value={i}>{res.label}</option>
              ))}
            </select>
          </div>
          
          {/* Output Info */}
          <div className="bg-[var(--apex-bg-dark)] rounded-lg p-3">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-[var(--apex-text-muted)]">Output size:</span>
              <span className="text-[var(--apex-text-primary)] font-mono">
                {outputDimensions.width} × {outputDimensions.height} px
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-[var(--apex-text-muted)]">Estimated file size:</span>
              <span className="text-[var(--apex-text-primary)] font-mono">
                ~{formatFileSize(estimatedSize)}
              </span>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-[var(--apex-border)] flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg bg-[var(--apex-bg-dark)] text-[var(--apex-text-secondary)]
                       text-xs font-medium hover:bg-[var(--apex-bg-hover)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting || !image.processed}
            className="flex-1 py-2.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-white
                       text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-50
                       flex items-center justify-center gap-2"
          >
            {isExporting ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                Export
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
