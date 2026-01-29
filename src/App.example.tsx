/**
 * APEX Photo Studio v1.1.0 - Ejemplo de Integración Completa
 * Esta es una implementación de ejemplo que muestra cómo integrar todos los componentes.
 */

import React, { useState, useCallback, useEffect, Suspense, lazy } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Componentes UI
import { Camera } from './components/Camera';
import { Editor } from './components/Editor';
import { Toolbar } from './components/Toolbar';
import { AdjustmentsPanel } from './components/AdjustmentsPanel';
import { ToneCurveEditor } from './components/ToneCurveEditor';
import { ExportModal } from './components/ExportModal';

// Escenas 3D (lazy loaded)
const HeroStage = lazy(() => import('./components/three/HeroStage'));
const Histogram3D = lazy(() => import('./components/three/Histogram3D'));

// Hooks
import { useAppStore } from './store/useAppStore';
import { useReducedMotion } from './hooks/useReducedMotion';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

// Tipos
import { ViewMode, AdjustmentValues, CurvePoint, ExportOptions, Toast } from './types';

// Utilidades
import { calculateRGBHistogram, processImage } from './utils/imageProcessing';

// Estilos
import './styles/design-tokens.css';

// ============================================================================
// FALLBACK COMPONENTS
// ============================================================================

const StageFallback: React.FC = () => (
  <div className="w-full h-full bg-gradient-to-br from-indigo-900/20 to-purple-900/10 animate-pulse" />
);

// ============================================================================
// MAIN APP COMPONENT
// ============================================================================

const App: React.FC = () => {
  // ============================================================================
  // STORE STATE
  // ============================================================================
  const {
    currentView,
    setCurrentView,
    imageSrc,
    originalSrc,
    setImageSrc,
    setOriginalSrc,
    adjustments,
    updateAdjustment,
    updateHSL,
    resetAdjustments,
    canUndo,
    canRedo,
    undo,
    redo,
    addToHistory,
    isExportModalOpen,
    setExportModalOpen,
    toasts,
    addToast,
    removeToast,
    zoom,
    pan,
    splitPosition,
    showSplit,
    setZoom,
    setPan,
    setSplitPosition,
    setShowSplit,
    gridOverlay,
    showZebra,
    setGridOverlay,
    setShowZebra
  } = useAppStore();

  // ============================================================================
  // LOCAL STATE
  // ============================================================================
  const [curvePoints, setCurvePoints] = useState<CurvePoint[]>([
    { x: 0, y: 0, id: 'start' },
    { x: 255, y: 255, id: 'end' }
  ]);
  const [histogramData, setHistogramData] = useState<number[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedImage, setProcessedImage] = useState<string | null>(null);

  // Reduced motion preference
  const shouldReduceMotion = useReducedMotion();

  // ============================================================================
  // KEYBOARD SHORTCUTS
  // ============================================================================
  useKeyboardShortcuts({
    shortcuts: [
      {
        key: 'c',
        handler: () => setCurrentView('camera'),
        preventDefault: true
      },
      {
        key: 'e',
        handler: () => setCurrentView('editor'),
        preventDefault: true
      },
      {
        key: 'ctrl+z',
        handler: () => canUndo && undo(),
        preventDefault: true
      },
      {
        key: 'ctrl+shift+z',
        handler: () => canRedo && redo(),
        preventDefault: true
      },
      {
        key: 'ctrl+s',
        handler: () => setExportModalOpen(true),
        preventDefault: true
      },
      {
        key: 'r',
        handler: () => resetAdjustments(),
        preventDefault: true
      }
    ],
    enabled: true,
    ignoreInputs: true
  });

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleCapture = useCallback((blob: Blob, metadata: any) => {
    const url = URL.createObjectURL(blob);
    setImageSrc(url);
    setOriginalSrc(url);
    setCurrentView('editor');

    addToast({
      type: 'success',
      message: `Foto capturada: ${metadata.resolution}`,
      duration: 3000
    });
  }, [setImageSrc, setOriginalSrc, setCurrentView, addToast]);

  const handleAdjustmentChange = useCallback((key: string, value: number) => {
    updateAdjustment(key, value);
  }, [updateAdjustment]);

  const handleHSLChange = useCallback((channel: string, component: any, value: number) => {
    updateHSL(channel, component, value);
  }, [updateHSL]);

  const handleCurveChange = useCallback((points: CurvePoint[]) => {
    setCurvePoints(points);
  }, []);

  const handleExport = useCallback(async (options: ExportOptions): Promise<void> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // Simulated export
        console.log('Exporting with options:', options);
        resolve();
      }, 2000);
    });
  }, []);

  const handleOpenFile = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const url = URL.createObjectURL(file);
        setImageSrc(url);
        setOriginalSrc(url);
        addToast({
          type: 'success',
          message: `Imagen cargada: ${file.name}`,
          duration: 3000
        });
      }
    };
    input.click();
  }, [setImageSrc, setOriginalSrc, addToast]);

  // ============================================================================
  // IMAGE PROCESSING
  // ============================================================================

  useEffect(() => {
    if (!originalSrc) return;

    const process = async () => {
      setIsProcessing(true);

      try {
        const img = new Image();
        img.src = originalSrc;
        await new Promise((resolve) => { img.onload = resolve; });

        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        // Calculate histogram
        const histogram = calculateRGBHistogram(imageData);
        setHistogramData(histogram.luminance);

        // Process image with adjustments
        const processed = processImage(imageData, adjustments, curvePoints);
        ctx.putImageData(processed, 0, 0);

        setProcessedImage(canvas.toDataURL('image/jpeg', 0.95));
      } catch (error) {
        console.error('Error processing image:', error);
        addToast({
          type: 'error',
          message: 'Error al procesar la imagen',
          duration: 5000
        });
      } finally {
        setIsProcessing(false);
      }
    };

    // Debounce processing
    const timeout = setTimeout(process, 100);
    return () => clearTimeout(timeout);
  }, [originalSrc, adjustments, curvePoints, addToast]);

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-hidden">
      {/* Background 3D Stage */}
      {currentView === 'editor' && (
        <div className="fixed inset-0 z-0 opacity-30">
          <Suspense fallback={<StageFallback />}>
            <HeroStage
              rotationSpeed={0.3}
              showCamera={true}
              showFilmReel={true}
            />
          </Suspense>
        </div>
      )}

      {/* Toolbar */}
      <Toolbar
        activeView={currentView}
        onViewChange={setCurrentView}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
        onReset={() => resetAdjustments()}
        onExport={() => setExportModalOpen(true)}
        onOpenFile={handleOpenFile}
        presets={[
          { id: '1', name: 'Web', format: 'webp', quality: 85, maintainAspectRatio: true, colorSpace: 'sRGB', metadata: false },
          { id: '2', name: 'Print', format: 'tiff', quality: 100, maintainAspectRatio: true, colorSpace: 'AdobeRGB', metadata: true }
        ]}
        onApplyPreset={(preset) => console.log('Apply preset:', preset)}
      />

      {/* Main Content */}
      <main className="relative z-10 pt-16 h-screen">
        <AnimatePresence mode="wait">
          {currentView === 'camera' ? (
            <motion.div
              key="camera"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="h-full"
            >
              <Camera
                resolution="1080p"
                timerDuration={0}
                onCapture={handleCapture}
                onError={(error) => {
                  addToast({
                    type: 'error',
                    message: `Error de cámara: ${error.message}`,
                    duration: 5000
                  });
                }}
              />
            </motion.div>
          ) : (
            <motion.div
              key="editor"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="h-full flex"
            >
              {/* Editor Canvas */}
              <div className="flex-1 relative">
                {imageSrc ? (
                  <Editor
                    imageSrc={processedImage || imageSrc}
                    originalSrc={originalSrc || undefined}
                    adjustments={adjustments}
                    showSplit={showSplit}
                    splitPosition={splitPosition}
                    zoom={zoom}
                    pan={pan}
                    gridOverlay={gridOverlay}
                    showZebra={showZebra}
                    showHistogram={true}
                    onZoomChange={setZoom}
                    onPanChange={setPan}
                    onSplitPositionChange={setSplitPosition}
                    histogramData={histogramData}
                  />
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                        <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-semibold text-white/90 mb-2">No hay imagen</h3>
                      <p className="text-white/50 mb-4">Captura una foto o abre una imagen para comenzar</p>
                      <button
                        onClick={handleOpenFile}
                        className="px-6 py-2.5 bg-indigo-500 hover:bg-indigo-400 text-white rounded-xl transition-colors"
                      >
                        Abrir imagen
                      </button>
                    </div>
                  </div>
                )}

                {/* Processing indicator */}
                {isProcessing && (
                  <div className="absolute bottom-4 left-4 flex items-center gap-2 px-3 py-2 bg-black/60 backdrop-blur-md rounded-lg">
                    <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm text-white/70">Procesando...</span>
                  </div>
                )}
              </div>

              {/* Right Panel - Adjustments */}
              <div className="w-80 flex flex-col bg-[#12121a]/95 backdrop-blur-xl border-l border-white/5">
                {/* Tabs */}
                <div className="flex border-b border-white/5">
                  {['exposure', 'color', 'detail', 'hsl'].map((cat) => (
                    <button
                      key={cat}
                      className="flex-1 py-3 text-sm font-medium text-white/50 hover:text-white/70 capitalize"
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Adjustments Panel */}
                <div className="flex-1 overflow-y-auto">
                  <AdjustmentsPanel
                    category="exposure"
                    values={adjustments}
                    onChange={handleAdjustmentChange}
                    onHSLChange={handleHSLChange}
                    onReset={resetAdjustments}
                    histogramData={histogramData}
                    showHistogram={true}
                  />
                </div>

                {/* Tone Curve */}
                <div className="border-t border-white/5 p-4">
                  <ToneCurveEditor
                    curve={curvePoints}
                    onCurveChange={handleCurveChange}
                    histogramData={histogramData}
                    channel="rgb"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Export Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setExportModalOpen(false)}
        onExport={handleExport}
        originalDimensions={{ width: 1920, height: 1080 }}
        defaultFilename="apex-photo"
      />

      {/* Toast Notifications */}
      <div className="fixed bottom-4 right-4 z-[1000] space-y-2">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 100, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, scale: 0.95 }}
              className={`px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 ${
                toast.type === 'success' ? 'bg-green-500/20 border border-green-500/30' :
                toast.type === 'error' ? 'bg-red-500/20 border border-red-500/30' :
                toast.type === 'warning' ? 'bg-yellow-500/20 border border-yellow-500/30' :
                'bg-indigo-500/20 border border-indigo-500/30'
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${
                toast.type === 'success' ? 'bg-green-400' :
                toast.type === 'error' ? 'bg-red-400' :
                toast.type === 'warning' ? 'bg-yellow-400' :
                'bg-indigo-400'
              }`} />
              <span className="text-sm text-white/90">{toast.message}</span>
              <button
                onClick={() => removeToast(toast.id)}
                className="ml-2 text-white/50 hover:text-white"
              >
                ×
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default App;
