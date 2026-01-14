/**
 * APEX Photo Studio - Effects Panel Component
 * 
 * Creative effects including:
 * - Vignette (amount, midpoint, roundness, feather)
 * - Film Grain (amount, size, roughness, monochrome)
 * - Dehaze
 * - Split Toning (shadows/highlights colorization)
 */

import { useState, useCallback, useRef } from 'react';
import { Sparkles, ChevronDown, Sun, Moon } from 'lucide-react';
import { useImageStore } from '@/hooks/useImageStore';

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
  onChangeEnd?: () => void;
}

function Slider({ label, value, min, max, step = 1, unit = '', onChange, onChangeEnd }: SliderProps) {
  const percentage = ((value - min) / (max - min)) * 100;
  const isNeutral = value === 0 || (min === 0 && value === min);
  const hasNegative = min < 0;
  const centerPercent = hasNegative ? ((0 - min) / (max - min)) * 100 : 0;
  
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
          {value > 0 && value !== min ? '+' : ''}{value}{unit}
        </span>
      </div>
      
      <div className="relative h-1.5">
        <div className="absolute inset-0 rounded-full bg-[var(--apex-bg-dark)] border border-[var(--apex-border)]" />
        
        {hasNegative ? (
          <div 
            className="absolute h-full rounded-full bg-[var(--apex-accent)] transition-all duration-75"
            style={{
              left: value < 0 ? `${percentage}%` : `${centerPercent}%`,
              width: `${Math.abs(percentage - centerPercent)}%`,
            }}
          />
        ) : (
          <div 
            className="absolute h-full rounded-full bg-[var(--apex-accent)] transition-all duration-75"
            style={{ width: `${percentage}%` }}
          />
        )}
        
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={e => onChange(parseFloat(e.target.value))}
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

interface HueSliderProps {
  label: string;
  value: number;
  saturation: number;
  onChange: (value: number) => void;
  onSatChange: (value: number) => void;
}

function HueSlider({ label, value, saturation, onChange, onSatChange }: HueSliderProps) {
  const huePercentage = (value / 360) * 100;
  const satPercentage = saturation;
  
  // Generate hue gradient
  const hueGradient = 'linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)';
  
  // Get current color
  const currentColor = `hsl(${value}, ${saturation}%, 50%)`;
  
  return (
    <div className="mb-3">
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-[10px] text-[var(--apex-text-muted)] font-medium flex items-center gap-1.5">
          {label}
          <span 
            className="w-2.5 h-2.5 rounded-full border border-white/20" 
            style={{ background: currentColor }}
          />
        </span>
        <span className="text-[10px] font-mono text-[var(--apex-text-dim)]">
          {value}° / {saturation}%
        </span>
      </div>
      
      {/* Hue slider */}
      <div className="relative h-2 rounded-full overflow-hidden mb-2">
        <div 
          className="absolute inset-0 rounded-full"
          style={{ background: hueGradient }}
        />
        <input
          type="range"
          min={0}
          max={360}
          value={value}
          onChange={e => onChange(parseInt(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer"
        />
        <div 
          className="absolute w-3 h-3 -translate-y-1/2 top-1/2 -translate-x-1/2 pointer-events-none"
          style={{ left: `${huePercentage}%` }}
        >
          <div className="w-full h-full rounded-full bg-white border-2 border-black/30 shadow-sm" />
        </div>
      </div>
      
      {/* Saturation slider */}
      <div className="relative h-1.5">
        <div 
          className="absolute inset-0 rounded-full"
          style={{ 
            background: `linear-gradient(to right, hsl(${value}, 0%, 50%), hsl(${value}, 100%, 50%))` 
          }}
        />
        <input
          type="range"
          min={0}
          max={100}
          value={saturation}
          onChange={e => onSatChange(parseInt(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer"
        />
        <div 
          className="absolute w-2.5 h-2.5 -translate-y-1/2 top-1/2 -translate-x-1/2 pointer-events-none"
          style={{ left: `${satPercentage}%` }}
        >
          <div className="w-full h-full rounded-full bg-white border-2 border-black/30 shadow-sm" />
        </div>
      </div>
    </div>
  );
}

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function Section({ title, icon, isOpen, onToggle, children }: SectionProps) {
  return (
    <div className="border-b border-[var(--apex-border)] last:border-b-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between py-2 px-1 hover:bg-[var(--apex-bg-hover)] transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className={`text-[var(--apex-text-muted)] ${isOpen ? 'text-[var(--apex-accent)]' : ''}`}>
            {icon}
          </span>
          <span className="text-xs font-medium text-[var(--apex-text-secondary)]">{title}</span>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-[var(--apex-text-muted)] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      <div className={`overflow-hidden transition-all duration-200 ${isOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="pb-3 px-1">
          {children}
        </div>
      </div>
    </div>
  );
}

export function EffectsPanel() {
  const [openSections, setOpenSections] = useState({
    vignette: true,
    grain: false,
    dehaze: false,
    splitToning: false,
  });
  
  const { adjustments, setAdjustments, pushHistory } = useImageStore();
  const debounceRef = useRef<NodeJS.Timeout | undefined>(undefined);
  
  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };
  
  const handleChangeEnd = useCallback(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      pushHistory();
    }, 100);
  }, [pushHistory]);
  
  const updateEffects = useCallback((key: string, value: number | boolean) => {
    setAdjustments({
      effects: { ...adjustments.effects, [key]: value },
    });
  }, [adjustments.effects, setAdjustments]);
  
  const updateSplitToning = useCallback((key: string, value: number) => {
    setAdjustments({
      splitToning: { ...adjustments.splitToning, [key]: value },
    });
  }, [adjustments.splitToning, setAdjustments]);
  
  // Check for changes
  const hasVignetteChanges = adjustments.effects.vignetteAmount !== 0;
  const hasGrainChanges = adjustments.effects.grainAmount > 0;
  const hasDehazeChanges = adjustments.effects.dehaze !== 0;
  const hasSplitToningChanges = 
    adjustments.splitToning.highlightSaturation > 0 || 
    adjustments.splitToning.shadowSaturation > 0;
  
  return (
    <div className="p-3">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-[var(--apex-accent)]" />
        <span className="text-xs font-semibold text-[var(--apex-text-primary)]">Effects</span>
      </div>
      
      {/* Vignette */}
      <Section
        title={`Vignette${hasVignetteChanges ? ' •' : ''}`}
        icon={<Sun className="w-3.5 h-3.5" />}
        isOpen={openSections.vignette}
        onToggle={() => toggleSection('vignette')}
      >
        <Slider
          label="Amount"
          value={adjustments.effects.vignetteAmount}
          min={-100}
          max={100}
          onChange={v => updateEffects('vignetteAmount', v)}
          onChangeEnd={handleChangeEnd}
        />
        <Slider
          label="Midpoint"
          value={adjustments.effects.vignetteMidpoint}
          min={0}
          max={100}
          onChange={v => updateEffects('vignetteMidpoint', v)}
          onChangeEnd={handleChangeEnd}
        />
        <Slider
          label="Roundness"
          value={adjustments.effects.vignetteRoundness}
          min={-100}
          max={100}
          onChange={v => updateEffects('vignetteRoundness', v)}
          onChangeEnd={handleChangeEnd}
        />
        <Slider
          label="Feather"
          value={adjustments.effects.vignetteFeather}
          min={0}
          max={100}
          onChange={v => updateEffects('vignetteFeather', v)}
          onChangeEnd={handleChangeEnd}
        />
      </Section>
      
      {/* Grain */}
      <Section
        title={`Film Grain${hasGrainChanges ? ' •' : ''}`}
        icon={<span className="text-xs">✦</span>}
        isOpen={openSections.grain}
        onToggle={() => toggleSection('grain')}
      >
        <Slider
          label="Amount"
          value={adjustments.effects.grainAmount}
          min={0}
          max={100}
          onChange={v => updateEffects('grainAmount', v)}
          onChangeEnd={handleChangeEnd}
        />
        <Slider
          label="Size"
          value={adjustments.effects.grainSize}
          min={0}
          max={100}
          onChange={v => updateEffects('grainSize', v)}
          onChangeEnd={handleChangeEnd}
        />
        <Slider
          label="Roughness"
          value={adjustments.effects.grainRoughness}
          min={0}
          max={100}
          onChange={v => updateEffects('grainRoughness', v)}
          onChangeEnd={handleChangeEnd}
        />
        <label className="flex items-center gap-2 mt-2 cursor-pointer">
          <input
            type="checkbox"
            checked={adjustments.effects.grainMonochrome}
            onChange={e => {
              updateEffects('grainMonochrome', e.target.checked);
              handleChangeEnd();
            }}
            className="w-3.5 h-3.5 rounded border-[var(--apex-border)] bg-[var(--apex-bg-dark)] 
                       checked:bg-[var(--apex-accent)] checked:border-transparent cursor-pointer"
          />
          <span className="text-[10px] text-[var(--apex-text-muted)]">Monochrome</span>
        </label>
      </Section>
      
      {/* Dehaze */}
      <Section
        title={`Dehaze${hasDehazeChanges ? ' •' : ''}`}
        icon={<span className="text-xs opacity-50">◐</span>}
        isOpen={openSections.dehaze}
        onToggle={() => toggleSection('dehaze')}
      >
        <Slider
          label="Amount"
          value={adjustments.effects.dehaze}
          min={-100}
          max={100}
          onChange={v => updateEffects('dehaze', v)}
          onChangeEnd={handleChangeEnd}
        />
        <p className="text-[10px] text-[var(--apex-text-dim)] mt-1">
          Positive values remove haze, negative values add atmospheric effect.
        </p>
      </Section>
      
      {/* Split Toning */}
      <Section
        title={`Split Toning${hasSplitToningChanges ? ' •' : ''}`}
        icon={<Moon className="w-3.5 h-3.5" />}
        isOpen={openSections.splitToning}
        onToggle={() => toggleSection('splitToning')}
      >
        <div className="mb-3">
          <span className="text-[10px] text-[var(--apex-text-secondary)] font-medium">Highlights</span>
        </div>
        <HueSlider
          label="Highlight Color"
          value={adjustments.splitToning.highlightHue}
          saturation={adjustments.splitToning.highlightSaturation}
          onChange={v => updateSplitToning('highlightHue', v)}
          onSatChange={v => updateSplitToning('highlightSaturation', v)}
        />
        
        <div className="mb-3 mt-4">
          <span className="text-[10px] text-[var(--apex-text-secondary)] font-medium">Shadows</span>
        </div>
        <HueSlider
          label="Shadow Color"
          value={adjustments.splitToning.shadowHue}
          saturation={adjustments.splitToning.shadowSaturation}
          onChange={v => updateSplitToning('shadowHue', v)}
          onSatChange={v => updateSplitToning('shadowSaturation', v)}
        />
        
        <div className="mt-4">
          <Slider
            label="Balance"
            value={adjustments.splitToning.balance}
            min={-100}
            max={100}
            onChange={v => updateSplitToning('balance', v)}
            onChangeEnd={handleChangeEnd}
          />
        </div>
      </Section>
    </div>
  );
}
