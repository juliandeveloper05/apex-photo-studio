/**
 * APEX Photo Studio - Tone Curve Editor Component
 * 
 * Interactive SVG-based curve editor with:
 * - Click to add control points
 * - Drag to adjust points
 * - Double-click to remove points
 * - RGB Master + individual channel curves
 * - Histogram underlay
 */

import { useState, useCallback, useRef, useMemo } from 'react';
import { Spline, RotateCcw } from 'lucide-react';
import { useImageStore } from '@/hooks/useImageStore';
import type { CurvePoint } from '@/types';

type CurveChannel = 'rgb' | 'red' | 'green' | 'blue';

const CHANNEL_COLORS = {
  rgb: '#ffffff',
  red: '#ef4444',
  green: '#22c55e',
  blue: '#3b82f6',
};

const CURVE_SIZE = 200;
const PADDING = 8;
const POINT_RADIUS = 6;

/**
 * Cubic spline interpolation for smooth curve rendering
 */
function interpolateCurve(points: CurvePoint[]): string {
  if (points.length < 2) return '';
  
  const sorted = [...points].sort((a, b) => a.x - b.x);
  const pathPoints: string[] = [];
  
  // Generate enough points for smooth curve
  for (let x = 0; x <= 255; x += 2) {
    const y = cubicInterpolate(sorted, x);
    const px = (x / 255) * CURVE_SIZE;
    const py = CURVE_SIZE - (y / 255) * CURVE_SIZE;
    
    if (x === 0) {
      pathPoints.push(`M ${px + PADDING} ${py + PADDING}`);
    } else {
      pathPoints.push(`L ${px + PADDING} ${py + PADDING}`);
    }
  }
  
  return pathPoints.join(' ');
}

function cubicInterpolate(points: CurvePoint[], x: number): number {
  if (x <= points[0].x) return points[0].y;
  if (x >= points[points.length - 1].x) return points[points.length - 1].y;
  
  let i = 0;
  for (i = 0; i < points.length - 1; i++) {
    if (x >= points[i].x && x < points[i + 1].x) break;
  }
  
  const p0 = points[Math.max(0, i - 1)];
  const p1 = points[i];
  const p2 = points[i + 1];
  const p3 = points[Math.min(points.length - 1, i + 2)];
  
  const t = (x - p1.x) / (p2.x - p1.x);
  const t2 = t * t;
  const t3 = t2 * t;
  
  const y = 0.5 * (
    (2 * p1.y) +
    (-p0.y + p2.y) * t +
    (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
    (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3
  );
  
  return Math.max(0, Math.min(255, y));
}

interface CurveEditorSVGProps {
  points: CurvePoint[];
  color: string;
  onPointsChange: (points: CurvePoint[]) => void;
  histogram?: number[];
}

function CurveEditorSVG({ points, color, onPointsChange, histogram }: CurveEditorSVGProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  
  const curvePath = useMemo(() => interpolateCurve(points), [points]);
  
  const toSvgCoords = useCallback((clientX: number, clientY: number) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(255, ((clientX - rect.left - PADDING) / CURVE_SIZE) * 255)),
      y: Math.max(0, Math.min(255, (1 - (clientY - rect.top - PADDING) / CURVE_SIZE) * 255)),
    };
  }, []);
  
  const handleMouseDown = useCallback((e: React.MouseEvent, index: number) => {
    e.preventDefault();
    // Don't allow dragging first or last point horizontally
    setDraggingIndex(index);
  }, []);
  
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (draggingIndex === null) return;
    
    const coords = toSvgCoords(e.clientX, e.clientY);
    const newPoints = [...points];
    
    // First and last points can only move vertically
    if (draggingIndex === 0) {
      newPoints[0] = { x: 0, y: Math.round(coords.y) };
    } else if (draggingIndex === points.length - 1) {
      newPoints[draggingIndex] = { x: 255, y: Math.round(coords.y) };
    } else {
      // Constrain to between neighbors
      const minX = points[draggingIndex - 1].x + 1;
      const maxX = points[draggingIndex + 1].x - 1;
      newPoints[draggingIndex] = {
        x: Math.round(Math.max(minX, Math.min(maxX, coords.x))),
        y: Math.round(coords.y),
      };
    }
    
    onPointsChange(newPoints);
  }, [draggingIndex, points, toSvgCoords, onPointsChange]);
  
  const handleMouseUp = useCallback(() => {
    setDraggingIndex(null);
  }, []);
  
  const handleDoubleClick = useCallback((index: number) => {
    // Can't remove first or last point
    if (index === 0 || index === points.length - 1) return;
    const newPoints = points.filter((_, i) => i !== index);
    onPointsChange(newPoints);
  }, [points, onPointsChange]);
  
  const handleSvgClick = useCallback((e: React.MouseEvent) => {
    if (draggingIndex !== null) return;
    
    const coords = toSvgCoords(e.clientX, e.clientY);
    
    // Don't add if too close to existing point
    const tooClose = points.some(p => 
      Math.abs(p.x - coords.x) < 10 && Math.abs(p.y - coords.y) < 10
    );
    if (tooClose) return;
    
    const newPoint = { x: Math.round(coords.x), y: Math.round(coords.y) };
    const newPoints = [...points, newPoint].sort((a, b) => a.x - b.x);
    onPointsChange(newPoints);
  }, [draggingIndex, points, toSvgCoords, onPointsChange]);
  
  const svgSize = CURVE_SIZE + PADDING * 2;
  
  return (
    <svg
      ref={svgRef}
      width={svgSize}
      height={svgSize}
      className="bg-[var(--apex-bg-dark)] rounded-lg cursor-crosshair"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={handleSvgClick}
    >
      {/* Histogram underlay */}
      {histogram && (
        <g opacity="0.3">
          {histogram.map((value, i) => {
            const x = (i / 255) * CURVE_SIZE + PADDING;
            const height = (value / Math.max(...histogram)) * CURVE_SIZE * 0.5;
            return (
              <rect
                key={i}
                x={x}
                y={svgSize - PADDING - height}
                width={CURVE_SIZE / 256 + 0.5}
                height={height}
                fill={color}
              />
            );
          })}
        </g>
      )}
      
      {/* Grid lines */}
      <g stroke="rgba(255,255,255,0.1)" strokeWidth="1">
        {[0.25, 0.5, 0.75].map(t => (
          <g key={t}>
            <line
              x1={PADDING}
              y1={PADDING + t * CURVE_SIZE}
              x2={PADDING + CURVE_SIZE}
              y2={PADDING + t * CURVE_SIZE}
            />
            <line
              x1={PADDING + t * CURVE_SIZE}
              y1={PADDING}
              x2={PADDING + t * CURVE_SIZE}
              y2={PADDING + CURVE_SIZE}
            />
          </g>
        ))}
      </g>
      
      {/* Diagonal reference line */}
      <line
        x1={PADDING}
        y1={PADDING + CURVE_SIZE}
        x2={PADDING + CURVE_SIZE}
        y2={PADDING}
        stroke="rgba(255,255,255,0.2)"
        strokeWidth="1"
        strokeDasharray="4,4"
      />
      
      {/* Curve */}
      <path
        d={curvePath}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      
      {/* Control points */}
      {points.map((point, index) => {
        const cx = (point.x / 255) * CURVE_SIZE + PADDING;
        const cy = CURVE_SIZE - (point.y / 255) * CURVE_SIZE + PADDING;
        const isHovered = hoverIndex === index;
        const isDragging = draggingIndex === index;
        
        return (
          <g key={index}>
            <circle
              cx={cx}
              cy={cy}
              r={POINT_RADIUS + (isHovered || isDragging ? 2 : 0)}
              fill={isDragging ? color : 'var(--apex-bg-elevated)'}
              stroke={color}
              strokeWidth="2"
              className="cursor-grab active:cursor-grabbing transition-all"
              onMouseDown={e => handleMouseDown(e, index)}
              onMouseEnter={() => setHoverIndex(index)}
              onMouseLeave={() => setHoverIndex(null)}
              onDoubleClick={() => handleDoubleClick(index)}
            />
          </g>
        );
      })}
      
      {/* Border */}
      <rect
        x={PADDING}
        y={PADDING}
        width={CURVE_SIZE}
        height={CURVE_SIZE}
        fill="none"
        stroke="rgba(255,255,255,0.1)"
        strokeWidth="1"
        rx="2"
      />
    </svg>
  );
}

export function ToneCurveEditor() {
  const [activeChannel, setActiveChannel] = useState<CurveChannel>('rgb');
  const { adjustments, setAdjustments, pushHistory, histogram } = useImageStore();
  
  const currentPoints = adjustments.curves[activeChannel];
  
  const updatePoints = useCallback((points: CurvePoint[]) => {
    setAdjustments({
      curves: {
        ...adjustments.curves,
        [activeChannel]: points,
      },
    });
  }, [activeChannel, adjustments.curves, setAdjustments]);
  
  const resetChannel = useCallback(() => {
    setAdjustments({
      curves: {
        ...adjustments.curves,
        [activeChannel]: [{ x: 0, y: 0 }, { x: 255, y: 255 }],
      },
    });
    pushHistory();
  }, [activeChannel, adjustments.curves, setAdjustments, pushHistory]);
  
  const resetAll = useCallback(() => {
    setAdjustments({
      curves: {
        rgb: [{ x: 0, y: 0 }, { x: 255, y: 255 }],
        red: [{ x: 0, y: 0 }, { x: 255, y: 255 }],
        green: [{ x: 0, y: 0 }, { x: 255, y: 255 }],
        blue: [{ x: 0, y: 0 }, { x: 255, y: 255 }],
      },
    });
    pushHistory();
  }, [setAdjustments, pushHistory]);
  
  // Check if curve is non-default
  const isDefault = (points: CurvePoint[]) => 
    points.length === 2 && 
    points[0].x === 0 && points[0].y === 0 &&
    points[1].x === 255 && points[1].y === 255;
  
  const hasChanges = !isDefault(adjustments.curves.rgb) ||
                     !isDefault(adjustments.curves.red) ||
                     !isDefault(adjustments.curves.green) ||
                     !isDefault(adjustments.curves.blue);
  
  // Get histogram for current channel
  const channelHistogram = histogram ? (
    activeChannel === 'rgb' ? histogram.luminance :
    activeChannel === 'red' ? histogram.red :
    activeChannel === 'green' ? histogram.green :
    histogram.blue
  ) : undefined;
  
  return (
    <div className="p-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Spline className="w-4 h-4 text-[var(--apex-accent)]" />
          <span className="text-xs font-semibold text-[var(--apex-text-primary)]">Tone Curve</span>
        </div>
        {hasChanges && (
          <button
            onClick={resetAll}
            className="p-1 rounded text-[var(--apex-text-dim)] hover:text-[var(--apex-text-secondary)] 
                       hover:bg-[var(--apex-bg-hover)] transition-all"
            title="Reset all curves"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      
      {/* Channel Selector */}
      <div className="flex gap-1 mb-3">
        {(['rgb', 'red', 'green', 'blue'] as CurveChannel[]).map(channel => {
          const isActive = channel === activeChannel;
          const hasValue = !isDefault(adjustments.curves[channel]);
          
          return (
            <button
              key={channel}
              onClick={() => setActiveChannel(channel)}
              className={`flex-1 py-1.5 text-[10px] font-medium uppercase rounded transition-all ${
                isActive 
                  ? 'bg-[var(--apex-bg-elevated)] shadow-sm' 
                  : 'hover:bg-[var(--apex-bg-hover)]'
              }`}
              style={{ 
                color: isActive ? CHANNEL_COLORS[channel] : 'var(--apex-text-muted)',
                borderBottom: hasValue ? `2px solid ${CHANNEL_COLORS[channel]}` : 'none',
              }}
            >
              {channel.toUpperCase()}
            </button>
          );
        })}
      </div>
      
      {/* Curve Editor */}
      <div className="flex justify-center">
        <CurveEditorSVG
          points={currentPoints}
          color={CHANNEL_COLORS[activeChannel]}
          onPointsChange={updatePoints}
          histogram={channelHistogram}
        />
      </div>
      
      {/* Current channel reset */}
      {!isDefault(currentPoints) && (
        <button
          onClick={resetChannel}
          className="mt-2 w-full text-[10px] text-[var(--apex-text-dim)] hover:text-[var(--apex-accent)] 
                     py-1 transition-colors"
        >
          Reset {activeChannel.toUpperCase()} curve
        </button>
      )}
      
      {/* Instructions */}
      <div className="mt-3 text-[10px] text-[var(--apex-text-dim)] bg-[var(--apex-bg-dark)] rounded p-2 space-y-1">
        <div>• <strong>Click</strong> to add control point</div>
        <div>• <strong>Drag</strong> to adjust point</div>
        <div>• <strong>Double-click</strong> to remove point</div>
      </div>
    </div>
  );
}
