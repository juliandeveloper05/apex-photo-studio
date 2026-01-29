/**
 * APEX Photo Studio v1.1.0 - Editor Component
 * Editor principal con preview en tiempo real, before/after split draggable,
 * zoom & pan suave, grid overlays, zebra patterns e histograma en vivo.
 */

import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from 'framer-motion';
import {
  ZoomIn,
  ZoomOut,
  Maximize,
  Grid3x3,
  Layers,
  Sun,
  Contrast,
  Droplets,
  Move,
  Split,
  Eye,
  EyeOff,
  RotateCcw
} from 'lucide-react';
import { useImageStore } from '@/hooks/useImageStore';
import { processImage } from '@/engine/imageProcessing';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface AdjustmentState {
  exposure: number;
  contrast: number;
  highlights: number;
  shadows: number;
  whites: number;
  blacks: number;
  temperature: number;
  tint: number;
  saturation: number;
  vibrance: number;
  clarity: number;
  sharpness: number;
  noiseReduction: number;
  hsl: {
    red: { hue: number; saturation: number; lightness: number };
    orange: { hue: number; saturation: number; lightness: number };
    yellow: { hue: number; saturation: number; lightness: number };
    green: { hue: number; saturation: number; lightness: number };
    aqua: { hue: number; saturation: number; lightness: number };
    blue: { hue: number; saturation: number; lightness: number };
    purple: { hue: number; saturation: number; lightness: number };
    magenta: { hue: number; saturation: number; lightness: number };
  };
}

export interface EditorProps {
  /** URL de la imagen a editar */
  imageSrc?: string;
  /** URL de la imagen original (para before/after) */
  originalSrc?: string;
  /** Estado actual de ajustes */
  adjustments?: AdjustmentState;
  /** Mostrar modo before/after */
  showSplit?: boolean;
  /** Posición del split (0-100) */
  splitPosition?: number;
  /** Nivel de zoom (0.1-5) */
  zoom?: number;
  /** Posición de pan */
  pan?: { x: number; y: number };
  /** Tipo de grid overlay */
  gridOverlay?: 'none' | 'rule-thirds' | 'golden' | 'grid' | 'diagonal';
  /** Mostrar zebra patterns */
  showZebra?: boolean;
  /** Mostrar histograma */
  showHistogram?: boolean;
  /** Callback al cambiar ajustes */
  onAdjustmentsChange?: (adj: AdjustmentState) => void;
  /** Callback al cambiar zoom */
  onZoomChange?: (zoom: number) => void;
  /** Callback al cambiar pan */
  onPanChange?: (pan: { x: number; y: number }) => void;
  /** Callback al cambiar split position */
  onSplitPositionChange?: (position: number) => void;
  /** Clase CSS adicional */
  className?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_ADJUSTMENTS: AdjustmentState = {
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
    red: { hue: 0, saturation: 0, lightness: 0 },
    orange: { hue: 0, saturation: 0, lightness: 0 },
    yellow: { hue: 0, saturation: 0, lightness: 0 },
    green: { hue: 0, saturation: 0, lightness: 0 },
    aqua: { hue: 0, saturation: 0, lightness: 0 },
    blue: { hue: 0, saturation: 0, lightness: 0 },
    purple: { hue: 0, saturation: 0, lightness: 0 },
    magenta: { hue: 0, saturation: 0, lightness: 0 }
  }
};

const ZOOM_MIN = 0.1;
const ZOOM_MAX = 5;
const ZOOM_STEP = 0.1;

// ============================================================================
// ANIMATION VARIANTS
// ============================================================================

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.3, ease: 'easeOut' as const }
  },
  exit: { opacity: 0, transition: { duration: 0.2 } }
};

const toolbarVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.28,
      ease: 'easeOut' as const,
      staggerChildren: 0.03
    }
  }
};

const toolButtonVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { opacity: 1, scale: 1 },
  hover: {
    scale: 1.05,
    transition: { type: 'spring' as const, stiffness: 400, damping: 20 }
  },
  tap: { scale: 0.95 }
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface HistogramProps {
  data: number[];
  width?: number;
  height?: number;
}

const Histogram: React.FC<HistogramProps> = ({ data, width = 200, height = 60 }) => {
  const maxValue = Math.max(...data, 1);
  const barWidth = width / data.length;

  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id="histogramGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0.2" />
        </linearGradient>
      </defs>
      {data.map((value, i) => {
        const barHeight = (value / maxValue) * height;
        return (
          <motion.rect
            key={i}
            x={i * barWidth}
            y={height - barHeight}
            width={barWidth - 0.5}
            height={barHeight}
            fill="url(#histogramGradient)"
            initial={{ height: 0, y: height }}
            animate={{ height: barHeight, y: height - barHeight }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
          />
        );
      })}
    </svg>
  );
};

interface GridOverlayProps {
  type: 'none' | 'rule-thirds' | 'golden' | 'grid' | 'diagonal';
  width: number;
  height: number;
}

const GridOverlay: React.FC<GridOverlayProps> = ({ type, width, height }) => {
  if (type === 'none') return null;

  const strokeColor = 'rgba(255, 255, 255, 0.4)';
  const strokeWidth = 1;

  const renderGrid = () => {
    switch (type) {
      case 'rule-thirds':
        return (
          <>
            <line x1={width / 3} y1={0} x2={width / 3} y2={height} stroke={strokeColor} strokeWidth={strokeWidth} />
            <line x1={(width / 3) * 2} y1={0} x2={(width / 3) * 2} y2={height} stroke={strokeColor} strokeWidth={strokeWidth} />
            <line x1={0} y1={height / 3} x2={width} y2={height / 3} stroke={strokeColor} strokeWidth={strokeWidth} />
            <line x1={0} y1={(height / 3) * 2} x2={width} y2={(height / 3) * 2} stroke={strokeColor} strokeWidth={strokeWidth} />
          </>
        );
      case 'golden':
        const phi = 1.618;
        const goldenX = width / phi;
        const goldenY = height / phi;
        return (
          <>
            <line x1={goldenX} y1={0} x2={goldenX} y2={height} stroke={strokeColor} strokeWidth={strokeWidth} />
            <line x1={width - goldenX} y1={0} x2={width - goldenX} y2={height} stroke={strokeColor} strokeWidth={strokeWidth} />
            <line x1={0} y1={goldenY} x2={width} y2={goldenY} stroke={strokeColor} strokeWidth={strokeWidth} />
            <line x1={0} y1={height - goldenY} x2={width} y2={height - goldenY} stroke={strokeColor} strokeWidth={strokeWidth} />
          </>
        );
      case 'grid':
        const gridSize = 8;
        const lines = [];
        for (let i = 1; i < gridSize; i++) {
          lines.push(<line key={`v${i}`} x1={(width / gridSize) * i} y1={0} x2={(width / gridSize) * i} y2={height} stroke={strokeColor} strokeWidth={strokeWidth} />);
          lines.push(<line key={`h${i}`} x1={0} y1={(height / gridSize) * i} x2={width} y2={(height / gridSize) * i} stroke={strokeColor} strokeWidth={strokeWidth} />);
        }
        return <>{lines}</>;
      case 'diagonal':
        return (
          <>
            <line x1={0} y1={0} x2={width} y2={height} stroke={strokeColor} strokeWidth={strokeWidth} />
            <line x1={width} y1={0} x2={0} y2={height} stroke={strokeColor} strokeWidth={strokeWidth} />
          </>
        );
      default:
        return null;
    }
  };

  return (
    <svg
      className="absolute inset-0 pointer-events-none z-10"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
    >
      {renderGrid()}
    </svg>
  );
};

interface ZebraOverlayProps {
  imageRef: React.RefObject<HTMLImageElement | null>;
  enabled: boolean;
}

const ZebraOverlay: React.FC<ZebraOverlayProps> = ({ imageRef, enabled }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!enabled || !imageRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = imageRef.current;
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;

    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Zebra pattern for highlights (> 95%) and shadows (< 5%)
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

      if (luminance > 0.95) {
        // Highlights - diagonal stripes
        const x = (i / 4) % canvas.width;
        const y = Math.floor((i / 4) / canvas.width);
        if ((x + y) % 8 < 4) {
          data[i] = 255; data[i + 1] = 0; data[i + 2] = 0; data[i + 3] = 180;
        }
      } else if (luminance < 0.05) {
        // Shadows - diagonal stripes opposite direction
        const x = (i / 4) % canvas.width;
        const y = Math.floor((i / 4) / canvas.width);
        if ((x - y) % 8 < 4) {
          data[i] = 0; data[i + 1] = 150; data[i + 2] = 255; data[i + 3] = 180;
        }
      }
    }

    ctx.putImageData(imageData, 0, 0);
  }, [enabled, imageRef]);

  if (!enabled) return null;

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-20 mix-blend-screen"
      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
    />
  );
};

interface SplitHandleProps {
  position: number;
  onChange: (position: number) => void;
  containerRef: React.RefObject<HTMLElement>;
}

const SplitHandle: React.FC<SplitHandleProps> = ({ position, onChange, containerRef }) => {
  const handleRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startPosition = useRef(position);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    startX.current = e.clientX;
    startPosition.current = position;
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
  }, [position]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    isDragging.current = true;
    startX.current = e.touches[0].clientX;
    startPosition.current = position;
    document.body.style.userSelect = 'none';
  }, [position]);

  useEffect(() => {
    const handleMove = (clientX: number) => {
      if (!isDragging.current || !containerRef.current) return;

      const container = containerRef.current;
      const rect = container.getBoundingClientRect();
      const deltaX = clientX - startX.current;
      const deltaPercent = (deltaX / rect.width) * 100;
      let newPosition = startPosition.current + deltaPercent;

      // Clamp to bounds
      newPosition = Math.max(5, Math.min(95, newPosition));

      // Snap to 50% if close
      if (Math.abs(newPosition - 50) < 3) {
        newPosition = 50;
      }

      onChange(newPosition);
    };

    const handleMouseMove = (e: MouseEvent) => handleMove(e.clientX);
    const handleTouchMove = (e: TouchEvent) => handleMove(e.touches[0].clientX);

    const handleEnd = () => {
      isDragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    if (isDragging.current) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleEnd);
      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('touchend', handleEnd);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleEnd);
    };
  }, [onChange, containerRef]);

  return (
    <motion.div
      ref={handleRef}
      className="absolute top-0 bottom-0 w-8 -ml-4 cursor-ew-resize z-30 flex items-center justify-center group"
      style={{ left: `${position}%` }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      role="separator"
      aria-valuenow={Math.round(position)}
      aria-orientation="vertical"
      aria-label="Arrastrar para comparar before/after"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.2 }}
    >
      {/* Line */}
      <div className="absolute w-0.5 h-full bg-white/50 group-hover:bg-white transition-colors" />

      {/* Handle */}
      <motion.div
        className="w-8 h-12 bg-[#1a1a25]/90 backdrop-blur-md rounded-full border border-white/20 flex items-center justify-center shadow-lg"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        <div className="flex gap-0.5">
          <div className="w-0.5 h-4 bg-white/60 rounded-full" />
          <div className="w-0.5 h-4 bg-white/60 rounded-full" />
        </div>
      </motion.div>

      {/* Labels */}
      <div className="absolute top-4 left-10 px-2 py-1 bg-black/60 rounded text-xs text-white/80 opacity-0 group-hover:opacity-100 transition-opacity">
        Before
      </div>
      <div className="absolute top-4 right-10 px-2 py-1 bg-black/60 rounded text-xs text-white/80 opacity-0 group-hover:opacity-100 transition-opacity">
        After
      </div>
    </motion.div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const Editor: React.FC<EditorProps> = ({
  imageSrc,
  originalSrc,
  adjustments = DEFAULT_ADJUSTMENTS,
  showSplit = false,
  splitPosition = 50,
  zoom = 1,
  pan = { x: 0, y: 0 },
  gridOverlay = 'none',
  showZebra = false,
  showHistogram = true,
  onAdjustmentsChange,
  onZoomChange,
  onPanChange,
  onSplitPositionChange,
  className = ''
}) => {
  const { image, adjustments: storeAdjustments, setProcessedImage } = useImageStore();
  
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const isPanning = useRef(false);
  const lastPan = useRef({ x: 0, y: 0 });

  const [currentZoom, setCurrentZoom] = useState(zoom);
  const [currentPan, setCurrentPan] = useState(pan);
  const [currentSplit, setCurrentSplit] = useState(splitPosition);
  const [currentGrid, setCurrentGrid] = useState(gridOverlay);
  const [currentZebra, setCurrentZebra] = useState(showZebra);
  const [showOriginal, setShowOriginal] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [internalImageSrc, setInternalImageSrc] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Serialize adjustments for stable dependency
  const adjustmentsKey = useMemo(() => JSON.stringify(storeAdjustments), [storeAdjustments]);
  const adjustmentsRef = useRef(storeAdjustments);
  adjustmentsRef.current = storeAdjustments;
  
  // Process image when adjustments change (debounced)
  useEffect(() => {
    if (!image.original) return;
    
    setIsProcessing(true);
    
    // Debounce processing for performance
    const timeoutId = setTimeout(() => {
      try {
        const processed = processImage(image.original!, adjustmentsRef.current);
        setProcessedImage(processed);
      } catch (error) {
        console.error('Error processing image:', error);
      }
      setIsProcessing(false);
    }, 100);
    
    return () => clearTimeout(timeoutId);
  }, [image.original, adjustmentsKey, setProcessedImage]);

  // Convert ImageData from store to blob URL
  useEffect(() => {
    const imageData = image.processed || image.original;
    if (imageData) {
      const canvas = document.createElement('canvas');
      canvas.width = imageData.width;
      canvas.height = imageData.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.putImageData(imageData, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) {
            // Revoke previous URL before creating new one
            if (internalImageSrc) {
              URL.revokeObjectURL(internalImageSrc);
            }
            const url = URL.createObjectURL(blob);
            setInternalImageSrc(url);
            setImageLoaded(true);
            setImageDimensions({ width: imageData.width, height: imageData.height });
          }
        }, 'image/jpeg', 0.95);
      }
    }
  }, [image.processed, image.original]);

  // Use prop imageSrc or internal from store
  const displayImageSrc = imageSrc || internalImageSrc;

  // Spring animations for smooth zoom/pan
  const springZoom = useSpring(currentZoom, { stiffness: 300, damping: 30 });
  const springPanX = useSpring(currentPan.x, { stiffness: 300, damping: 30 });
  const springPanY = useSpring(currentPan.y, { stiffness: 300, damping: 30 });

  // Mock histogram data (in real app, calculated from image)
  const histogramData = useMemo(() => {
    return Array.from({ length: 64 }, () => Math.random() * 100);
  }, [adjustments]);

  // Zoom handlers
  const handleZoomIn = useCallback(() => {
    const newZoom = Math.min(ZOOM_MAX, currentZoom + ZOOM_STEP * 2);
    setCurrentZoom(newZoom);
    onZoomChange?.(newZoom);
  }, [currentZoom, onZoomChange]);

  const handleZoomOut = useCallback(() => {
    const newZoom = Math.max(ZOOM_MIN, currentZoom - ZOOM_STEP * 2);
    setCurrentZoom(newZoom);
    onZoomChange?.(newZoom);
  }, [currentZoom, onZoomChange]);

  const handleFitToScreen = useCallback(() => {
    setCurrentZoom(1);
    setCurrentPan({ x: 0, y: 0 });
    onZoomChange?.(1);
    onPanChange?.({ x: 0, y: 0 });
  }, [onZoomChange, onPanChange]);

  // Wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    const newZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, currentZoom + delta));
    setCurrentZoom(newZoom);
    onZoomChange?.(newZoom);
  }, [currentZoom, onZoomChange]);

  // Pan handlers
  const handlePanStart = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    isPanning.current = true;
    lastPan.current = { x: e.clientX, y: e.clientY };
    document.body.style.cursor = 'grabbing';
  }, []);

  const handlePanMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning.current) return;
    const deltaX = e.clientX - lastPan.current.x;
    const deltaY = e.clientY - lastPan.current.y;
    lastPan.current = { x: e.clientX, y: e.clientY };

    const newPan = {
      x: currentPan.x + deltaX,
      y: currentPan.y + deltaY
    };
    setCurrentPan(newPan);
    onPanChange?.(newPan);
  }, [currentPan, onPanChange]);

  const handlePanEnd = useCallback(() => {
    isPanning.current = false;
    document.body.style.cursor = '';
  }, []);

  // Image load handler
  const handleImageLoad = useCallback(() => {
    if (imageRef.current) {
      setImageDimensions({
        width: imageRef.current.naturalWidth,
        height: imageRef.current.naturalHeight
      });
      setImageLoaded(true);
    }
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '0' && e.ctrlKey) {
        e.preventDefault();
        handleFitToScreen();
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        handleZoomIn();
      } else if (e.key === '-') {
        e.preventDefault();
        handleZoomOut();
      } else if (e.key === ' ') {
        e.preventDefault();
        setShowOriginal(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleFitToScreen, handleZoomIn, handleZoomOut]);

  // Sync with props
  useEffect(() => {
    setCurrentZoom(zoom);
  }, [zoom]);

  useEffect(() => {
    setCurrentPan(pan);
  }, [pan]);

  useEffect(() => {
    setCurrentSplit(splitPosition);
  }, [splitPosition]);

  return (
    <motion.div
      ref={containerRef}
      className={`relative w-full h-full bg-[#0a0a0f] overflow-hidden ${className}`}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      role="region"
      aria-label="Editor de imagen"
    >
      {/* Main Canvas Area */}
      <div
        className="absolute inset-0 flex items-center justify-center overflow-hidden"
        onWheel={handleWheel}
        onMouseDown={handlePanStart}
        onMouseMove={handlePanMove}
        onMouseUp={handlePanEnd}
        onMouseLeave={handlePanEnd}
      >
        <motion.div
          className="relative"
          style={{
            scale: springZoom,
            x: springPanX,
            y: springPanY,
            cursor: isPanning.current ? 'grabbing' : currentZoom > 1 ? 'grab' : 'default'
          }}
        >
          {/* Image Container */}
          <div className="relative">
            {/* Before/After Split */}
            {showSplit && originalSrc ? (
              <div className="relative" style={{ width: imageDimensions.width || 'auto', height: imageDimensions.height || 'auto' }}>
                {/* After Image (full) */}
                <img
                  ref={imageRef}
                  src={displayImageSrc || ''}
                  alt="Edited"
                  className="max-w-none"
                  onLoad={handleImageLoad}
                  style={{ display: 'block' }}
                />

                {/* Before Image (clipped) */}
                <div
                  className="absolute top-0 left-0 overflow-hidden"
                  style={{ width: `${currentSplit}%`, height: '100%' }}
                >
                  <img
                    src={originalSrc}
                    alt="Original"
                    className="max-w-none"
                    style={{ width: imageDimensions.width || 'auto' }}
                  />
                </div>

                {/* Split Handle */}
                <SplitHandle
                  position={currentSplit}
                  onChange={(pos) => {
                    setCurrentSplit(pos);
                    onSplitPositionChange?.(pos);
                  }}
                  containerRef={containerRef as React.RefObject<HTMLElement>}
                />
              </div>
            ) : (
              /* Single Image */
              <img
                ref={imageRef}
                src={showOriginal && originalSrc ? originalSrc : (displayImageSrc || '')}
                alt="Editing"
                className="max-w-none select-none"
                onLoad={handleImageLoad}
                style={{ display: 'block' }}
                draggable={false}
              />
            )}

            {/* Grid Overlay */}
            {imageLoaded && (
              <GridOverlay
                type={currentGrid}
                width={imageDimensions.width}
                height={imageDimensions.height}
              />
            )}

            {/* Zebra Overlay */}
            <ZebraOverlay imageRef={imageRef} enabled={currentZebra} />
          </div>
        </motion.div>
      </div>

      {/* Top Toolbar */}
      <motion.div
        className="absolute top-4 left-1/2 -translate-x-1/2 z-40"
        variants={toolbarVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="flex items-center gap-2 px-3 py-2 bg-[#1a1a25]/80 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl">
          {/* Zoom Controls */}
          <motion.button
            className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            variants={toolButtonVariants}
            whileHover="hover"
            whileTap="tap"
            onClick={handleZoomOut}
            aria-label="Alejar"
          >
            <ZoomOut className="w-4 h-4" />
          </motion.button>

          <span className="px-2 text-sm font-medium text-white/80 min-w-[60px] text-center">
            {Math.round(currentZoom * 100)}%
          </span>

          <motion.button
            className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            variants={toolButtonVariants}
            whileHover="hover"
            whileTap="tap"
            onClick={handleZoomIn}
            aria-label="Acercar"
          >
            <ZoomIn className="w-4 h-4" />
          </motion.button>

          <div className="w-px h-6 bg-white/20 mx-1" />

          <motion.button
            className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            variants={toolButtonVariants}
            whileHover="hover"
            whileTap="tap"
            onClick={handleFitToScreen}
            aria-label="Ajustar a pantalla"
          >
            <Maximize className="w-4 h-4" />
          </motion.button>

          <div className="w-px h-6 bg-white/20 mx-1" />

          {/* Grid Overlay Selector */}
          <div className="relative group">
            <motion.button
              className={`p-2 rounded-xl transition-colors ${
                currentGrid !== 'none'
                  ? 'text-indigo-400 bg-indigo-500/20'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
              variants={toolButtonVariants}
              whileHover="hover"
              whileTap="tap"
              aria-label="Grid overlay"
            >
              <Grid3x3 className="w-4 h-4" />
            </motion.button>

            {/* Grid Dropdown */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
              <div className="p-2 bg-[#1a1a25]/95 backdrop-blur-xl rounded-xl border border-white/10 shadow-2xl">
                {(['none', 'rule-thirds', 'golden', 'grid', 'diagonal'] as const).map((grid) => (
                  <button
                    key={grid}
                    className={`block w-full px-3 py-2 text-left text-sm rounded-lg transition-colors ${
                      currentGrid === grid
                        ? 'bg-indigo-500/20 text-indigo-300'
                        : 'text-white/70 hover:text-white hover:bg-white/5'
                    }`}
                    onClick={() => setCurrentGrid(grid)}
                  >
                    {grid === 'none' && 'Sin grid'}
                    {grid === 'rule-thirds' && 'Regla de tercios'}
                    {grid === 'golden' && 'Proporción áurea'}
                    {grid === 'grid' && 'Grid 8×8'}
                    {grid === 'diagonal' && 'Diagonal'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Zebra Toggle */}
          <motion.button
            className={`p-2 rounded-xl transition-colors ${
              currentZebra
                ? 'text-indigo-400 bg-indigo-500/20'
                : 'text-white/70 hover:text-white hover:bg-white/10'
            }`}
            variants={toolButtonVariants}
            whileHover="hover"
            whileTap="tap"
            onClick={() => setCurrentZebra(!currentZebra)}
            aria-label={currentZebra ? 'Ocultar zebra' : 'Mostrar zebra'}
          >
            <Layers className="w-4 h-4" />
          </motion.button>

          {/* Before/After Toggle */}
          {originalSrc && (
            <motion.button
              className={`p-2 rounded-xl transition-colors ${
                showOriginal
                  ? 'text-indigo-400 bg-indigo-500/20'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
              variants={toolButtonVariants}
              whileHover="hover"
              whileTap="tap"
              onClick={() => setShowOriginal(!showOriginal)}
              aria-label={showOriginal ? 'Ver editada' : 'Ver original'}
            >
              <Split className="w-4 h-4" />
            </motion.button>
          )}
        </div>
      </motion.div>

      {/* Bottom Info Bar */}
      <motion.div
        className="absolute bottom-4 left-4 right-4 flex items-center justify-between z-40"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        {/* Image Info */}
        <div className="flex items-center gap-4 px-4 py-2 bg-[#1a1a25]/80 backdrop-blur-xl rounded-xl border border-white/10">
          <span className="text-xs text-white/60">
            {imageDimensions.width} × {imageDimensions.height}px
          </span>
          {showSplit && (
            <span className="text-xs text-indigo-400">
              Split: {Math.round(currentSplit)}%
            </span>
          )}
        </div>

        {/* Histogram */}
        {showHistogram && imageLoaded && (
          <motion.div
            className="px-4 py-2 bg-[#1a1a25]/80 backdrop-blur-xl rounded-xl border border-white/10"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
          >
            <Histogram data={histogramData} width={180} height={50} />
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default Editor;

