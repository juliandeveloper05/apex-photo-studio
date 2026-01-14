/**
 * APEX Photo Studio - Main Application (3D Futuristic Edition)
 * 
 * Professional photo capture and editing application
 * with immersive 3D background and premium glassmorphism interface
 * 
 * Inspired by:
 * - Adobe After Effects (futuristic interface)
 * - Figma (glassmorphism modern)
 * - Spline (3D interactivo)
 * - Apple Vision Pro (spatial computing)
 */

import { useEffect } from 'react';
import { Camera } from '@/components/Camera';
import { Editor } from '@/components/Editor';
import { Toolbar } from '@/components/Toolbar';
import { AdjustmentsPanel } from '@/components/AdjustmentsPanel';
import { Histogram } from '@/components/Histogram';
import { AnimatedBackground3D } from '@/components/AnimatedBackground3D';
import { StatsPanel } from '@/components/StatsPanel';
import { FloatingButton } from '@/components/FloatingButton';
import { useImageStore } from '@/hooks/useImageStore';
import { Grid3X3, Eye, SplitSquareVertical, Settings, Keyboard } from 'lucide-react';

function App() {
  const { ui, setUIState, undo, redo, canUndo, canRedo, image } = useImageStore();
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Undo/Redo
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' && !e.shiftKey && canUndo()) {
          e.preventDefault();
          undo();
        } else if ((e.key === 'y' || (e.key === 'z' && e.shiftKey)) && canRedo()) {
          e.preventDefault();
          redo();
        }
      }
      
      // Mode switching
      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        if (e.key === 'c' || e.key === 'C') {
          setUIState({ mode: 'camera' });
        } else if (e.key === 'e' || e.key === 'E') {
          setUIState({ mode: 'editor' });
        } else if (e.key === 'g' || e.key === 'G') {
          // Cycle through grids
          const grids = ['none', 'thirds', 'golden', 'diagonal', 'center'] as const;
          const idx = grids.indexOf(ui.gridType);
          setUIState({ gridType: grids[(idx + 1) % grids.length] });
        } else if (e.key === 'z' || e.key === 'Z') {
          setUIState({ showZebras: !ui.showZebras });
        } else if (e.key === 'h' || e.key === 'H') {
          setUIState({ showHistogram: !ui.showHistogram });
        } else if (e.key === '\\') {
          // Toggle comparison
          setUIState({ 
            comparisonMode: ui.comparisonMode === 'off' ? 'split-vertical' : 'off' 
          });
        }
      }
      
      // Zoom
      if (e.key === '+' || e.key === '=') {
        setUIState({ zoom: Math.min(4, ui.zoom + 0.25) });
      } else if (e.key === '-') {
        setUIState({ zoom: Math.max(0.25, ui.zoom - 0.25) });
      } else if (e.key === '0') {
        setUIState({ zoom: 1, panOffset: { x: 0, y: 0 } });
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [ui, setUIState, undo, redo, canUndo, canRedo]);

  // Check if image is loaded
  const imageLoaded = !!(image.processed || image.original);

  // Toggle handlers for floating buttons
  const toggleGrid = () => {
    const grids = ['none', 'thirds', 'golden', 'diagonal', 'center'] as const;
    const idx = grids.indexOf(ui.gridType);
    setUIState({ gridType: grids[(idx + 1) % grids.length] });
  };

  const toggleZebras = () => {
    setUIState({ showZebras: !ui.showZebras });
  };

  const toggleCompare = () => {
    setUIState({ 
      comparisonMode: ui.comparisonMode === 'off' ? 'split-vertical' : 'off' 
    });
  };
  
  return (
    <div className="relative h-screen w-full overflow-hidden bg-black text-white">
      {/* 3D Animated Background */}
      <AnimatedBackground3D />
      
      {/* Main UI Layer */}
      <div className="relative z-10 h-full flex flex-col">
        {/* Top Toolbar */}
        <Toolbar />
        
        {/* Stats Panel */}
        <StatsPanel 
          mode={ui.mode} 
          zoom={ui.zoom} 
          imageLoaded={imageLoaded} 
        />
        
        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Main View */}
          <div className="flex-1 flex flex-col">
            {ui.mode === 'camera' ? <Camera /> : <Editor />}
          </div>
          
          {/* Right Panel - Only in Editor mode */}
          {ui.mode === 'editor' && (
            <div className="w-72 lg:w-80 glass-panel border-l border-[var(--apex-border)] flex flex-col overflow-hidden animate-slide-in-right">
              {/* Histogram */}
              {ui.showHistogram && (
                <div className="p-3 border-b border-[var(--apex-border)]">
                  <Histogram />
                </div>
              )}
              
              {/* Adjustments */}
              <div className="flex-1 overflow-hidden">
                <AdjustmentsPanel />
              </div>
            </div>
          )}
        </div>
        
        {/* Status Bar */}
        <footer 
          className="h-8 flex items-center justify-between px-6 border-t"
          style={{
            background: 'rgba(5, 5, 5, 0.85)',
            backdropFilter: 'blur(20px)',
            borderColor: 'rgba(14, 165, 233, 0.2)',
          }}
        >
          <div className="flex items-center gap-4">
            <span className="text-xs font-bold bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent">
              APEX Photo Studio
            </span>
            
            {/* Keyboard shortcuts hint */}
            <div className="hidden sm:flex items-center gap-1 text-[10px] text-gray-500">
              <Keyboard className="w-3 h-3 mr-1" />
              <span className="font-mono">C</span><span className="mx-0.5 text-gray-600">Camera</span>
              <span className="mx-1 text-gray-700">·</span>
              <span className="font-mono">E</span><span className="mx-0.5 text-gray-600">Editor</span>
              <span className="mx-1 text-gray-700">·</span>
              <span className="font-mono">G</span><span className="mx-0.5 text-gray-600">Grid</span>
              <span className="mx-1 text-gray-700">·</span>
              <span className="font-mono">Z</span><span className="mx-0.5 text-gray-600">Zebras</span>
            </div>
          </div>
          
          <div className="text-[10px] text-gray-500 font-mono">
            developed by julian javier soto with ❤️
          </div>
        </footer>
      </div>

      {/* Floating Action Buttons - Only when image is loaded */}
      {imageLoaded && ui.mode === 'editor' && (
        <>
          <FloatingButton
            icon={Grid3X3}
            label="Toggle Grid"
            onClick={toggleGrid}
            position={{ bottom: '60px', right: '24px' }}
            color="#0ea5e9"
          />
          <FloatingButton
            icon={Eye}
            label="Zebras"
            onClick={toggleZebras}
            position={{ bottom: '130px', right: '24px' }}
            color="#f59e0b"
          />
          <FloatingButton
            icon={SplitSquareVertical}
            label="Compare"
            onClick={toggleCompare}
            position={{ bottom: '200px', right: '24px' }}
            color="#7c3aed"
          />
          <FloatingButton
            icon={Settings}
            label="Settings"
            position={{ bottom: '270px', right: '24px' }}
            color="#10b981"
          />
        </>
      )}
    </div>
  );
}

export default App;
