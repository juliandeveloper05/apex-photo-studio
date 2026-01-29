/**
 * APEX Photo Studio v1.1.0 - ToneCurveEditor Component
 * Editor de curva de tonos con spline cúbico interactivo y histograma overlay.
 */

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RotateCcw,
  Copy,
  Clipboard,
  Save,
  ChevronDown,
  Grid3x3,
  Eye,
  EyeOff,
  Info
} from 'lucide-react';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface CurvePoint {
  x: number;
  y: number;
  id: string;
}

export type CurveChannel = 'rgb' | 'red' | 'green' | 'blue';

export interface CurvePreset {
  id: string;
  name: string;
  channel: CurveChannel;
  points: CurvePoint[];
}

export interface ToneCurveEditorProps {
  /** Puntos de la curva */
  curve: CurvePoint[];
  /** Datos del histograma */
  histogramData?: number[];
  /** Canal activo */
  channel?: CurveChannel;
  /** Tamaño de la grid */
  gridSize?: number;
  /** Callback al cambiar curva */
  onCurveChange: (points: CurvePoint[]) => void;
  /** Callback al cambiar canal */
  onChannelChange?: (channel: CurveChannel) => void;
  /** Presets disponibles */
  presets?: CurvePreset[];
  /** Callback al aplicar preset */
  onApplyPreset?: (preset: CurvePreset) => void;
  /** Callback al guardar preset */
  onSavePreset?: (name: string) => void;
  /** Clase CSS adicional */
  className?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const CANVAS_SIZE = 256;
const PADDING = 20;
const GRAPH_SIZE = CANVAS_SIZE - PADDING * 2;

const CHANNELS: { id: CurveChannel; label: string; color: string }[] = [
  { id: 'rgb', label: 'RGB', color: '#ffffff' },
  { id: 'red', label: 'Rojo', color: '#ef4444' },
  { id: 'green', label: 'Verde', color: '#22c55e' },
  { id: 'blue', label: 'Azul', color: '#3b82f6' }
];

const DEFAULT_PRESETS: CurvePreset[] = [
  {
    id: 'linear',
    name: 'Lineal',
    channel: 'rgb',
    points: [
      { x: 0, y: 0, id: 'p0' },
      { x: 255, y: 255, id: 'p1' }
    ]
  },
  {
    id: 'contrast',
    name: 'Alto Contraste',
    channel: 'rgb',
    points: [
      { x: 0, y: 0, id: 'p0' },
      { x: 64, y: 32, id: 'p1' },
      { x: 192, y: 224, id: 'p2' },
      { x: 255, y: 255, id: 'p3' }
    ]
  },
  {
    id: 'fade',
    name: 'Matte Fade',
    channel: 'rgb',
    points: [
      { x: 0, y: 32, id: 'p0' },
      { x: 64, y: 64, id: 'p1' },
      { x: 128, y: 128, id: 'p2' },
      { x: 192, y: 192, id: 'p3' },
      { x: 255, y: 224, id: 'p4' }
    ]
  },
  {
    id: 'crush',
    name: 'Shadow Crush',
    channel: 'rgb',
    points: [
      { x: 0, y: 0, id: 'p0' },
      { x: 32, y: 0, id: 'p1' },
      { x: 128, y: 128, id: 'p2' },
      { x: 255, y: 255, id: 'p3' }
    ]
  }
];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Calculate cubic spline interpolation
 * Uses Catmull-Rom spline for smooth curves through points
 */
const calculateSpline = (points: CurvePoint[]): string => {
  if (points.length < 2) return '';

  // Sort points by x
  const sorted = [...points].sort((a, b) => a.x - b.x);

  // Generate path
  let path = `M ${sorted[0].x} ${255 - sorted[0].y}`;

  for (let i = 0; i < sorted.length - 1; i++) {
    const p0 = sorted[Math.max(0, i - 1)];
    const p1 = sorted[i];
    const p2 = sorted[i + 1];
    const p3 = sorted[Math.min(sorted.length - 1, i + 2)];

    // Catmull-Rom to Bezier conversion
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    path += ` C ${cp1x} ${255 - cp1y}, ${cp2x} ${255 - cp2y}, ${p2.x} ${255 - p2.y}`;
  }

  return path;
};

/**
 * Generate smooth curve using polynomial interpolation
 */
const calculateSmoothCurve = (points: CurvePoint[]): string => {
  if (points.length < 2) return '';

  const sorted = [...points].sort((a, b) => a.x - b.x);
  const segments = 100;
  let path = '';

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const x = t * 255;
    const y = interpolateY(x, sorted);

    if (i === 0) {
      path = `M ${x} ${255 - y}`;
    } else {
      path += ` L ${x} ${255 - y}`;
    }
  }

  return path;
};

/**
 * Interpolate Y value for given X using cubic interpolation
 */
const interpolateY = (x: number, points: CurvePoint[]): number => {
  // Find surrounding points
  let i0 = 0;
  for (let i = 0; i < points.length - 1; i++) {
    if (x >= points[i].x && x <= points[i + 1].x) {
      i0 = i;
      break;
    }
  }

  const p0 = points[Math.max(0, i0 - 1)];
  const p1 = points[i0];
  const p2 = points[Math.min(points.length - 1, i0 + 1)];
  const p3 = points[Math.min(points.length - 1, i0 + 2)];

  // Normalize t between p1 and p2
  const t = (x - p1.x) / (p2.x - p1.x || 1);

  // Catmull-Rom interpolation
  const t2 = t * t;
  const t3 = t2 * t;

  const y = 0.5 * (
    (2 * p1.y) +
    (-p0.y + p2.y) * t +
    (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
    (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3
  );

  return Math.max(0, Math.min(255, y));
};

// ============================================================================
// ANIMATION VARIANTS
// ============================================================================

const containerVariants = {
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

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 }
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface HistogramOverlayProps {
  data: number[];
  width: number;
  height: number;
}

const HistogramOverlay: React.FC<HistogramOverlayProps> = ({ data, width, height }) => {
  const maxValue = Math.max(...data, 1);
  const barWidth = width / data.length;

  return (
    <g opacity="0.3">
      {data.map((value, i) => {
        const barHeight = (value / maxValue) * height * 0.5;
        return (
          <rect
            key={i}
            x={i * barWidth}
            y={height - barHeight}
            width={barWidth - 0.5}
            height={barHeight}
            fill="#6366f1"
          />
        );
      })}
    </g>
  );
};

interface GridOverlayProps {
  size: number;
  divisions: number;
}

const GridOverlay: React.FC<GridOverlayProps> = ({ size, divisions }) => {
  const step = size / divisions;
  const lines = [];

  for (let i = 1; i < divisions; i++) {
    const pos = i * step;
    lines.push(
      <line
        key={`h${i}`}
        x1={0}
        y1={pos}
        x2={size}
        y2={pos}
        stroke="rgba(255,255,255,0.1)"
        strokeWidth="0.5"
        strokeDasharray="2,2"
      />
    );
    lines.push(
      <line
        key={`v${i}`}
        x1={pos}
        y1={0}
        x2={pos}
        y2={size}
        stroke="rgba(255,255,255,0.1)"
        strokeWidth="0.5"
        strokeDasharray="2,2"
      />
    );
  }

  return <g>{lines}</g>;
};

interface PresetDropdownProps {
  presets: CurvePreset[];
  onSelect: (preset: CurvePreset) => void;
  isOpen: boolean;
  onClose: () => void;
  currentChannel: CurveChannel;
}

const PresetDropdown: React.FC<PresetDropdownProps> = ({
  presets,
  onSelect,
  isOpen,
  onClose,
  currentChannel
}) => {
  const filteredPresets = presets.filter(p => p.channel === currentChannel || p.channel === 'rgb');

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-[840]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="absolute top-full left-0 mt-2 z-[850] min-w-[200px]"
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
          >
            <div className="bg-[#1a1a25]/95 backdrop-blur-xl rounded-xl border border-white/10 shadow-2xl overflow-hidden">
              <div className="px-3 py-2 border-b border-white/10">
                <p className="text-xs font-medium text-white/50">Presets</p>
              </div>
              <div className="p-1 max-h-[200px] overflow-y-auto">
                {filteredPresets.map((preset, index) => (
                  <motion.button
                    key={preset.id}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left hover:bg-white/5 transition-colors"
                    onClick={() => {
                      onSelect(preset);
                      onClose();
                    }}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                  >
                    <div className="w-8 h-8 bg-white/5 rounded flex items-center justify-center">
                      <svg width="20" height="20" viewBox="0 0 256 256">
                        <path
                          d={calculateSpline(preset.points)}
                          fill="none"
                          stroke={CHANNELS.find(c => c.id === preset.channel)?.color || '#fff'}
                          strokeWidth="2"
                        />
                      </svg>
                    </div>
                    <span className="text-sm text-white/80">{preset.name}</span>
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const ToneCurveEditor: React.FC<ToneCurveEditorProps> = ({
  curve,
  histogramData = [],
  channel = 'rgb',
  gridSize = 4,
  onCurveChange,
  onChannelChange,
  presets = DEFAULT_PRESETS,
  onApplyPreset,
  onSavePreset,
  className = ''
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [currentChannel, setCurrentChannel] = useState<CurveChannel>(channel);
  const [points, setPoints] = useState<CurvePoint[]>(curve);
  const [draggedPoint, setDraggedPoint] = useState<string | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<string | null>(null);
  const [showGrid, setShowGrid] = useState(true);
  const [showHistogram, setShowHistogram] = useState(true);
  const [showPresetDropdown, setShowPresetDropdown] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  // Sync with props
  useEffect(() => {
    setCurrentChannel(channel);
  }, [channel]);

  useEffect(() => {
    setPoints(curve);
  }, [curve]);

  // Generate curve path
  const curvePath = useMemo(() => calculateSpline(points), [points]);

  // Get channel color
  const channelColor = useMemo(() => {
    return CHANNELS.find(c => c.id === currentChannel)?.color || '#ffffff';
  }, [currentChannel]);

  // Coordinate conversion
  const screenToCurve = useCallback((clientX: number, clientY: number): { x: number; y: number } => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    const scaleX = 256 / rect.width;
    const scaleY = 256 / rect.height;

    const x = (clientX - rect.left) * scaleX;
    const y = 255 - (clientY - rect.top) * scaleY;

    return {
      x: Math.max(0, Math.min(255, x)),
      y: Math.max(0, Math.min(255, y))
    };
  }, []);

  // Add point
  const addPoint = useCallback((x: number, y: number) => {
    const newPoint: CurvePoint = {
      x: Math.round(x),
      y: Math.round(y),
      id: `p${Date.now()}`
    };
    const newPoints = [...points, newPoint].sort((a, b) => a.x - b.x);
    setPoints(newPoints);
    onCurveChange(newPoints);
  }, [points, onCurveChange]);

  // Remove point
  const removePoint = useCallback((id: string) => {
    // Don't remove if only 2 points left
    if (points.length <= 2) return;

    const newPoints = points.filter(p => p.id !== id);
    setPoints(newPoints);
    onCurveChange(newPoints);
  }, [points, onCurveChange]);

  // Update point position
  const updatePoint = useCallback((id: string, x: number, y: number) => {
    const newPoints = points.map(p =>
      p.id === id ? { ...p, x: Math.round(x), y: Math.round(y) } : p
    ).sort((a, b) => a.x - b.x);

    setPoints(newPoints);
    onCurveChange(newPoints);
  }, [points, onCurveChange]);

  // Handle mouse events
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const { x, y } = screenToCurve(e.clientX, e.clientY);

    // Check if clicking near existing point
    const clickThreshold = 10;
    const nearPoint = points.find(p =>
      Math.abs(p.x - x) < clickThreshold && Math.abs(p.y - y) < clickThreshold
    );

    if (nearPoint) {
      // Right click to remove
      if (e.button === 2) {
        e.preventDefault();
        removePoint(nearPoint.id);
        return;
      }
      setDraggedPoint(nearPoint.id);
    } else if (e.button === 0) {
      // Add new point on left click
      addPoint(x, y);
      // Start dragging the new point
      const newPoint = points.find(p => Math.abs(p.x - x) < 1 && Math.abs(p.y - y) < 1);
      if (newPoint) {
        setDraggedPoint(newPoint.id);
      }
    }
  }, [screenToCurve, points, addPoint, removePoint]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!draggedPoint) return;

    const { x, y } = screenToCurve(e.clientX, e.clientY);
    updatePoint(draggedPoint, x, y);
  }, [draggedPoint, screenToCurve, updatePoint]);

  const handleMouseUp = useCallback(() => {
    setDraggedPoint(null);
  }, []);

  // Reset curve
  const resetCurve = useCallback(() => {
    const defaultPoints: CurvePoint[] = [
      { x: 0, y: 0, id: 'start' },
      { x: 255, y: 255, id: 'end' }
    ];
    setPoints(defaultPoints);
    onCurveChange(defaultPoints);
  }, [onCurveChange]);

  // Apply preset
  const applyPreset = useCallback((preset: CurvePreset) => {
    const newPoints = preset.points.map((p, i) => ({
      ...p,
      id: `preset_${preset.id}_${i}`
    }));
    setPoints(newPoints);
    onCurveChange(newPoints);
    onApplyPreset?.(preset);
  }, [onCurveChange, onApplyPreset]);

  // Save preset
  const savePreset = useCallback(() => {
    if (!presetName.trim()) return;
    onSavePreset?.(presetName);
    setPresetName('');
    setShowSaveDialog(false);
  }, [presetName, onSavePreset]);

  // Handle channel change
  const handleChannelChange = useCallback((newChannel: CurveChannel) => {
    setCurrentChannel(newChannel);
    onChannelChange?.(newChannel);
  }, [onChannelChange]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (hoveredPoint && points.length > 2) {
          removePoint(hoveredPoint);
        }
      } else if (e.key === 'r' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        resetCurve();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hoveredPoint, points.length, removePoint, resetCurve]);

  return (
    <motion.div
      className={`w-full bg-[#12121a]/95 backdrop-blur-xl rounded-xl border border-white/5 overflow-hidden ${className}`}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      role="application"
      aria-label="Editor de curva de tonos"
    >
      {/* Header */}
      <motion.div
        className="flex items-center justify-between p-4 border-b border-white/5"
        variants={itemVariants}
      >
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-white/90">Curva de Tonos</h3>
          <div className="group relative">
            <Info className="w-4 h-4 text-white/40 cursor-help" />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-[#1a1a25] rounded-lg text-xs text-white/70 whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 w-48">
              Click para agregar punto. Arrastra para mover. Click derecho o Delete para eliminar.
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Channel Selector */}
          <div className="flex items-center p-0.5 bg-black/30 rounded-lg">
            {CHANNELS.map((ch) => (
              <motion.button
                key={ch.id}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  currentChannel === ch.id
                    ? 'bg-white/10 text-white'
                    : 'text-white/50 hover:text-white/70'
                }`}
                onClick={() => handleChannelChange(ch.id)}
                whileTap={{ scale: 0.95 }}
              >
                <span style={{ color: currentChannel === ch.id ? ch.color : undefined }}>
                  {ch.label}
                </span>
              </motion.button>
            ))}
          </div>

          <div className="w-px h-5 bg-white/10" />

          {/* Grid Toggle */}
          <motion.button
            className={`p-2 rounded-lg transition-colors ${
              showGrid ? 'text-indigo-400 bg-indigo-500/20' : 'text-white/50 hover:text-white/70'
            }`}
            onClick={() => setShowGrid(!showGrid)}
            whileTap={{ scale: 0.95 }}
            title="Toggle grid"
          >
            <Grid3x3 className="w-4 h-4" />
          </motion.button>

          {/* Histogram Toggle */}
          <motion.button
            className={`p-2 rounded-lg transition-colors ${
              showHistogram ? 'text-indigo-400 bg-indigo-500/20' : 'text-white/50 hover:text-white/70'
            }`}
            onClick={() => setShowHistogram(!showHistogram)}
            whileTap={{ scale: 0.95 }}
            title="Toggle histogram"
          >
            {showHistogram ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </motion.button>

          {/* Presets */}
          <div className="relative">
            <motion.button
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white/70 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
              onClick={() => setShowPresetDropdown(!showPresetDropdown)}
              whileTap={{ scale: 0.95 }}
            >
              Presets
              <ChevronDown className="w-3 h-3" />
            </motion.button>
            <PresetDropdown
              presets={presets}
              onSelect={applyPreset}
              isOpen={showPresetDropdown}
              onClose={() => setShowPresetDropdown(false)}
              currentChannel={currentChannel}
            />
          </div>

          {/* Reset */}
          <motion.button
            className="p-2 text-white/50 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
            onClick={resetCurve}
            whileTap={{ scale: 0.95 }}
            title="Reset curve (Ctrl+R)"
          >
            <RotateCcw className="w-4 h-4" />
          </motion.button>
        </div>
      </motion.div>

      {/* Curve Canvas */}
      <motion.div
        className="relative p-4"
        variants={itemVariants}
      >
        <div className="relative aspect-square max-w-[300px] mx-auto">
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-lg" />

          {/* SVG Canvas */}
          <svg
            ref={svgRef}
            className="absolute inset-0 w-full h-full cursor-crosshair"
            viewBox="0 0 256 256"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onContextMenu={(e) => e.preventDefault()}
          >
            {/* Histogram */}
            {showHistogram && histogramData.length > 0 && (
              <HistogramOverlay data={histogramData} width={256} height={256} />
            )}

            {/* Grid */}
            {showGrid && <GridOverlay size={256} divisions={gridSize} />}

            {/* Diagonal reference line */}
            <line
              x1="0"
              y1="256"
              x2="256"
              y2="0"
              stroke="rgba(255,255,255,0.2)"
              strokeWidth="1"
              strokeDasharray="4,4"
            />

            {/* Curve */}
            <motion.path
              d={curvePath}
              fill="none"
              stroke={channelColor}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.3 }}
              style={{
                filter: 'drop-shadow(0 0 4px ' + channelColor + '40)'
              }}
            />

            {/* Points */}
            {points.map((point) => (
              <motion.g
                key={point.id}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                onMouseEnter={() => setHoveredPoint(point.id)}
                onMouseLeave={() => setHoveredPoint(null)}
              >
                {/* Point glow */}
                <circle
                  cx={point.x}
                  cy={255 - point.y}
                  r={hoveredPoint === point.id ? 12 : 8}
                  fill={channelColor}
                  opacity={0.2}
                />
                {/* Point */}
                <circle
                  cx={point.x}
                  cy={255 - point.y}
                  r={hoveredPoint === point.id ? 6 : 5}
                  fill="#1a1a25"
                  stroke={channelColor}
                  strokeWidth="2"
                  style={{ cursor: draggedPoint === point.id ? 'grabbing' : 'grab' }}
                />
              </motion.g>
            ))}
          </svg>

          {/* Labels */}
          <div className="absolute bottom-1 left-2 text-[10px] text-white/40">Shadows</div>
          <div className="absolute bottom-1 right-2 text-[10px] text-white/40">Highlights</div>
          <div className="absolute top-2 left-1 text-[10px] text-white/40 -rotate-90 origin-left">Output</div>
          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[10px] text-white/40">Input</div>
        </div>
      </motion.div>

      {/* Footer - Point Info */}
      <motion.div
        className="px-4 py-3 border-t border-white/5 flex items-center justify-between"
        variants={itemVariants}
      >
        <div className="flex items-center gap-4 text-xs text-white/50">
          <span>{points.length} puntos</span>
          {hoveredPoint && (
            <span className="text-indigo-400">
              Input: {points.find(p => p.id === hoveredPoint)?.x}, Output: {points.find(p => p.id === hoveredPoint)?.y}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <motion.button
            className="px-3 py-1.5 text-xs text-white/70 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
            onClick={() => setShowSaveDialog(true)}
            whileTap={{ scale: 0.95 }}
          >
            <Save className="w-3 h-3 inline mr-1" />
            Guardar preset
          </motion.button>
        </div>
      </motion.div>

      {/* Save Dialog */}
      <AnimatePresence>
        {showSaveDialog && (
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-[#1a1a25] rounded-xl p-4 w-64 border border-white/10"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
            >
              <h4 className="text-sm font-medium text-white/90 mb-3">Guardar preset</h4>
              <input
                type="text"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                placeholder="Nombre del preset"
                className="w-full px-3 py-2 bg-black/30 border border-white/10 rounded-lg text-sm text-white placeholder-white/30 focus:outline-none focus:border-indigo-500/50 mb-3"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') savePreset();
                  if (e.key === 'Escape') setShowSaveDialog(false);
                }}
              />
              <div className="flex gap-2">
                <button
                  className="flex-1 px-3 py-2 text-xs text-white/70 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                  onClick={() => setShowSaveDialog(false)}
                >
                  Cancelar
                </button>
                <button
                  className="flex-1 px-3 py-2 text-xs text-white bg-indigo-500 hover:bg-indigo-400 rounded-lg transition-colors"
                  onClick={savePreset}
                  disabled={!presetName.trim()}
                >
                  Guardar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default ToneCurveEditor;

