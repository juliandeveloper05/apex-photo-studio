/**
 * APEX Photo Studio - Lens Correction Panel Component
 * 
 * Lens correction controls:
 * - Distortion (barrel/pincushion)
 * - Chromatic Aberration (Red/Cyan, Blue/Yellow)
 */

import { useCallback, useRef } from 'react';
import { Aperture, RotateCcw } from 'lucide-react';
import { useImageStore } from '@/hooks/useImageStore';

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  onChangeEnd?: () => void;
}

function Slider({ label, value, min, max, onChange, onChangeEnd }: SliderProps) {
  const percentage = ((value - min) / (max - min)) * 100;
  const isNeutral = value === 0;
  const centerPercent = ((0 - min) / (max - min)) * 100;
  
  return (
    <div className="mb-3 group">
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-[10px] text-[var(--apex-text-muted)] font-medium">
          {label}
        </span>
        <span className={`text-[10px] font-mono tabular-nums px-1 py-0.5 rounded transition-all ${
          isNeutral 
            ? 'text-[var(--apex-text-dim)]' 
            : 'text-white bg-white/10'
        }`}>
          {value > 0 ? '+' : ''}{value}
        </span>
      </div>
      
      <div className="relative h-1.5">
        <div className="absolute inset-0 rounded-full bg-[var(--apex-bg-dark)] border border-[var(--apex-border)]" />
        
        <div 
          className="absolute h-full rounded-full bg-[var(--apex-accent)] transition-all duration-75"
          style={{
            left: value < 0 ? `${percentage}%` : `${centerPercent}%`,
            width: `${Math.abs(percentage - centerPercent)}%`,
          }}
        />
        
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={e => onChange(parseInt(e.target.value))}
          onMouseUp={() => onChangeEnd?.()}
          onTouchEnd={() => onChangeEnd?.()}
          className="absolute inset-0 w-full opacity-0 cursor-pointer"
        />
        
        <div 
          className="absolute w-3 h-3 -translate-y-1/2 top-1/2 -translate-x-1/2 pointer-events-none"
          style={{ left: `${percentage}%` }}
        >
          <div className="w-full h-full rounded-full bg-white border-2 border-[var(--apex-accent)] shadow-sm" />
        </div>
      </div>
    </div>
  );
}

export function LensCorrectionPanel() {
  const { adjustments, setAdjustments, pushHistory } = useImageStore();
  const debounceRef = useRef<NodeJS.Timeout | undefined>(undefined);
  
  const handleChangeEnd = useCallback(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      pushHistory();
    }, 100);
  }, [pushHistory]);
  
  const updateDistortion = useCallback((value: number) => {
    setAdjustments({
      lensCorrection: {
        ...adjustments.lensCorrection,
        distortion: value,
      },
    });
  }, [adjustments.lensCorrection, setAdjustments]);
  
  const updateCA = useCallback((key: 'redCyan' | 'blueYellow', value: number) => {
    setAdjustments({
      lensCorrection: {
        ...adjustments.lensCorrection,
        chromaticAberration: {
          ...adjustments.lensCorrection.chromaticAberration,
          [key]: value,
        },
      },
    });
  }, [adjustments.lensCorrection, setAdjustments]);
  
  const resetAll = useCallback(() => {
    setAdjustments({
      lensCorrection: {
        distortion: 0,
        chromaticAberration: { redCyan: 0, blueYellow: 0 },
      },
    });
    pushHistory();
  }, [setAdjustments, pushHistory]);
  
  const hasChanges = 
    adjustments.lensCorrection.distortion !== 0 ||
    adjustments.lensCorrection.chromaticAberration.redCyan !== 0 ||
    adjustments.lensCorrection.chromaticAberration.blueYellow !== 0;
  
  return (
    <div className="p-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Aperture className="w-4 h-4 text-[var(--apex-accent)]" />
          <span className="text-xs font-semibold text-[var(--apex-text-primary)]">Lens Correction</span>
        </div>
        {hasChanges && (
          <button
            onClick={resetAll}
            className="p-1 rounded text-[var(--apex-text-dim)] hover:text-[var(--apex-text-secondary)] 
                       hover:bg-[var(--apex-bg-hover)] transition-all"
            title="Reset all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      
      {/* Distortion */}
      <div className="mb-4">
        <span className="text-[10px] text-[var(--apex-text-secondary)] font-medium uppercase tracking-wider mb-2 block">
          Distortion
        </span>
        <Slider
          label="Amount"
          value={adjustments.lensCorrection.distortion}
          min={-100}
          max={100}
          onChange={updateDistortion}
          onChangeEnd={handleChangeEnd}
        />
        <p className="text-[10px] text-[var(--apex-text-dim)] -mt-1">
          Positive for barrel, negative for pincushion correction
        </p>
      </div>
      
      {/* Chromatic Aberration */}
      <div>
        <span className="text-[10px] text-[var(--apex-text-secondary)] font-medium uppercase tracking-wider mb-2 block">
          Chromatic Aberration
        </span>
        <Slider
          label="Red / Cyan"
          value={adjustments.lensCorrection.chromaticAberration.redCyan}
          min={-100}
          max={100}
          onChange={v => updateCA('redCyan', v)}
          onChangeEnd={handleChangeEnd}
        />
        <Slider
          label="Blue / Yellow"
          value={adjustments.lensCorrection.chromaticAberration.blueYellow}
          min={-100}
          max={100}
          onChange={v => updateCA('blueYellow', v)}
          onChangeEnd={handleChangeEnd}
        />
        <p className="text-[10px] text-[var(--apex-text-dim)]">
          Removes color fringing on high-contrast edges
        </p>
      </div>
      
      {/* Tip */}
      <div className="mt-4 text-[10px] text-[var(--apex-text-dim)] bg-[var(--apex-bg-dark)] rounded p-2">
        <strong>Tip:</strong> Use distortion correction to straighten curved lines 
        caused by wide-angle or telephoto lenses.
      </div>
    </div>
  );
}
