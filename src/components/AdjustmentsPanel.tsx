/**
 * APEX Photo Studio - Premium Adjustments Panel
 * 
 * Professional adjustment controls with:
 * - Collapsible sections with smooth transitions
 * - Premium sliders with glow effects
 * - Value highlighting on change
 * - Animated reset buttons
 */

import { useState, useCallback, useRef } from 'react';
import { ChevronDown, RotateCcw, Sun, Palette, Sparkles } from 'lucide-react';
import { useImageStore } from '@/hooks/useImageStore';
import { HSLPanel } from './HSLPanel';
import { ToneCurveEditor } from './ToneCurveEditor';
import { EffectsPanel } from './EffectsPanel';
import { LensCorrectionPanel } from './LensCorrectionPanel';

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

function Slider({ 
  label, value, min, max, step = 1, unit = '', onChange, onChangeEnd 
}: SliderProps) {
  const percentage = ((value - min) / (max - min)) * 100;
  const isNeutral = value === 0 || (min === 0 && value === min);
  const isDragging = useRef(false);
  
  // Calculate center position for bidirectional sliders
  const hasNegative = min < 0;
  const centerPercent = hasNegative ? ((0 - min) / (max - min)) * 100 : 0;
  
  return (
    <div className="mb-4 group">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs text-[var(--apex-text-muted)] font-medium group-hover:text-[var(--apex-text-secondary)] transition-colors">
          {label}
        </span>
        <span className={`text-xs font-mono tabular-nums px-1.5 py-0.5 rounded transition-all duration-200 ${
          isNeutral 
            ? 'text-[var(--apex-text-dim)] bg-transparent' 
            : 'text-[var(--apex-accent)] bg-[var(--apex-accent-subtle)]'
        }`}>
          {value > 0 && value !== min ? '+' : ''}{value}{unit}
        </span>
      </div>
      
      <div className="relative h-1.5 group/slider">
        {/* Track Background */}
        <div className="absolute inset-0 rounded-full bg-[var(--apex-bg-dark)] border border-[var(--apex-border)]" />
        
        {/* Active Track */}
        {hasNegative ? (
          // Bidirectional track from center
          <div 
            className="absolute h-full rounded-full bg-gradient-to-r from-[var(--apex-accent)] to-[var(--apex-accent-light)] transition-all duration-75"
            style={{
              left: value < 0 ? `${percentage}%` : `${centerPercent}%`,
              width: `${Math.abs(percentage - centerPercent)}%`,
            }}
          />
        ) : (
          // Standard track from left
          <div 
            className="absolute h-full rounded-full bg-gradient-to-r from-[var(--apex-accent)] to-[var(--apex-accent-light)] transition-all duration-75"
            style={{ width: `${percentage}%` }}
          />
        )}
        
        {/* Hidden Native Input */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={e => {
            isDragging.current = true;
            onChange(parseFloat(e.target.value));
          }}
          onMouseUp={() => {
            isDragging.current = false;
            onChangeEnd?.();
          }}
          onTouchEnd={() => {
            isDragging.current = false;
            onChangeEnd?.();
          }}
          className="absolute inset-0 w-full opacity-0 cursor-pointer z-10"
        />
        
        {/* Custom Thumb */}
        <div 
          className="absolute w-4 h-4 -translate-y-1/2 top-1/2 -translate-x-1/2 pointer-events-none transition-transform duration-75 group-hover/slider:scale-110"
          style={{ left: `${percentage}%` }}
        >
          <div className="w-full h-full rounded-full bg-gradient-to-br from-white to-gray-200 border-2 border-[var(--apex-accent)] shadow-lg" />
          <div className="absolute inset-0 rounded-full opacity-0 group-hover/slider:opacity-100 transition-opacity" 
               style={{ boxShadow: '0 0 12px var(--apex-accent-glow)' }} />
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
  onReset?: () => void;
  children: React.ReactNode;
}

function Section({ title, icon, isOpen, onToggle, onReset, children }: SectionProps) {
  return (
    <div className="border-b border-[var(--apex-border)]">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-[var(--apex-bg-hover)] transition-colors group"
      >
        <div className="flex items-center gap-2">
          <span className={`transition-colors ${isOpen ? 'text-[var(--apex-accent)]' : 'text-[var(--apex-text-muted)]'}`}>
            {icon}
          </span>
          <span className="text-sm font-semibold text-[var(--apex-text-primary)]">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          {onReset && (
            <button
              onClick={e => { e.stopPropagation(); onReset(); }}
              className="p-1.5 rounded-md hover:bg-[var(--apex-bg-elevated)] text-[var(--apex-text-dim)] hover:text-[var(--apex-text-secondary)] 
                         opacity-0 group-hover:opacity-100 transition-all hover:rotate-[-360deg] duration-500"
              title="Reset section"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronDown 
            className={`w-4 h-4 text-[var(--apex-text-muted)] transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} 
          />
        </div>
      </button>
      
      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
        isOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
      }`}>
        <div className="px-4 pb-4">
          {children}
        </div>
      </div>
    </div>
  );
}

export function AdjustmentsPanel() {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    basic: true,
    color: true,
    detail: false,
  });
  
  const debounceRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const { adjustments, setAdjustments, pushHistory, image } = useImageStore();
  
  const toggleSection = (section: string) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };
  
  // Debounced adjustment updater
  const updateAdjustment = useCallback((
    category: 'basic' | 'color' | 'detail',
    key: string,
    value: number
  ) => {
    setAdjustments({
      [category]: { ...adjustments[category], [key]: value }
    });
  }, [adjustments, setAdjustments]);
  
  const handleChangeEnd = useCallback(() => {
    // Push to history after slider release
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      pushHistory();
    }, 100);
  }, [pushHistory]);
  
  const resetBasic = () => {
    setAdjustments({
      basic: {
        exposure: 0, contrast: 0, highlights: 0,
        shadows: 0, whites: 0, blacks: 0
      }
    });
  };
  
  const resetColor = () => {
    setAdjustments({
      color: { temperature: 6500, tint: 0, vibrance: 0, saturation: 0 }
    });
  };
  
  const resetDetail = () => {
    setAdjustments({
      detail: { clarity: 0, sharpness: 0, sharpnessRadius: 1, noiseReduction: 0 }
    });
  };
  
  if (!image.original) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-6 animate-fade-in-up">
        <div className="w-16 h-16 rounded-2xl bg-[var(--apex-bg-hover)] flex items-center justify-center mb-4">
          <Sparkles className="w-8 h-8 text-[var(--apex-text-dim)]" />
        </div>
        <p className="text-[var(--apex-text-muted)] text-sm max-w-[200px]">
          Capture or import an image to start editing
        </p>
      </div>
    );
  }
  
  return (
    <div className="h-full overflow-y-auto animate-slide-in-right">
      {/* Basic Adjustments */}
      <Section 
        title="Basic" 
        icon={<Sun className="w-4 h-4" />}
        isOpen={openSections.basic}
        onToggle={() => toggleSection('basic')}
        onReset={resetBasic}
      >
        <Slider
          label="Exposure"
          value={adjustments.basic.exposure}
          min={-5}
          max={5}
          step={0.01}
          unit=" EV"
          onChange={v => updateAdjustment('basic', 'exposure', v)}
          onChangeEnd={handleChangeEnd}
        />
        <Slider
          label="Contrast"
          value={adjustments.basic.contrast}
          min={-100}
          max={100}
          onChange={v => updateAdjustment('basic', 'contrast', v)}
          onChangeEnd={handleChangeEnd}
        />
        <Slider
          label="Highlights"
          value={adjustments.basic.highlights}
          min={-100}
          max={100}
          onChange={v => updateAdjustment('basic', 'highlights', v)}
          onChangeEnd={handleChangeEnd}
        />
        <Slider
          label="Shadows"
          value={adjustments.basic.shadows}
          min={-100}
          max={100}
          onChange={v => updateAdjustment('basic', 'shadows', v)}
          onChangeEnd={handleChangeEnd}
        />
        <Slider
          label="Whites"
          value={adjustments.basic.whites}
          min={-100}
          max={100}
          onChange={v => updateAdjustment('basic', 'whites', v)}
          onChangeEnd={handleChangeEnd}
        />
        <Slider
          label="Blacks"
          value={adjustments.basic.blacks}
          min={-100}
          max={100}
          onChange={v => updateAdjustment('basic', 'blacks', v)}
          onChangeEnd={handleChangeEnd}
        />
      </Section>
      
      {/* Color Adjustments */}
      <Section 
        title="Color" 
        icon={<Palette className="w-4 h-4" />}
        isOpen={openSections.color}
        onToggle={() => toggleSection('color')}
        onReset={resetColor}
      >
        <Slider
          label="Temperature"
          value={adjustments.color.temperature}
          min={2000}
          max={50000}
          step={100}
          unit="K"
          onChange={v => updateAdjustment('color', 'temperature', v)}
          onChangeEnd={handleChangeEnd}
        />
        <Slider
          label="Tint"
          value={adjustments.color.tint}
          min={-100}
          max={100}
          onChange={v => updateAdjustment('color', 'tint', v)}
          onChangeEnd={handleChangeEnd}
        />
        <Slider
          label="Vibrance"
          value={adjustments.color.vibrance}
          min={-100}
          max={100}
          onChange={v => updateAdjustment('color', 'vibrance', v)}
          onChangeEnd={handleChangeEnd}
        />
        <Slider
          label="Saturation"
          value={adjustments.color.saturation}
          min={-100}
          max={100}
          onChange={v => updateAdjustment('color', 'saturation', v)}
          onChangeEnd={handleChangeEnd}
        />
      </Section>
      
      {/* Detail Adjustments */}
      <Section 
        title="Detail" 
        icon={<Sparkles className="w-4 h-4" />}
        isOpen={openSections.detail}
        onToggle={() => toggleSection('detail')}
        onReset={resetDetail}
      >
        <Slider
          label="Clarity"
          value={adjustments.detail.clarity}
          min={-100}
          max={100}
          onChange={v => updateAdjustment('detail', 'clarity', v)}
          onChangeEnd={handleChangeEnd}
        />
        <Slider
          label="Sharpness"
          value={adjustments.detail.sharpness}
          min={0}
          max={150}
          onChange={v => updateAdjustment('detail', 'sharpness', v)}
          onChangeEnd={handleChangeEnd}
        />
        <Slider
          label="Noise Reduction"
          value={adjustments.detail.noiseReduction}
          min={0}
          max={100}
          onChange={v => updateAdjustment('detail', 'noiseReduction', v)}
          onChangeEnd={handleChangeEnd}
        />
      </Section>
      
      {/* HSL/Color Panel */}
      <Section 
        title="HSL / Color" 
        icon={<Palette className="w-4 h-4" />}
        isOpen={openSections.hsl ?? false}
        onToggle={() => toggleSection('hsl')}
      >
        <HSLPanel />
      </Section>
      
      {/* Tone Curve */}
      <Section 
        title="Tone Curve" 
        icon={<Sparkles className="w-4 h-4" />}
        isOpen={openSections.curves ?? false}
        onToggle={() => toggleSection('curves')}
      >
        <ToneCurveEditor />
      </Section>
      
      {/* Effects */}
      <Section 
        title="Effects" 
        icon={<Sparkles className="w-4 h-4" />}
        isOpen={openSections.effects ?? false}
        onToggle={() => toggleSection('effects')}
      >
        <EffectsPanel />
      </Section>
      
      {/* Lens Correction */}
      <Section 
        title="Lens Correction" 
        icon={<Sparkles className="w-4 h-4" />}
        isOpen={openSections.lens ?? false}
        onToggle={() => toggleSection('lens')}
      >
        <LensCorrectionPanel />
      </Section>
    </div>
  );
}
