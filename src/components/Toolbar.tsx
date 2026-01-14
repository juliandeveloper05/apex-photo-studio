/**
 * APEX Photo Studio - Premium Toolbar Component
 * 
 * Top toolbar with:
 * - Gradient logo branding
 * - Mode toggle with animation
 * - Zoom controls
 * - Comparison mode
 * - Grid and zebra overlays
 * - Undo/Redo
 * - Export functionality
 */

import { 
  Camera, 
  Image, 
  ZoomIn, 
  ZoomOut, 
  Maximize, 
  Grid3X3,
  LayoutGrid,
  Eye,
  Undo,
  Redo,
  SplitSquareVertical,
  Upload,
  Aperture,
  Download
} from 'lucide-react';
import { useRef, useState } from 'react';
import { useImageStore } from '@/hooks/useImageStore';
import type { GridType } from '@/types';
import { ExportModal } from './ExportModal';

export function Toolbar() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const { 
    ui, setUIState, 
    image, setOriginalImage,
    canUndo, canRedo, undo, redo 
  } = useImageStore();
  
  const handleZoom = (delta: number) => {
    const newZoom = Math.max(0.25, Math.min(4, ui.zoom + delta));
    setUIState({ zoom: newZoom });
  };
  
  const handleFitToScreen = () => {
    setUIState({ zoom: 1, panOffset: { x: 0, y: 0 } });
  };
  
  const toggleGrid = () => {
    const grids: GridType[] = ['none', 'thirds', 'golden', 'diagonal', 'center'];
    const currentIndex = grids.indexOf(ui.gridType);
    const nextIndex = (currentIndex + 1) % grids.length;
    setUIState({ gridType: grids[nextIndex] });
  };
  
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = () => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        setOriginalImage(imageData, file.name);
        setUIState({ mode: 'editor' });
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
    
    // Reset input
    e.target.value = '';
  };
  
  const gridLabels: Record<GridType, string> = {
    none: 'Grid: Off',
    thirds: 'Rule of Thirds',
    golden: 'Golden Ratio',
    diagonal: 'Diagonals',
    center: 'Center',
  };
  
  return (
    <>
      <header className="h-14 flex items-center justify-between px-4 glass-panel border-b border-[var(--apex-border)]">
        {/* Left section - Logo & Mode toggle */}
        <div className="flex items-center gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2 mr-2">
            <div className="relative">
              <Aperture className="w-6 h-6 text-[var(--apex-accent)] glow-accent" />
            </div>
            <span className="text-lg font-semibold tracking-tight gradient-text hidden sm:block">
              APEX
            </span>
          </div>
          
          {/* Divider */}
          <div className="w-px h-6 bg-[var(--apex-border)]" />
          
          {/* Mode Toggle */}
          <div className="flex p-1 rounded-lg bg-[var(--apex-bg-dark)] border border-[var(--apex-border)]">
            <button
              onClick={() => setUIState({ mode: 'camera' })}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                ui.mode === 'camera' 
                  ? 'bg-gradient-to-r from-[var(--apex-accent)] to-[#0284c7] text-white shadow-lg shadow-[var(--apex-accent-glow)]' 
                  : 'text-[var(--apex-text-muted)] hover:text-[var(--apex-text-primary)] hover:bg-[var(--apex-bg-hover)]'
              }`}
            >
              <Camera className="w-4 h-4" />
              <span className="hidden sm:inline">Camera</span>
            </button>
            <button
              onClick={() => setUIState({ mode: 'editor' })}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                ui.mode === 'editor' 
                  ? 'bg-gradient-to-r from-[var(--apex-accent)] to-[#0284c7] text-white shadow-lg shadow-[var(--apex-accent-glow)]' 
                  : 'text-[var(--apex-text-muted)] hover:text-[var(--apex-text-primary)] hover:bg-[var(--apex-bg-hover)]'
              }`}
            >
              <Image className="w-4 h-4" />
              <span className="hidden sm:inline">Editor</span>
            </button>
          </div>
          
          {/* Import Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="btn-apex group"
            title="Import Image"
          >
            <Upload className="w-4 h-4 group-hover:text-[var(--apex-accent)] transition-colors" />
            <span className="hidden md:inline">Import</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
        
        {/* Center section - View controls */}
        {ui.mode === 'editor' && image.original && (
          <div className="flex items-center gap-1 animate-fade-in-up">
            {/* Undo/Redo */}
            <div className="flex items-center gap-0.5 mr-2">
              <button
                onClick={() => undo()}
                disabled={!canUndo()}
                className="btn-icon disabled:opacity-30 disabled:cursor-not-allowed"
                title="Undo (Ctrl+Z)"
              >
                <Undo className="w-4 h-4" />
              </button>
              <button
                onClick={() => redo()}
                disabled={!canRedo()}
                className="btn-icon disabled:opacity-30 disabled:cursor-not-allowed"
                title="Redo (Ctrl+Y)"
              >
                <Redo className="w-4 h-4" />
              </button>
            </div>
            
            <div className="w-px h-5 bg-[var(--apex-border)] mx-1" />
            
            {/* Zoom */}
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => handleZoom(-0.25)}
                className="btn-icon"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-xs text-[var(--apex-text-muted)] w-12 text-center font-mono tabular-nums">
                {Math.round(ui.zoom * 100)}%
              </span>
              <button
                onClick={() => handleZoom(0.25)}
                className="btn-icon"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={handleFitToScreen}
                className="btn-icon"
                title="Fit to Screen"
              >
                <Maximize className="w-4 h-4" />
              </button>
            </div>
            
            <div className="w-px h-5 bg-[var(--apex-border)] mx-1" />
            
            {/* Comparison */}
            <button
              onClick={() => setUIState({ 
                comparisonMode: ui.comparisonMode === 'off' ? 'split-vertical' : 'off' 
              })}
              className={`btn-icon ${
                ui.comparisonMode !== 'off' 
                  ? 'btn-icon-active' 
                  : ''
              }`}
              title="Before/After Comparison (\\)"
            >
              <SplitSquareVertical className="w-4 h-4" />
            </button>
          </div>
        )}
        
        {/* Right section - Overlays & Export */}
        <div className="flex items-center gap-1">
          {ui.mode === 'editor' && image.original && (
            <>
              {/* Grid */}
              <button
                onClick={toggleGrid}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 text-sm rounded-md transition-all duration-200 ${
                  ui.gridType !== 'none' 
                    ? 'bg-[var(--apex-accent-subtle)] text-[var(--apex-accent)] border border-[var(--apex-border-accent)]' 
                    : 'text-[var(--apex-text-muted)] hover:text-[var(--apex-text-primary)] hover:bg-[var(--apex-bg-hover)]'
                }`}
                title={gridLabels[ui.gridType]}
              >
                <Grid3X3 className="w-4 h-4" />
                <span className="hidden lg:inline text-xs font-medium">
                  {ui.gridType !== 'none' ? gridLabels[ui.gridType] : 'Grid'}
                </span>
              </button>
              
              {/* Zebras */}
              <button
                onClick={() => setUIState({ showZebras: !ui.showZebras })}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 text-sm rounded-md transition-all duration-200 ${
                  ui.showZebras 
                    ? 'bg-[rgba(245,158,11,0.15)] text-[var(--apex-amber)] border border-[rgba(245,158,11,0.4)]' 
                    : 'text-[var(--apex-text-muted)] hover:text-[var(--apex-text-primary)] hover:bg-[var(--apex-bg-hover)]'
                }`}
                title="Show Clipping (Zebras) [Z]"
              >
                <Eye className="w-4 h-4" />
                <span className="hidden lg:inline text-xs font-medium">Zebras</span>
              </button>
              
              {/* Histogram toggle */}
              <button
                onClick={() => setUIState({ showHistogram: !ui.showHistogram })}
                className={`btn-icon ${
                  ui.showHistogram 
                    ? 'btn-icon-active' 
                    : ''
                }`}
                title="Toggle Histogram [H]"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              
              <div className="w-px h-5 bg-[var(--apex-border)] mx-1" />
              
              {/* Export Button */}
              <button
                onClick={() => setIsExportOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium
                           bg-gradient-to-r from-cyan-500 to-blue-600 text-white 
                           hover:opacity-90 transition-all shadow-lg shadow-cyan-500/25"
                title="Export Image (Ctrl+Shift+E)"
              >
                <Download className="w-4 h-4" />
                <span className="hidden md:inline">Export</span>
              </button>
            </>
          )}
        </div>
      </header>
      
      {/* Export Modal */}
      <ExportModal isOpen={isExportOpen} onClose={() => setIsExportOpen(false)} />
    </>
  );
}
