/**
 * APEX Photo Studio - HSL Panel Component
 * 
 * Per-color HSL adjustments with 8 color channels:
 * Red, Orange, Yellow, Green, Cyan, Blue, Purple, Magenta
 * 
 * Each channel has Hue, Saturation, and Luminance sliders.
 */

import { useState, useCallback } from 'react';
import { Droplets, RotateCcw, Circle } from 'lucide-react';
import { useImageStore } from '@/hooks/useImageStore';

// Color channel definitions with their display colors
const COLOR_CHANNELS = [
  { key: 'red', label: 'R', color: '#ef4444', fullName: 'Red' },
  { key: 'orange', label: 'O', color: '#f97316', fullName: 'Orange' },
  { key: 'yellow', label: 'Y', color: '#eab308', fullName: 'Yellow' },
  { key: 'green', label: 'G', color: '#22c55e', fullName: 'Green' },
  { key: 'cyan', label: 'C', color: '#06b6d4', fullName: 'Cyan' },
  { key: 'blue', label: 'B', color: '#3b82f6', fullName: 'Blue' },
  { key: 'purple', label: 'P', color: '#a855f7', fullName: 'Purple' },
  { key: 'magenta', label: 'M', color: '#ec4899', fullName: 'Magenta' },
] as const;

type ColorChannelKey = typeof COLOR_CHANNELS[number]['key'];

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  color?: string;
}

function HSLSlider({ label, value, min, max, onChange, color }: SliderProps) {
  const percentage = ((value - min) / (max - min)) * 100;
  const isNeutral = value === 0;
  const hasNegative = min < 0;
  const centerPercent = hasNegative ? ((0 - min) / (max - min)) * 100 : 0;
  
  return (
    <div className="mb-3 group">
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-[10px] text-[var(--apex-text-muted)] font-medium uppercase tracking-wider">
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
        
        {hasNegative ? (
          <div 
            className="absolute h-full rounded-full transition-all duration-75"
            style={{
              left: value < 0 ? `${percentage}%` : `${centerPercent}%`,
              width: `${Math.abs(percentage - centerPercent)}%`,
              background: color || 'var(--apex-accent)',
            }}
          />
        ) : (
          <div 
            className="absolute h-full rounded-full transition-all duration-75"
            style={{ 
              width: `${percentage}%`,
              background: color || 'var(--apex-accent)',
            }}
          />
        )}
        
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={e => onChange(parseFloat(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer"
        />
        
        <div 
          className="absolute w-3 h-3 -translate-y-1/2 top-1/2 -translate-x-1/2 pointer-events-none"
          style={{ left: `${percentage}%` }}
        >
          <div 
            className="w-full h-full rounded-full border-2 shadow-sm"
            style={{ 
              background: 'white',
              borderColor: color || 'var(--apex-accent)',
            }} 
          />
        </div>
      </div>
    </div>
  );
}

export function HSLPanel() {
  const [activeChannel, setActiveChannel] = useState<ColorChannelKey>('red');
  const { adjustments, setAdjustments, pushHistory } = useImageStore();
  
  const currentChannel = adjustments.hsl[activeChannel];
  const channelInfo = COLOR_CHANNELS.find(c => c.key === activeChannel)!;
  
  const updateChannel = useCallback((property: 'hue' | 'saturation' | 'luminance', value: number) => {
    setAdjustments({
      hsl: {
        ...adjustments.hsl,
        [activeChannel]: {
          ...adjustments.hsl[activeChannel],
          [property]: value,
        },
      },
    });
  }, [activeChannel, adjustments.hsl, setAdjustments]);
  
  const resetChannel = useCallback(() => {
    setAdjustments({
      hsl: {
        ...adjustments.hsl,
        [activeChannel]: { hue: 0, saturation: 0, luminance: 0 },
      },
    });
    pushHistory();
  }, [activeChannel, adjustments.hsl, setAdjustments, pushHistory]);
  
  const resetAll = useCallback(() => {
    setAdjustments({
      hsl: {
        red: { hue: 0, saturation: 0, luminance: 0 },
        orange: { hue: 0, saturation: 0, luminance: 0 },
        yellow: { hue: 0, saturation: 0, luminance: 0 },
        green: { hue: 0, saturation: 0, luminance: 0 },
        cyan: { hue: 0, saturation: 0, luminance: 0 },
        blue: { hue: 0, saturation: 0, luminance: 0 },
        purple: { hue: 0, saturation: 0, luminance: 0 },
        magenta: { hue: 0, saturation: 0, luminance: 0 },
      },
    });
    pushHistory();
  }, [setAdjustments, pushHistory]);
  
  // Check if any channel has non-zero values
  const hasChanges = Object.values(adjustments.hsl).some(
    ch => ch.hue !== 0 || ch.saturation !== 0 || ch.luminance !== 0
  );
  
  // Check if current channel has changes
  const channelHasChanges = 
    currentChannel.hue !== 0 || 
    currentChannel.saturation !== 0 || 
    currentChannel.luminance !== 0;
  
  return (
    <div className="p-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Droplets className="w-4 h-4 text-[var(--apex-accent)]" />
          <span className="text-xs font-semibold text-[var(--apex-text-primary)]">HSL / Color</span>
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
      
      {/* Color Channel Selector */}
      <div className="flex gap-1 mb-4 p-1 bg-[var(--apex-bg-dark)] rounded-lg">
        {COLOR_CHANNELS.map(channel => {
          const isActive = channel.key === activeChannel;
          const ch = adjustments.hsl[channel.key];
          const hasValue = ch.hue !== 0 || ch.saturation !== 0 || ch.luminance !== 0;
          
          return (
            <button
              key={channel.key}
              onClick={() => setActiveChannel(channel.key)}
              className={`flex-1 flex items-center justify-center py-1.5 rounded-md transition-all relative ${
                isActive 
                  ? 'bg-[var(--apex-bg-elevated)] shadow-sm' 
                  : 'hover:bg-[var(--apex-bg-hover)]'
              }`}
              title={channel.fullName}
            >
              <Circle 
                className="w-3 h-3"
                fill={channel.color}
                stroke={isActive ? 'white' : 'transparent'}
                strokeWidth={2}
              />
              {hasValue && !isActive && (
                <div 
                  className="absolute bottom-0.5 w-1 h-1 rounded-full"
                  style={{ background: channel.color }}
                />
              )}
            </button>
          );
        })}
      </div>
      
      {/* Current Channel Label */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div 
            className="w-3 h-3 rounded-full"
            style={{ background: channelInfo.color }}
          />
          <span className="text-xs font-medium text-[var(--apex-text-secondary)]">
            {channelInfo.fullName}
          </span>
        </div>
        {channelHasChanges && (
          <button
            onClick={resetChannel}
            className="text-[10px] text-[var(--apex-text-dim)] hover:text-[var(--apex-accent)] transition-colors"
          >
            Reset
          </button>
        )}
      </div>
      
      {/* HSL Sliders */}
      <HSLSlider
        label="Hue"
        value={currentChannel.hue}
        min={-100}
        max={100}
        onChange={v => updateChannel('hue', v)}
        color={channelInfo.color}
      />
      <HSLSlider
        label="Saturation"
        value={currentChannel.saturation}
        min={-100}
        max={100}
        onChange={v => updateChannel('saturation', v)}
        color={channelInfo.color}
      />
      <HSLSlider
        label="Luminance"
        value={currentChannel.luminance}
        min={-100}
        max={100}
        onChange={v => updateChannel('luminance', v)}
        color={channelInfo.color}
      />
      
      {/* Tip */}
      <div className="mt-4 text-[10px] text-[var(--apex-text-dim)] bg-[var(--apex-bg-dark)] rounded p-2">
        <strong>Tip:</strong> Adjust hue to shift colors, saturation to control intensity, 
        luminance to brighten or darken specific colors.
      </div>
    </div>
  );
}
