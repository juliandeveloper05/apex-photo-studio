/**
 * APEX Photo Studio v1.1.0 - ExportModal Component
 * Modal de exportación con opciones de formato, calidad y presets.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Download,
  Image as ImageIcon,
  FileImage,
  FileType,
  Settings2,
  Check,
  AlertCircle,
  ChevronRight,
  FolderOpen,
  Copy,
  Sparkles,
  Clock,
  HardDrive
} from 'lucide-react';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type ExportFormat = 'jpeg' | 'png' | 'webp' | 'tiff';

export interface ExportPreset {
  id: string;
  name: string;
  format: ExportFormat;
  quality: number;
  width?: number;
  height?: number;
  maintainAspectRatio: boolean;
  colorSpace: 'sRGB' | 'AdobeRGB' | 'ProPhoto';
  metadata: boolean;
}

export interface ExportOptions {
  format: ExportFormat;
  quality: number;
  width?: number;
  height?: number;
  maintainAspectRatio: boolean;
  colorSpace: 'sRGB' | 'AdobeRGB' | 'ProPhoto';
  includeMetadata: boolean;
  filename: string;
}

export interface ExportModalProps {
  /** Estado de apertura */
  isOpen: boolean;
  /** Callback al cerrar */
  onClose: () => void;
  /** Callback al exportar */
  onExport: (options: ExportOptions) => Promise<void>;
  /** Callback al cancelar exportación */
  onCancel?: () => void;
  /** Formatos disponibles */
  formats?: ExportFormat[];
  /** Presets de exportación */
  presets?: ExportPreset[];
  /** Dimensiones originales de la imagen */
  originalDimensions: { width: number; height: number };
  /** Dimensiones máximas permitidas */
  maxDimensions?: { width: number; height: number };
  /** Calidad por defecto */
  defaultQuality?: number;
  /** Nombre de archivo por defecto */
  defaultFilename?: string;
  /** Clase CSS adicional */
  className?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const FORMATS: { id: ExportFormat; label: string; icon: React.ReactNode; description: string; supportsQuality: boolean }[] = [
  {
    id: 'jpeg',
    label: 'JPEG',
    icon: <FileImage className="w-5 h-5" />,
    description: 'Mejor para fotos, tamaño reducido',
    supportsQuality: true
  },
  {
    id: 'png',
    label: 'PNG',
    icon: <FileType className="w-5 h-5" />,
    description: 'Sin pérdida, transparencia',
    supportsQuality: false
  },
  {
    id: 'webp',
    label: 'WebP',
    icon: <ImageIcon className="w-5 h-5" />,
    description: 'Formato moderno, óptimo para web',
    supportsQuality: true
  },
  {
    id: 'tiff',
    label: 'TIFF',
    icon: <HardDrive className="w-5 h-5" />,
    description: 'Sin compresión, máxima calidad',
    supportsQuality: false
  }
];

const DEFAULT_PRESETS: ExportPreset[] = [
  {
    id: 'web',
    name: 'Web Optimizado',
    format: 'webp',
    quality: 85,
    width: 1920,
    height: undefined,
    maintainAspectRatio: true,
    colorSpace: 'sRGB',
    metadata: false
  },
  {
    id: 'social',
    name: 'Redes Sociales',
    format: 'jpeg',
    quality: 90,
    width: 1080,
    height: 1080,
    maintainAspectRatio: true,
    colorSpace: 'sRGB',
    metadata: true
  },
  {
    id: 'print',
    name: 'Impresión',
    format: 'tiff',
    quality: 100,
    width: undefined,
    height: undefined,
    maintainAspectRatio: true,
    colorSpace: 'AdobeRGB',
    metadata: true
  },
  {
    id: 'archive',
    name: 'Archivo Máxima Calidad',
    format: 'png',
    quality: 100,
    width: undefined,
    height: undefined,
    maintainAspectRatio: true,
    colorSpace: 'ProPhoto',
    metadata: true
  }
];

const COLOR_SPACES = ['sRGB', 'AdobeRGB', 'ProPhoto'] as const;

// ============================================================================
// ANIMATION VARIANTS
// ============================================================================

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 }
};

const modalVariants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
    y: 20
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.28,
      ease: 'easeOut' as const,
      staggerChildren: 0.03
    }
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 20,
    transition: { duration: 0.2 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 }
};

const progressVariants = {
  initial: { width: '0%' },
  animate: (progress: number) => ({
    width: `${progress}%`,
    transition: { duration: 0.3, ease: 'easeOut' as const }
  })
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface QualitySliderProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

const QualitySlider: React.FC<QualitySliderProps> = ({ value, onChange, disabled = false }) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleInteraction = useCallback((clientX: number) => {
    if (!trackRef.current || disabled) return;
    const rect = trackRef.current.getBoundingClientRect();
    const percentage = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    onChange(Math.round(percentage));
  }, [onChange, disabled]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    handleInteraction(e.clientX);
  }, [handleInteraction]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging) handleInteraction(e.clientX);
  }, [isDragging, handleInteraction]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove as any);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'ew-resize';
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove as any);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const getQualityLabel = (q: number) => {
    if (q >= 95) return 'Máxima';
    if (q >= 85) return 'Alta';
    if (q >= 70) return 'Media';
    if (q >= 50) return 'Baja';
    return 'Mínima';
  };

  const getQualityColor = (q: number) => {
    if (q >= 85) return 'text-green-400';
    if (q >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-white/70">Calidad</span>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium ${getQualityColor(value)}`}>
            {getQualityLabel(value)}
          </span>
          <span className="text-sm font-mono text-white/50">{value}%</span>
        </div>
      </div>
      <div
        ref={trackRef}
        className={`relative h-2 bg-white/10 rounded-full cursor-ew-resize ${disabled ? 'opacity-50' : ''}`}
        onMouseDown={handleMouseDown}
      >
        <motion.div
          className="absolute top-0 left-0 h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
          style={{ width: `${value}%` }}
          layoutId="qualityFill"
        />
        <motion.div
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg"
          style={{ left: `calc(${value}% - 8px)` }}
          animate={{ scale: isDragging ? 1.2 : 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        />
      </div>
    </div>
  );
};

interface DimensionInputProps {
  width?: number;
  height?: number;
  originalWidth: number;
  originalHeight: number;
  maintainAspectRatio: boolean;
  onWidthChange: (width?: number) => void;
  onHeightChange: (height?: number) => void;
  onAspectRatioChange: (maintain: boolean) => void;
}

const DimensionInput: React.FC<DimensionInputProps> = ({
  width,
  height,
  originalWidth,
  originalHeight,
  maintainAspectRatio,
  onWidthChange,
  onHeightChange,
  onAspectRatioChange
}) => {
  const aspectRatio = originalWidth / originalHeight;

  const handleWidthChange = useCallback((newWidth: string) => {
    const numWidth = newWidth ? parseInt(newWidth, 10) : undefined;
    onWidthChange(numWidth);
    if (maintainAspectRatio && numWidth) {
      onHeightChange(Math.round(numWidth / aspectRatio));
    }
  }, [aspectRatio, maintainAspectRatio, onWidthChange, onHeightChange]);

  const handleHeightChange = useCallback((newHeight: string) => {
    const numHeight = newHeight ? parseInt(newHeight, 10) : undefined;
    onHeightChange(numHeight);
    if (maintainAspectRatio && numHeight) {
      onWidthChange(Math.round(numHeight * aspectRatio));
    }
  }, [aspectRatio, maintainAspectRatio, onHeightChange, onWidthChange]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-white/70">Dimensiones</span>
        <button
          className={`flex items-center gap-1.5 text-xs ${
            maintainAspectRatio ? 'text-indigo-400' : 'text-white/50'
          }`}
          onClick={() => onAspectRatioChange(!maintainAspectRatio)}
        >
          <div className={`w-4 h-4 rounded border ${
            maintainAspectRatio ? 'bg-indigo-500 border-indigo-500' : 'border-white/30'
          } flex items-center justify-center`}>
            {maintainAspectRatio && <Check className="w-3 h-3 text-white" />}
          </div>
          Mantener proporción
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1">
          <label className="text-xs text-white/50 mb-1 block">Ancho</label>
          <div className="relative">
            <input
              type="number"
              value={width || ''}
              onChange={(e) => handleWidthChange(e.target.value)}
              placeholder={originalWidth.toString()}
              className="w-full px-3 py-2 bg-black/30 border border-white/10 rounded-lg text-sm text-white placeholder-white/30 focus:outline-none focus:border-indigo-500/50"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/40">px</span>
          </div>
        </div>

        <span className="text-white/30 mt-5">×</span>

        <div className="flex-1">
          <label className="text-xs text-white/50 mb-1 block">Alto</label>
          <div className="relative">
            <input
              type="number"
              value={height || ''}
              onChange={(e) => handleHeightChange(e.target.value)}
              placeholder={originalHeight.toString()}
              className="w-full px-3 py-2 bg-black/30 border border-white/10 rounded-lg text-sm text-white placeholder-white/30 focus:outline-none focus:border-indigo-500/50"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/40">px</span>
          </div>
        </div>
      </div>

      <p className="text-xs text-white/40">
        Original: {originalWidth} × {originalHeight}px
      </p>
    </div>
  );
};

interface PresetCardProps {
  preset: ExportPreset;
  isSelected: boolean;
  onClick: () => void;
}

const PresetCard: React.FC<PresetCardProps> = ({ preset, isSelected, onClick }) => {
  const formatInfo = FORMATS.find(f => f.id === preset.format);

  return (
    <motion.button
      className={`w-full p-3 rounded-xl border text-left transition-all ${
        isSelected
          ? 'bg-indigo-500/20 border-indigo-500/50'
          : 'bg-white/5 border-white/5 hover:bg-white/10'
      }`}
      onClick={onClick}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className={`text-sm font-medium ${isSelected ? 'text-indigo-300' : 'text-white/80'}`}>
            {preset.name}
          </p>
          <p className="text-xs text-white/50 mt-1">
            {formatInfo?.label} • {preset.quality}%
            {preset.width && ` • ${preset.width}px`}
          </p>
        </div>
        <div className={`text-${isSelected ? 'indigo-400' : 'white/30'}`}>
          {formatInfo?.icon}
        </div>
      </div>
    </motion.button>
  );
};

interface ExportProgressProps {
  progress: number;
  status: string;
  onCancel: () => void;
}

const ExportProgress: React.FC<ExportProgressProps> = ({ progress, status, onCancel }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <motion.div
            className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center"
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          >
            <Clock className="w-4 h-4 text-indigo-400" />
          </motion.div>
          <div>
            <p className="text-sm font-medium text-white/90">Exportando...</p>
            <p className="text-xs text-white/50">{status}</p>
          </div>
        </div>
        <span className="text-lg font-mono text-indigo-400">{Math.round(progress)}%</span>
      </div>

      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
          variants={progressVariants}
          initial="initial"
          animate="animate"
          custom={progress}
        />
      </div>

      <button
        className="w-full py-2 text-sm text-white/50 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
        onClick={onCancel}
      >
        Cancelar
      </button>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  onExport,
  onCancel,
  formats = ['jpeg', 'png', 'webp'],
  presets = DEFAULT_PRESETS,
  originalDimensions,
  maxDimensions,
  defaultQuality = 90,
  defaultFilename = 'apex-export',
  className = ''
}) => {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('jpeg');
  const [quality, setQuality] = useState(defaultQuality);
  const [width, setWidth] = useState<number | undefined>();
  const [height, setHeight] = useState<number | undefined>();
  const [maintainAspectRatio, setMaintainAspectRatio] = useState(true);
  const [colorSpace, setColorSpace] = useState<'sRGB' | 'AdobeRGB' | 'ProPhoto'>('sRGB');
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [filename, setFilename] = useState(defaultFilename);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStatus, setExportStatus] = useState('');
  const [error, setError] = useState<string | null>(null);

  const availableFormats = FORMATS.filter(f => formats.includes(f.id));

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedFormat('jpeg');
      setQuality(defaultQuality);
      setWidth(undefined);
      setHeight(undefined);
      setMaintainAspectRatio(true);
      setColorSpace('sRGB');
      setIncludeMetadata(true);
      setFilename(defaultFilename);
      setSelectedPreset(null);
      setIsExporting(false);
      setExportProgress(0);
      setExportStatus('');
      setError(null);
    }
  }, [isOpen, defaultQuality, defaultFilename]);

  // Focus trap
  const modalRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (isOpen && modalRef.current) {
      const focusableElements = modalRef.current.querySelectorAll(
        'button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        } else if (e.key === 'Tab') {
          if (e.shiftKey && document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          } else if (!e.shiftKey && document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      firstElement?.focus();

      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  // Apply preset
  const applyPreset = useCallback((preset: ExportPreset) => {
    setSelectedPreset(preset.id);
    setSelectedFormat(preset.format);
    setQuality(preset.quality);
    setWidth(preset.width);
    setHeight(preset.height);
    setMaintainAspectRatio(preset.maintainAspectRatio);
    setColorSpace(preset.colorSpace);
    setIncludeMetadata(preset.metadata);
  }, []);

  // Handle export
  const handleExport = useCallback(async () => {
    setIsExporting(true);
    setExportProgress(0);
    setExportStatus('Preparando...');
    setError(null);

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setExportProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          setExportStatus(prev < 30 ? 'Procesando imagen...' : prev < 60 ? 'Aplicando ajustes...' : 'Codificando...');
          return prev + 10;
        });
      }, 200);

      await onExport({
        format: selectedFormat,
        quality,
        width,
        height,
        maintainAspectRatio,
        colorSpace,
        includeMetadata,
        filename
      });

      clearInterval(progressInterval);
      setExportProgress(100);
      setExportStatus('¡Exportación completada!');

      setTimeout(() => {
        onClose();
      }, 500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      setIsExporting(false);
    }
  }, [selectedFormat, quality, width, height, maintainAspectRatio, colorSpace, includeMetadata, filename, onExport, onClose]);

  // Calculate estimated file size
  const estimatedSize = useCallback(() => {
    const pixelCount = (width || originalDimensions.width) * (height || originalDimensions.height);
    const bytesPerPixel = selectedFormat === 'png' ? 4 : selectedFormat === 'tiff' ? 6 : 3 * (quality / 100);
    const bytes = pixelCount * bytesPerPixel;

    if (bytes < 1024) return `${bytes.toFixed(0)} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }, [width, height, originalDimensions, selectedFormat, quality]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={!isExporting ? onClose : undefined}
          />

          {/* Modal */}
          <motion.div
            ref={modalRef}
            className={`relative w-full max-w-2xl max-h-[90vh] bg-[#12121a] rounded-2xl border border-white/10 shadow-2xl overflow-hidden ${className}`}
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            role="dialog"
            aria-modal="true"
            aria-labelledby="export-title"
          >
            {/* Header */}
            <motion.div
              className="flex items-center justify-between p-5 border-b border-white/5"
              variants={itemVariants}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                  <Download className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 id="export-title" className="text-lg font-semibold text-white/90">Exportar imagen</h2>
                  <p className="text-sm text-white/50">Configura las opciones de exportación</p>
                </div>
              </div>
              {!isExporting && (
                <motion.button
                  className="p-2 text-white/50 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                  onClick={onClose}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <X className="w-5 h-5" />
                </motion.button>
              )}
            </motion.div>

            {/* Content */}
            <div className="p-5 overflow-y-auto max-h-[60vh]">
              {isExporting ? (
                <ExportProgress
                  progress={exportProgress}
                  status={exportStatus}
                  onCancel={() => {
                    onCancel?.();
                    setIsExporting(false);
                  }}
                />
              ) : (
                <div className="space-y-6">
                  {/* Error */}
                  {error && (
                    <motion.div
                      className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg flex items-center gap-3"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <AlertCircle className="w-5 h-5 text-red-400" />
                      <p className="text-sm text-red-300">{error}</p>
                    </motion.div>
                  )}

                  {/* Presets */}
                  <motion.div variants={itemVariants}>
                    <h3 className="text-sm font-medium text-white/70 mb-3 flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      Presets rápidos
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                      {presets.map((preset) => (
                        <PresetCard
                          key={preset.id}
                          preset={preset}
                          isSelected={selectedPreset === preset.id}
                          onClick={() => applyPreset(preset)}
                        />
                      ))}
                    </div>
                  </motion.div>

                  {/* Format Selection */}
                  <motion.div variants={itemVariants}>
                    <h3 className="text-sm font-medium text-white/70 mb-3">Formato</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {availableFormats.map((format) => (
                        <motion.button
                          key={format.id}
                          className={`p-3 rounded-xl border text-left transition-all ${
                            selectedFormat === format.id
                              ? 'bg-indigo-500/20 border-indigo-500/50'
                              : 'bg-white/5 border-white/5 hover:bg-white/10'
                          }`}
                          onClick={() => setSelectedFormat(format.id)}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <div className={`${selectedFormat === format.id ? 'text-indigo-400' : 'text-white/50'}`}>
                            {format.icon}
                          </div>
                          <p className={`text-sm font-medium mt-2 ${selectedFormat === format.id ? 'text-indigo-300' : 'text-white/80'}`}>
                            {format.label}
                          </p>
                          <p className="text-xs text-white/40 mt-1">{format.description}</p>
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>

                  {/* Quality */}
                  {FORMATS.find(f => f.id === selectedFormat)?.supportsQuality && (
                    <motion.div variants={itemVariants}>
                      <QualitySlider value={quality} onChange={setQuality} />
                    </motion.div>
                  )}

                  {/* Dimensions */}
                  <motion.div variants={itemVariants}>
                    <DimensionInput
                      width={width}
                      height={height}
                      originalWidth={originalDimensions.width}
                      originalHeight={originalDimensions.height}
                      maintainAspectRatio={maintainAspectRatio}
                      onWidthChange={setWidth}
                      onHeightChange={setHeight}
                      onAspectRatioChange={setMaintainAspectRatio}
                    />
                  </motion.div>

                  {/* Advanced Options */}
                  <motion.div variants={itemVariants} className="space-y-3">
                    <h3 className="text-sm font-medium text-white/70 flex items-center gap-2">
                      <Settings2 className="w-4 h-4" />
                      Opciones avanzadas
                    </h3>

                    {/* Color Space */}
                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                      <span className="text-sm text-white/70">Espacio de color</span>
                      <select
                        value={colorSpace}
                        onChange={(e) => setColorSpace(e.target.value as any)}
                        className="px-3 py-1.5 bg-black/30 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500/50"
                      >
                        {COLOR_SPACES.map((cs) => (
                          <option key={cs} value={cs}>{cs}</option>
                        ))}
                      </select>
                    </div>

                    {/* Metadata */}
                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                      <span className="text-sm text-white/70">Incluir metadatos</span>
                      <button
                        className={`w-12 h-6 rounded-full transition-colors relative ${
                          includeMetadata ? 'bg-indigo-500' : 'bg-white/20'
                        }`}
                        onClick={() => setIncludeMetadata(!includeMetadata)}
                      >
                        <motion.div
                          className="absolute top-1 w-4 h-4 bg-white rounded-full"
                          animate={{ left: includeMetadata ? 'calc(100% - 20px)' : '4px' }}
                          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                        />
                      </button>
                    </div>

                    {/* Filename */}
                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                      <span className="text-sm text-white/70">Nombre de archivo</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={filename}
                          onChange={(e) => setFilename(e.target.value)}
                          className="px-3 py-1.5 bg-black/30 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500/50 w-40"
                        />
                        <span className="text-sm text-white/40">.{selectedFormat}</span>
                      </div>
                    </div>
                  </motion.div>

                  {/* File Size Estimate */}
                  <motion.div
                    className="flex items-center justify-between p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-lg"
                    variants={itemVariants}
                  >
                    <span className="text-sm text-white/70">Tamaño estimado</span>
                    <span className="text-sm font-mono text-indigo-400">{estimatedSize()}</span>
                  </motion.div>
                </div>
              )}
            </div>

            {/* Footer */}
            {!isExporting && (
              <motion.div
                className="flex items-center justify-end gap-3 p-5 border-t border-white/5"
                variants={itemVariants}
              >
                <button
                  className="px-5 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
                  onClick={onClose}
                >
                  Cancelar
                </button>
                <motion.button
                  className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-indigo-500 hover:bg-indigo-400 rounded-xl transition-colors shadow-lg shadow-indigo-500/25"
                  onClick={handleExport}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Download className="w-4 h-4" />
                  Exportar
                </motion.button>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ExportModal;

