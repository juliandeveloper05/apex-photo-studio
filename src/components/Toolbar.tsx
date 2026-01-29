/**
 * APEX Photo Studio v1.1.0 - Toolbar Component
 * Barra de herramientas principal con navegación Camera/Editor y acciones rápidas.
 */

import React, { useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera,
  Image,
  Undo2,
  Redo2,
  Download,
  RotateCcw,
  Sliders,
  Sparkles,
  ChevronRight,
  FolderOpen,
  Save
} from 'lucide-react';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface ToolbarAction {
  id: string;
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'default' | 'primary' | 'danger';
}

export interface ExportPreset {
  id: string;
  name: string;
  format: string;
  quality: number;
  dimensions?: { width: number; height: number };
}

export interface ToolbarProps {
  /** Vista activa actual */
  activeView?: 'camera' | 'editor';
  /** Callback al cambiar vista */
  onViewChange?: (view: 'camera' | 'editor') => void;
  /** Acciones adicionales */
  actions?: ToolbarAction[];
  /** Mostrar quick presets */
  showPresets?: boolean;
  /** Habilitar undo */
  canUndo?: boolean;
  /** Habilitar redo */
  canRedo?: boolean;
  /** Callback undo */
  onUndo?: () => void;
  /** Callback redo */
  onRedo?: () => void;
  /** Callback reset */
  onReset?: () => void;
  /** Callback export */
  onExport?: () => void;
  /** Callback open file */
  onOpenFile?: () => void;
  /** Callback save preset */
  onSavePreset?: () => void;
  /** Presets disponibles */
  presets?: ExportPreset[];
  /** Callback al aplicar preset */
  onApplyPreset?: (preset: ExportPreset) => void;
  /** Clase CSS adicional */
  className?: string;
}

// ============================================================================
// ANIMATION VARIANTS
// ============================================================================

const toolbarVariants = {
  hidden: { opacity: 0, y: -20 },
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
  hidden: { opacity: 0, y: -10 },
  visible: { opacity: 1, y: 0 }
};

const buttonVariants = {
  rest: { scale: 1 },
  hover: {
    scale: 1.03,
    transition: { duration: 0.03, ease: 'easeOut' as const }
  },
  tap: {
    scale: 0.98,
    transition: { duration: 0.06, ease: 'easeIn' as const }
  }
};

const viewButtonVariants = {
  inactive: {
    backgroundColor: 'rgba(26, 26, 37, 0.6)',
    color: 'rgba(255, 255, 255, 0.6)'
  },
  active: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    color: '#818cf8'
  }
};

const glowVariants = {
  rest: {
    boxShadow: '0 0 0 0 rgba(99, 102, 241, 0)'
  },
  hover: {
    boxShadow: '0 0 20px rgba(99, 102, 241, 0.35)'
  }
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface ViewToggleProps {
  activeView: 'camera' | 'editor';
  onChange: (view: 'camera' | 'editor') => void;
}

const ViewToggle: React.FC<ViewToggleProps> = ({ activeView, onChange }) => {
  return (
    <motion.div
      className="flex items-center p-1 bg-[#0a0a0f]/60 backdrop-blur-md rounded-xl border border-white/10"
      variants={itemVariants}
    >
      <motion.button
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        variants={viewButtonVariants}
        animate={activeView === 'camera' ? 'active' : 'inactive'}
        whileHover={activeView !== 'camera' ? { backgroundColor: 'rgba(255, 255, 255, 0.05)' } : {}}
        onClick={() => onChange('camera')}
        aria-pressed={activeView === 'camera'}
        aria-label="Vista Cámara (tecla C)"
      >
        <Camera className="w-4 h-4" />
        <span>Cámara</span>
        <kbd className="hidden sm:inline-flex ml-2 px-1.5 py-0.5 text-xs bg-white/10 rounded">C</kbd>
      </motion.button>

      <motion.button
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        variants={viewButtonVariants}
        animate={activeView === 'editor' ? 'active' : 'inactive'}
        whileHover={activeView !== 'editor' ? { backgroundColor: 'rgba(255, 255, 255, 0.05)' } : {}}
        onClick={() => onChange('editor')}
        aria-pressed={activeView === 'editor'}
        aria-label="Vista Editor (tecla E)"
      >
        <Image className="w-4 h-4" />
        <span>Editor</span>
        <kbd className="hidden sm:inline-flex ml-2 px-1.5 py-0.5 text-xs bg-white/10 rounded">E</kbd>
      </motion.button>
    </motion.div>
  );
};

interface ActionButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  shortcut?: string;
  variant?: 'default' | 'primary' | 'danger';
  isActive?: boolean;
}

const ActionButton: React.FC<ActionButtonProps> = ({
  icon,
  label,
  onClick,
  disabled = false,
  shortcut,
  variant = 'default',
  isActive = false
}) => {
  const baseClasses = "flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all";
  const variantClasses = {
    default: isActive
      ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
      : "bg-[#1a1a25]/60 text-white/70 hover:text-white hover:bg-[#222230]/80 border border-white/5",
    primary: "bg-indigo-500 text-white hover:bg-indigo-400 border border-indigo-400/50",
    danger: "bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-500/30"
  };

  return (
    <motion.button
      className={`${baseClasses} ${variantClasses[variant]} ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
      variants={buttonVariants}
      initial="rest"
      whileHover={disabled ? {} : 'hover'}
      whileTap={disabled ? {} : 'tap'}
      onClick={onClick}
      disabled={disabled}
      title={`${label}${shortcut ? ` (${shortcut})` : ''}`}
      aria-label={label}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
      {shortcut && (
        <kbd className="hidden lg:inline-flex px-1.5 py-0.5 text-xs bg-white/10 rounded ml-1">
          {shortcut}
        </kbd>
      )}
    </motion.button>
  );
};

interface PresetDropdownProps {
  presets: ExportPreset[];
  onApply: (preset: ExportPreset) => void;
  isOpen: boolean;
  onClose: () => void;
}

const PresetDropdown: React.FC<PresetDropdownProps> = ({ presets, onApply, isOpen, onClose }) => {
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
            className="absolute top-full right-0 mt-2 z-[850] min-w-[240px]"
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <div className="bg-[#1a1a25]/95 backdrop-blur-xl rounded-xl border border-white/10 shadow-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-white/10">
                <p className="text-sm font-medium text-white/90">Presets rápidos</p>
              </div>
              <div className="p-2 max-h-[300px] overflow-y-auto">
                {presets.map((preset, index) => (
                  <motion.button
                    key={preset.id}
                    className="w-full flex items-center justify-between px-3 py-3 rounded-lg text-left hover:bg-white/5 transition-colors group"
                    onClick={() => {
                      onApply(preset);
                      onClose();
                    }}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <div>
                      <p className="text-sm font-medium text-white/90 group-hover:text-white">{preset.name}</p>
                      <p className="text-xs text-white/50">
                        {preset.format.toUpperCase()} • {preset.quality}% quality
                        {preset.dimensions && ` • ${preset.dimensions.width}×${preset.dimensions.height}`}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-white/60" />
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

export const Toolbar: React.FC<ToolbarProps> = ({
  activeView = 'camera',
  onViewChange,
  actions = [],
  showPresets = true,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  onReset,
  onExport,
  onOpenFile,
  onSavePreset,
  presets = [],
  onApplyPreset,
  className = ''
}) => {
  const toolbarRef = useRef<HTMLElement>(null);
  const [showPresetDropdown, setShowPresetDropdown] = React.useState(false);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key.toLowerCase()) {
        case 'c':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            onViewChange?.('camera');
          }
          break;
        case 'e':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            onViewChange?.('editor');
          }
          break;
        case 'z':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            if (e.shiftKey) {
              if (canRedo) onRedo?.();
            } else {
              if (canUndo) onUndo?.();
            }
          }
          break;
        case 's':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            onSavePreset?.();
          }
          break;
        case 'o':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            onOpenFile?.();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onViewChange, canUndo, canRedo, onUndo, onRedo, onSavePreset, onOpenFile]);

  // Focus management
  const focusToolbar = useCallback(() => {
    toolbarRef.current?.focus();
  }, []);

  return (
    <motion.header
      ref={toolbarRef}
      className={`w-full px-4 py-3 bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-white/5 ${className}`}
      variants={toolbarVariants}
      initial="hidden"
      animate="visible"
      role="toolbar"
      aria-label="Barra de herramientas principal"
      tabIndex={-1}
    >
      <div className="max-w-[1920px] mx-auto flex items-center justify-between gap-4">
        {/* Left Section - Logo & View Toggle */}
        <div className="flex items-center gap-4">
          {/* Logo */}
          <motion.div
            className="flex items-center gap-2"
            variants={itemVariants}
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Aperture className="w-5 h-5 text-white" />
            </div>
            <span className="hidden md:block text-lg font-semibold text-white/90">
              APEX
            </span>
          </motion.div>

          <div className="w-px h-6 bg-white/10 hidden sm:block" />

          {/* View Toggle */}
          <ViewToggle activeView={activeView} onChange={onViewChange || (() => {})} />
        </div>

        {/* Center Section - History Actions */}
        <div className="hidden md:flex items-center gap-2">
          <motion.div variants={itemVariants}>
            <ActionButton
              icon={<Undo2 className="w-4 h-4" />}
              label="Deshacer"
              onClick={onUndo || (() => {})}
              disabled={!canUndo}
              shortcut="Ctrl+Z"
            />
          </motion.div>

          <motion.div variants={itemVariants}>
            <ActionButton
              icon={<Redo2 className="w-4 h-4" />}
              label="Rehacer"
              onClick={onRedo || (() => {})}
              disabled={!canRedo}
              shortcut="Ctrl+Shift+Z"
            />
          </motion.div>

          <motion.div variants={itemVariants}>
            <ActionButton
              icon={<RotateCcw className="w-4 h-4" />}
              label="Reset"
              onClick={onReset || (() => {})}
              shortcut="R"
            />
          </motion.div>
        </div>

        {/* Right Section - Export & Actions */}
        <div className="flex items-center gap-2">
          {/* Open File */}
          {onOpenFile && (
            <motion.div variants={itemVariants} className="hidden sm:block">
              <ActionButton
                icon={<FolderOpen className="w-4 h-4" />}
                label="Abrir"
                onClick={onOpenFile}
                shortcut="Ctrl+O"
              />
            </motion.div>
          )}

          {/* Custom Actions */}
          {actions.slice(0, 2).map((action) => (
            <motion.div key={action.id} variants={itemVariants} className="hidden lg:block">
              <ActionButton
                icon={action.icon}
                label={action.label}
                onClick={action.onClick}
                disabled={action.disabled}
                shortcut={action.shortcut}
                variant={action.variant}
              />
            </motion.div>
          ))}

          <div className="w-px h-6 bg-white/10" />

          {/* Save Preset */}
          {onSavePreset && (
            <motion.div variants={itemVariants}>
              <ActionButton
                icon={<Save className="w-4 h-4" />}
                label="Guardar"
                onClick={onSavePreset}
                shortcut="Ctrl+S"
              />
            </motion.div>
          )}

          {/* Presets Dropdown */}
          {showPresets && presets.length > 0 && onApplyPreset && (
            <motion.div variants={itemVariants} className="relative">
              <motion.button
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium bg-[#1a1a25]/60 text-white/70 hover:text-white hover:bg-[#222230]/80 border border-white/5 transition-all"
                variants={buttonVariants}
                initial="rest"
                whileHover="hover"
                whileTap="tap"
                onClick={() => setShowPresetDropdown(!showPresetDropdown)}
              >
                <Sparkles className="w-4 h-4" />
                <span className="hidden sm:inline">Presets</span>
              </motion.button>
              <PresetDropdown
                presets={presets}
                onApply={onApplyPreset}
                isOpen={showPresetDropdown}
                onClose={() => setShowPresetDropdown(false)}
              />
            </motion.div>
          )}

          {/* Export Button */}
          {onExport && (
            <motion.div variants={itemVariants}>
              <motion.button
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-indigo-500 text-white hover:bg-indigo-400 border border-indigo-400/50 transition-all"
                variants={glowVariants}
                initial="rest"
                whileHover="hover"
                whileTap={{ scale: 0.98 }}
                onClick={onExport}
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Exportar</span>
                <kbd className="hidden lg:inline-flex px-1.5 py-0.5 text-xs bg-white/20 rounded ml-1">
                  Ctrl+S
                </kbd>
              </motion.button>
            </motion.div>
          )}
        </div>
      </div>
    </motion.header>
  );
};

// Aperture icon component (not in lucide-react)
const Aperture: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="2" x2="12" y2="22" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
    <line x1="19.07" y1="4.93" x2="4.93" y2="19.07" />
  </svg>
);

export default Toolbar;

