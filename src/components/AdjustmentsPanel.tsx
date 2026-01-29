/**
 * APEX Photo Studio v1.1.0 - AdjustmentsPanel Component
 * Panel de ajustes con sliders para Exposure, Color, Detail y HSL por 8 canales.
 * Sliders custom: bidireccionales, glow, snap-to-zero, haptic feedback.
 */

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from 'framer-motion';
import {
  Sun,
  Contrast,
  Droplets,
  Palette,
  Sliders,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Eye,
  EyeOff,
  Info
} from 'lucide-react';
import { useImageStore } from '@/hooks/useImageStore';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface HSLChannel {
  hue: number;
  saturation: number;
  lightness: number;
}

export interface AdjustmentValues {
  // Exposure
  exposure: number;
  contrast: number;
  highlights: number;
  shadows: number;
  whites: number;
  blacks: number;
  // Color
  temperature: number;
  tint: number;
  saturation: number;
  vibrance: number;
  // Detail
  clarity: number;
  sharpness: number;
  noiseReduction: number;
  // HSL
  hsl: {
    red: HSLChannel;
    orange: HSLChannel;
    yellow: HSLChannel;
    green: HSLChannel;
    aqua: HSLChannel;
    blue: HSLChannel;
    purple: HSLChannel;
    magenta: HSLChannel;
  };
}

export type AdjustmentCategory = 'exposure' | 'color' | 'detail' | 'hsl';

export interface AdjustmentDefinition {
  key: keyof AdjustmentValues | string;
  label: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  unit?: string;
  icon?: React.ReactNode;
  description?: string;
}

export interface AdjustmentsPanelProps {
  /** Categoría activa */
  category?: AdjustmentCategory;
  /** Valores actuales de ajustes */
  values?: AdjustmentValues;
  /** Callback al cambiar valor */
  onChange?: (key: string, value: number) => void;
  /** Callback al cambiar valor HSL */
  onHSLChange?: (channel: string, component: keyof HSLChannel, value: number) => void;
  /** Callback al resetear */
  onReset?: (category?: AdjustmentCategory) => void;
  /** Callback al cambiar categoría */
  onCategoryChange?: (category: AdjustmentCategory) => void;
  /** Datos del histograma */
  histogramData?: number[];
  /** Mostrar histograma */
  showHistogram?: boolean;
  /** Canales HSL expandidos */
  expandedChannels?: string[];
  /** Clase CSS adicional */
  className?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const CATEGORIES: { id: AdjustmentCategory; label: string; icon: React.ReactNode }[] = [
  { id: 'exposure', label: 'Exposición', icon: <Sun className="w-4 h-4" /> },
  { id: 'color', label: 'Color', icon: <Palette className="w-4 h-4" /> },
  { id: 'detail', label: 'Detalle', icon: <Sliders className="w-4 h-4" /> },
  { id: 'hsl', label: 'HSL', icon: <Droplets className="w-4 h-4" /> }
];

const EXPOSURE_ADJUSTMENTS: AdjustmentDefinition[] = [
  { key: 'exposure', label: 'Exposición', min: -5, max: 5, step: 0.1, defaultValue: 0, unit: 'EV', description: 'Ajusta el brillo general' },
  { key: 'contrast', label: 'Contraste', min: -100, max: 100, step: 1, defaultValue: 0, unit: '%', description: 'Diferencia entre luces y sombras' },
  { key: 'highlights', label: 'Highlights', min: -100, max: 100, step: 1, defaultValue: 0, unit: '%', description: 'Recupera detalles en luces' },
  { key: 'shadows', label: 'Shadows', min: -100, max: 100, step: 1, defaultValue: 0, unit: '%', description: 'Recupera detalles en sombras' },
  { key: 'whites', label: 'Whites', min: -100, max: 100, step: 1, defaultValue: 0, unit: '%', description: 'Punto de blanco' },
  { key: 'blacks', label: 'Blacks', min: -100, max: 100, step: 1, defaultValue: 0, unit: '%', description: 'Punto de negro' }
];

const COLOR_ADJUSTMENTS: AdjustmentDefinition[] = [
  { key: 'temperature', label: 'Temperatura', min: -100, max: 100, step: 1, defaultValue: 0, unit: '', description: 'Cálido (amarillo) o frío (azul)' },
  { key: 'tint', label: 'Tinte', min: -100, max: 100, step: 1, defaultValue: 0, unit: '', description: 'Magenta o verde' },
  { key: 'saturation', label: 'Saturación', min: -100, max: 100, step: 1, defaultValue: 0, unit: '%', description: 'Intensidad de colores' },
  { key: 'vibrance', label: 'Vibrance', min: -100, max: 100, step: 1, defaultValue: 0, unit: '%', description: 'Saturación inteligente' }
];

const DETAIL_ADJUSTMENTS: AdjustmentDefinition[] = [
  { key: 'clarity', label: 'Claridad', min: -100, max: 100, step: 1, defaultValue: 0, unit: '%', description: 'Definición de texturas' },
  { key: 'sharpness', label: 'Nitidez', min: 0, max: 150, step: 1, defaultValue: 0, unit: '%', description: 'Borde y detalle' },
  { key: 'noiseReduction', label: 'Reducción ruido', min: 0, max: 100, step: 1, defaultValue: 0, unit: '%', description: 'Suaviza grano' }
];

const HSL_CHANNELS = [
  { key: 'red', label: 'Rojo', color: '#ef4444' },
  { key: 'orange', label: 'Naranja', color: '#f97316' },
  { key: 'yellow', label: 'Amarillo', color: '#eab308' },
  { key: 'green', label: 'Verde', color: '#22c55e' },
  { key: 'aqua', label: 'Cyan', color: '#06b6d4' },
  { key: 'blue', label: 'Azul', color: '#3b82f6' },
  { key: 'purple', label: 'Púrpura', color: '#a855f7' },
  { key: 'magenta', label: 'Magenta', color: '#ec4899' }
];

const HSL_COMPONENTS: { key: keyof HSLChannel; label: string; min: number; max: number }[] = [
  { key: 'hue', label: 'Tono', min: -100, max: 100 },
  { key: 'saturation', label: 'Saturación', min: -100, max: 100 },
  { key: 'lightness', label: 'Luminosidad', min: -100, max: 100 }
];

// ============================================================================
// ANIMATION VARIANTS
// ============================================================================

const panelVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.28,
      ease: 'easeOut' as const,
      staggerChildren: 0.02
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: { opacity: 1, x: 0 }
};

const glowVariants = {
  rest: { boxShadow: '0 0 0 0 rgba(99, 102, 241, 0)' },
  active: { boxShadow: '0 0 20px rgba(99, 102, 241, 0.4)' }
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface CustomSliderProps {
  value: number;
  min: number;
  max: number;
  step: number;
  label: string;
  unit?: string;
  description?: string;
  onChange: (value: number) => void;
  onChangeEnd?: (value: number) => void;
  showValue?: boolean;
  bidirectional?: boolean;
  snapToZero?: boolean;
  snapThreshold?: number;
}

const CustomSlider: React.FC<CustomSliderProps> = ({
  value,
  min,
  max,
  step,
  label,
  unit = '',
  description,
  onChange,
  onChangeEnd,
  showValue = true,
  bidirectional = true,
  snapToZero = true,
  snapThreshold = 5
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [localValue, setLocalValue] = useState(value);

  // Spring for haptic-like feedback
  const springScale = useSpring(1, { stiffness: 400, damping: 15 });

  // Sync with prop
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Calculate percentage for visual
  const percentage = useMemo(() => {
    const range = max - min;
    return ((localValue - min) / range) * 100;
  }, [localValue, min, max]);

  // Calculate center position for bidirectional
  const centerPercentage = useMemo(() => {
    if (!bidirectional) return 0;
    const range = max - min;
    return ((0 - min) / range) * 100;
  }, [min, max, bidirectional]);

  // Handle mouse/touch events
  const handleStart = useCallback((clientX: number) => {
    setIsDragging(true);
    setShowTooltip(true);
    updateValue(clientX);
  }, []);

  const handleMove = useCallback((clientX: number) => {
    if (!isDragging) return;
    updateValue(clientX);
  }, [isDragging]);

  const handleEnd = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    setShowTooltip(false);

    // Snap to zero if close
    if (snapToZero && Math.abs(localValue) < snapThreshold && localValue !== 0) {
      springScale.set(1.05);
      setTimeout(() => springScale.set(1), 100);
      onChange(0);
    }

    onChangeEnd?.(localValue);
  }, [isDragging, localValue, snapToZero, snapThreshold, onChange, onChangeEnd, springScale]);

  const updateValue = useCallback((clientX: number) => {
    if (!trackRef.current) return;

    const rect = trackRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    const newValue = min + percentage * (max - min);

    // Round to step
    const steppedValue = Math.round(newValue / step) * step;
    const clampedValue = Math.max(min, Math.min(max, steppedValue));

    setLocalValue(clampedValue);
    onChange(clampedValue);

    // Haptic feedback on zero crossing
    if (Math.sign(localValue) !== Math.sign(clampedValue) && clampedValue === 0) {
      springScale.set(1.05);
      setTimeout(() => springScale.set(1), 80);
    }
  }, [min, max, step, localValue, onChange, springScale]);

  // Event listeners
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => handleMove(e.clientX);
    const handleMouseUp = () => handleEnd();
    const handleTouchMove = (e: TouchEvent) => handleMove(e.touches[0].clientX);
    const handleTouchEnd = () => handleEnd();

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('touchend', handleTouchEnd);
      document.body.style.cursor = 'ew-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, handleMove, handleEnd]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const stepSize = e.shiftKey ? step * 10 : step;
    let newValue = localValue;

    switch (e.key) {
      case 'ArrowLeft':
      case 'ArrowDown':
        newValue = Math.max(min, localValue - stepSize);
        break;
      case 'ArrowRight':
      case 'ArrowUp':
        newValue = Math.min(max, localValue + stepSize);
        break;
      case 'Home':
        newValue = min;
        break;
      case 'End':
        newValue = max;
        break;
      default:
        return;
    }

    e.preventDefault();
    setLocalValue(newValue);
    onChange(newValue);
  }, [localValue, min, max, step, onChange]);

  const displayValue = useMemo(() => {
    const formatted = localValue.toFixed(step < 1 ? 1 : 0);
    return unit ? `${formatted}${unit}` : formatted;
  }, [localValue, step, unit]);

  const isAtZero = Math.abs(localValue) < 0.01;

  return (
    <motion.div
      className="py-3"
      variants={itemVariants}
    >
      {/* Label Row */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white/80">{label}</span>
          {description && (
            <div className="group relative">
              <Info className="w-3.5 h-3.5 text-white/40 cursor-help" />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-[#1a1a25] rounded-lg text-xs text-white/70 whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                {description}
              </div>
            </div>
          )}
        </div>
        {showValue && (
          <motion.span
            className={`text-sm font-mono transition-colors ${
              isAtZero ? 'text-white/40' : 'text-indigo-400'
            }`}
            animate={{ scale: isDragging ? 1.1 : 1 }}
          >
            {displayValue}
          </motion.span>
        )}
      </div>

      {/* Slider Track */}
      <div
        ref={trackRef}
        className="relative h-6 flex items-center cursor-ew-resize group"
        onMouseDown={(e) => handleStart(e.clientX)}
        onTouchStart={(e) => handleStart(e.touches[0].clientX)}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => !isDragging && setShowTooltip(false)}
        role="slider"
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={localValue}
        aria-valuetext={displayValue}
        aria-label={label}
        tabIndex={0}
        onKeyDown={handleKeyDown}
      >
        {/* Background Track */}
        <div className="absolute inset-x-0 h-2 bg-white/10 rounded-full overflow-hidden">
          {/* Center line for bidirectional */}
          {bidirectional && (
            <div
              className="absolute top-0 bottom-0 w-px bg-white/20"
              style={{ left: `${centerPercentage}%` }}
            />
          )}

          {/* Filled Track */}
          <motion.div
            className="absolute top-0 bottom-0 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
            style={{
              left: bidirectional ? `${Math.min(centerPercentage, percentage)}%` : '0%',
              width: bidirectional
                ? `${Math.abs(percentage - centerPercentage)}%`
                : `${percentage}%`
            }}
            animate={{
              opacity: isAtZero ? 0.3 : 1,
              filter: isDragging ? 'brightness(1.2)' : 'brightness(1)'
            }}
          />
        </div>

        {/* Thumb */}
        <motion.div
          className="absolute w-5 h-5 bg-white rounded-full shadow-lg flex items-center justify-center"
          style={{
            left: `calc(${percentage}% - 10px)`,
            boxShadow: isDragging ? '0 0 20px rgba(99, 102, 241, 0.6)' : '0 2px 8px rgba(0, 0, 0, 0.3)'
          }}
          animate={{
            scale: isDragging ? 1.3 : 1,
            borderColor: isAtZero ? 'rgba(255,255,255,0.3)' : 'rgba(99, 102, 241, 0.8)'
          }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        >
          <motion.div
            className="w-2 h-2 rounded-full"
            style={{
              backgroundColor: isAtZero ? '#94a3b8' : '#6366f1'
            }}
          />
        </motion.div>

        {/* Glow Effect */}
        <motion.div
          className="absolute w-8 h-8 rounded-full pointer-events-none"
          style={{
            left: `calc(${percentage}% - 16px)`,
            background: 'radial-gradient(circle, rgba(99, 102, 241, 0.3) 0%, transparent 70%)'
          }}
          animate={{
            opacity: isDragging ? 1 : 0,
            scale: isDragging ? 1.5 : 1
          }}
        />

        {/* Tooltip */}
        <AnimatePresence>
          {showTooltip && (
            <motion.div
              className="absolute -top-8 px-2 py-1 bg-[#1a1a25] rounded text-xs font-medium text-white border border-white/10 shadow-lg"
              style={{ left: `calc(${percentage}% - 20px)` }}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
            >
              {displayValue}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

interface HSLChannelPanelProps {
  channel: typeof HSL_CHANNELS[0];
  values: HSLChannel;
  isExpanded: boolean;
  onToggle: () => void;
  onChange: (component: keyof HSLChannel, value: number) => void;
}

const HSLChannelPanel: React.FC<HSLChannelPanelProps> = ({
  channel,
  values,
  isExpanded,
  onToggle,
  onChange
}) => {
  const hasChanges = values.hue !== 0 || values.saturation !== 0 || values.lightness !== 0;

  return (
    <motion.div
      className="border-b border-white/5 last:border-0"
      variants={itemVariants}
    >
      {/* Channel Header */}
      <motion.button
        className="w-full flex items-center justify-between py-3 px-1 hover:bg-white/5 rounded-lg transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-4 h-4 rounded-full"
            style={{ backgroundColor: channel.color }}
          />
          <span className="text-sm font-medium text-white/80">{channel.label}</span>
          {hasChanges && (
            <span className="w-2 h-2 rounded-full bg-indigo-400" />
          )}
        </div>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-4 h-4 text-white/50" />
        </motion.div>
      </motion.button>

      {/* Expanded Controls */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pb-4 pl-7 space-y-1">
              {HSL_COMPONENTS.map((component) => (
                <CustomSlider
                  key={component.key}
                  value={values[component.key]}
                  min={component.min}
                  max={component.max}
                  step={1}
                  label={component.label}
                  onChange={(v) => onChange(component.key, v)}
                  showValue={true}
                  bidirectional={true}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

interface HistogramMiniProps {
  data: number[];
}

const HistogramMini: React.FC<HistogramMiniProps> = ({ data }) => {
  const maxValue = Math.max(...data, 1);

  return (
    <div className="h-16 flex items-end gap-px px-2 py-2 bg-black/20 rounded-lg">
      {data.map((value, i) => {
        const height = (value / maxValue) * 100;
        const isShadow = i < data.length * 0.33;
        const isHighlight = i > data.length * 0.66;
        const color = isShadow ? '#3b82f6' : isHighlight ? '#f59e0b' : '#22c55e';

        return (
          <motion.div
            key={i}
            className="flex-1 rounded-t-sm"
            style={{ backgroundColor: color }}
            initial={{ height: 0 }}
            animate={{ height: `${Math.max(2, height)}%` }}
            transition={{ duration: 0.15 }}
          />
        );
      })}
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const AdjustmentsPanel: React.FC<AdjustmentsPanelProps> = ({
  category = 'exposure',
  values = { exposure: 0, contrast: 0, highlights: 0, shadows: 0, whites: 0, blacks: 0, temperature: 0, tint: 0, vibrance: 0, saturation: 0, clarity: 0, dehaze: 0, texture: 0, sharpness: 0, noiseReduction: 0, hsl: { red: { hue: 0, saturation: 0, lightness: 0 }, orange: { hue: 0, saturation: 0, lightness: 0 }, yellow: { hue: 0, saturation: 0, lightness: 0 }, green: { hue: 0, saturation: 0, lightness: 0 }, aqua: { hue: 0, saturation: 0, lightness: 0 }, blue: { hue: 0, saturation: 0, lightness: 0 }, purple: { hue: 0, saturation: 0, lightness: 0 }, magenta: { hue: 0, saturation: 0, lightness: 0 } } },
  onChange,
  onHSLChange,
  onReset,
  onCategoryChange,
  histogramData = [],
  showHistogram = true,
  expandedChannels = [],
  className = ''
}) => {
  const { adjustments: storeAdjustments, setAdjustments, resetAdjustments } = useImageStore();
  
  const [activeCategory, setActiveCategory] = useState<AdjustmentCategory>(category);
  const [expanded, setExpanded] = useState<string[]>(expandedChannels);

  // Convert store adjustments to component format
  const internalValues = useMemo(() => ({
    exposure: storeAdjustments.basic.exposure,
    contrast: storeAdjustments.basic.contrast,
    highlights: storeAdjustments.basic.highlights,
    shadows: storeAdjustments.basic.shadows,
    whites: storeAdjustments.basic.whites,
    blacks: storeAdjustments.basic.blacks,
    temperature: storeAdjustments.color.temperature - 6500, // Normalize to 0
    tint: storeAdjustments.color.tint,
    vibrance: storeAdjustments.color.vibrance,
    saturation: storeAdjustments.color.saturation,
    clarity: storeAdjustments.detail.clarity,
    sharpness: storeAdjustments.detail.sharpness,
    noiseReduction: storeAdjustments.detail.noiseReduction,
    dehaze: storeAdjustments.effects?.dehaze || 0,
    texture: 0,
    hsl: storeAdjustments.hsl
  }), [storeAdjustments]);

  // Use store values instead of props
  const effectiveValues = values || internalValues;

  // Handle slider change - update store
  const handleSliderChange = useCallback((key: string, value: number) => {
    // Call prop if provided  
    onChange?.(key, value);
    
    // Also update store
    if (key === 'exposure' || key === 'contrast' || key === 'highlights' || key === 'shadows' || key === 'whites' || key === 'blacks') {
      setAdjustments({ basic: { ...storeAdjustments.basic, [key]: value } });
    } else if (key === 'temperature') {
      setAdjustments({ color: { ...storeAdjustments.color, temperature: value + 6500 } });
    } else if (key === 'tint' || key === 'vibrance' || key === 'saturation') {
      setAdjustments({ color: { ...storeAdjustments.color, [key]: value } });
    } else if (key === 'clarity' || key === 'sharpness' || key === 'noiseReduction') {
      setAdjustments({ detail: { ...storeAdjustments.detail, [key]: value } });
    } else if (key === 'dehaze') {
      setAdjustments({ effects: { ...storeAdjustments.effects, dehaze: value } });
    }
  }, [onChange, setAdjustments, storeAdjustments]);

  // Sync with props
  useEffect(() => {
    setActiveCategory(category);
  }, [category]);

  const handleCategoryChange = useCallback((cat: AdjustmentCategory) => {
    setActiveCategory(cat);
    onCategoryChange?.(cat);
  }, [onCategoryChange]);

  const toggleChannel = useCallback((channel: string) => {
    setExpanded(prev =>
      prev.includes(channel)
        ? prev.filter(c => c !== channel)
        : [...prev, channel]
    );
  }, []);

  const handleReset = useCallback(() => {
    onReset?.(activeCategory);
  }, [activeCategory, onReset]);

  const getAdjustmentsForCategory = useCallback((cat: AdjustmentCategory): AdjustmentDefinition[] => {
    switch (cat) {
      case 'exposure': return EXPOSURE_ADJUSTMENTS;
      case 'color': return COLOR_ADJUSTMENTS;
      case 'detail': return DETAIL_ADJUSTMENTS;
      default: return [];
    }
  }, []);

  const getValueForKey = useCallback((key: string): number => {
    const parts = key.split('.');
    if (parts.length === 2) {
      // HSL value
      const [channel, component] = parts;
      return (internalValues.hsl as any)[channel]?.[component] || 0;
    }
    return (internalValues as any)[key] || 0;
  }, [internalValues]);

  const hasChangesInCategory = useCallback((cat: AdjustmentCategory): boolean => {
    const adjustments = getAdjustmentsForCategory(cat);
    return adjustments.some(adj => getValueForKey(adj.key) !== adj.defaultValue);
  }, [getAdjustmentsForCategory, getValueForKey]);

  return (
    <motion.div
      className={`w-full max-w-sm bg-[#12121a]/95 backdrop-blur-xl border-r border-white/5 flex flex-col ${className}`}
      variants={panelVariants}
      initial="hidden"
      animate="visible"
      role="region"
      aria-label="Panel de ajustes"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/5">
        <h2 className="text-lg font-semibold text-white/90">Ajustes</h2>
        <motion.button
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-white/60 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
          onClick={handleReset}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <RotateCcw className="w-4 h-4" />
          Reset
        </motion.button>
      </div>

      {/* Category Tabs */}
      <div className="flex border-b border-white/5">
        {CATEGORIES.map((cat) => (
          <motion.button
            key={cat.id}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors relative ${
              activeCategory === cat.id
                ? 'text-indigo-400'
                : 'text-white/50 hover:text-white/70'
            }`}
            onClick={() => handleCategoryChange(cat.id)}
            whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.03)' }}
            whileTap={{ scale: 0.98 }}
          >
            {cat.icon}
            <span className="hidden sm:inline">{cat.label}</span>
            {hasChangesInCategory(cat.id) && (
              <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-indigo-400" />
            )}
            {activeCategory === cat.id && (
              <motion.div
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500"
                layoutId="activeTab"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
          </motion.button>
        ))}
      </div>

      {/* Histogram */}
      {showHistogram && histogramData.length > 0 && (
        <motion.div
          className="p-4 border-b border-white/5"
          variants={itemVariants}
        >
          <HistogramMini data={histogramData} />
        </motion.div>
      )}

      {/* Adjustments List */}
      <div className="flex-1 overflow-y-auto p-4">
        <AnimatePresence mode="wait">
          {activeCategory !== 'hsl' ? (
            <motion.div
              key={activeCategory}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {getAdjustmentsForCategory(activeCategory).map((adjustment) => (
                <CustomSlider
                  key={adjustment.key}
                  value={getValueForKey(adjustment.key)}
                  min={adjustment.min}
                  max={adjustment.max}
                  step={adjustment.step}
                  label={adjustment.label}
                  unit={adjustment.unit}
                  description={adjustment.description}
                  onChange={(v) => handleSliderChange(adjustment.key as string, v)}
                  bidirectional={true}
                  snapToZero={true}
                />
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="hsl"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {HSL_CHANNELS.map((channel) => (
                <HSLChannelPanel
                  key={channel.key}
                  channel={channel}
                  values={values.hsl[channel.key as keyof typeof values.hsl]}
                  isExpanded={expanded.includes(channel.key)}
                  onToggle={() => toggleChannel(channel.key)}
                  onChange={(component, value) =>
                    onHSLChange?.(channel.key, component, value)
                  }
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default AdjustmentsPanel;

