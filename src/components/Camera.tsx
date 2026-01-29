/**
 * APEX Photo Studio v1.1.0 - Camera Component
 * Vista de cámara con preview en tiempo real, selector de resolución,
 * temporizador animado y soporte multi-cámara.
 */

import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import {
  Camera as CameraIcon,
  Timer,
  RefreshCw,
  Settings2,
  Maximize2,
  Aperture,
  ChevronDown,
  X
} from 'lucide-react';
import { useImageStore } from '@/hooks/useImageStore';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface CameraDevice {
  id: string;
  label: string;
  kind: 'videoinput';
  facing?: 'user' | 'environment';
}

export interface CameraResolution {
  label: string;
  width: number;
  height: number;
  value: string;
}

export interface CameraProps {
  /** Resolución de captura */
  resolution?: '4K' | '1080p' | '720p';
  /** Duración del temporizador en segundos (0 = off) */
  timerDuration?: 0 | 2 | 5 | 10;
  /** ID de la cámara activa */
  activeCamera?: string;
  /** Lista de cámaras disponibles */
  availableCameras?: CameraDevice[];
  /** Callback al capturar foto */
  onCapture?: (blob: Blob, metadata: CaptureMetadata) => void;
  /** Callback al cambiar resolución */
  onResolutionChange?: (res: '4K' | '1080p' | '720p') => void;
  /** Callback al cambiar cámara */
  onCameraSwitch?: (deviceId: string) => void;
  /** Callback al iniciar/detener temporizador */
  onTimerChange?: (seconds: number) => void;
  /** Callback en error de cámara */
  onError?: (error: Error) => void;
  /** Clase CSS adicional */
  className?: string;
}

export interface CaptureMetadata {
  timestamp: number;
  resolution: string;
  cameraId: string;
  timerUsed: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const RESOLUTIONS: Record<string, CameraResolution> = {
  '4K': { label: '4K UHD', width: 3840, height: 2160, value: '4K' },
  '1080p': { label: 'Full HD', width: 1920, height: 1080, value: '1080p' },
  '720p': { label: 'HD', width: 1280, height: 720, value: '720p' }
};

const TIMER_OPTIONS = [0, 2, 5, 10] as const;

// ============================================================================
// ANIMATION VARIANTS
// ============================================================================

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.28,
      ease: 'easeOut' as const,
      staggerChildren: 0.05
    }
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.2, ease: 'easeIn' as const }
  }
};

const glassPanelVariants = {
  hidden: {
    opacity: 0,
    backdropFilter: 'blur(6px)',
    y: 8
  },
  visible: {
    opacity: 1,
    backdropFilter: 'blur(12px)',
    y: 0,
    transition: {
      duration: 0.28,
      ease: 'easeOut' as const
    }
  }
};

const countdownVariants = {
  initial: { scale: 0.5, opacity: 0 },
  animate: {
    scale: 1,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 20
    }
  },
  exit: {
    scale: 1.5,
    opacity: 0,
    transition: { duration: 0.15 }
  }
} as const;

const buttonHoverVariants = {
  rest: { scale: 1 },
  hover: {
    scale: 1.03,
    transition: { duration: 0.03, ease: 'easeOut' as const }
  },
  tap: {
    scale: 0.98,
    transition: { duration: 0.06, ease: 'easeIn' as const }
  }
} as const;

const captureButtonVariants = {
  rest: {
    scale: 1,
    boxShadow: '0 0 0 0 rgba(99, 102, 241, 0)'
  },
  hover: {
    scale: 1.05,
    boxShadow: '0 0 30px rgba(99, 102, 241, 0.5)',
    transition: {
      type: 'spring' as const,
      stiffness: 180,
      damping: 18
    }
  },
  tap: {
    scale: 0.95,
    boxShadow: '0 0 10px rgba(99, 102, 241, 0.3)',
    transition: { duration: 0.06 }
  }
} as const;

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface CountdownOverlayProps {
  seconds: number;
  onComplete: () => void;
  onCancel: () => void;
}

const CountdownOverlay: React.FC<CountdownOverlayProps> = ({
  seconds,
  onComplete,
  onCancel
}) => {
  const [count, setCount] = useState(seconds);
  const controls = useAnimation();
  const circumference = 2 * Math.PI * 80;

  useEffect(() => {
    if (count <= 0) {
      onComplete();
      return;
    }

    const timer = setTimeout(() => {
      setCount(c => c - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [count, onComplete]);

  useEffect(() => {
    controls.start({
      strokeDashoffset: 0,
      transition: {
        duration: 1,
        ease: 'linear'
      }
    });
  }, [count, controls]);

  return (
    <motion.div
      className="absolute inset-0 z-[900] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onCancel}
    >
      <motion.div
        className="relative flex items-center justify-center"
        variants={countdownVariants}
        initial="initial"
        animate="animate"
        exit="exit"
      >
        {/* Progress Circle */}
        <svg className="w-48 h-48 -rotate-90" viewBox="0 0 200 200">
          <circle
            cx="100"
            cy="100"
            r="80"
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="8"
          />
          <motion.circle
            cx="100"
            cy="100"
            r="80"
            fill="none"
            stroke="#6366f1"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={controls}
          />
        </svg>

        {/* Count Number */}
        <motion.span
          className="absolute text-7xl font-bold text-white"
          key={count}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{
            scale: [0.8, 1.1, 1],
            opacity: 1,
            transition: {
              duration: 0.25,
              ease: 'backOut'
            }
          }}
        >
          {count}
        </motion.span>
      </motion.div>

      <motion.p
        className="absolute bottom-32 text-white/70 text-sm"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        Click para cancelar
      </motion.p>
    </motion.div>
  );
};

interface CameraSelectorProps {
  cameras: CameraDevice[];
  activeId: string;
  onSelect: (id: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

const CameraSelector: React.FC<CameraSelectorProps> = ({
  cameras,
  activeId,
  onSelect,
  isOpen,
  onClose
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-[850]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[860] min-w-[280px]"
            variants={glassPanelVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
          >
            <div className="bg-[#1a1a25]/90 backdrop-blur-xl rounded-xl border border-white/10 shadow-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-white/10">
                <p className="text-sm font-medium text-white/90">Seleccionar cámara</p>
              </div>
              <div className="p-2">
                {cameras.map((camera, index) => (
                  <motion.button
                    key={camera.id}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                      activeId === camera.id
                        ? 'bg-indigo-500/20 text-indigo-300'
                        : 'hover:bg-white/5 text-white/80'
                    }`}
                    onClick={() => {
                      onSelect(camera.id);
                      onClose();
                    }}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ x: 4 }}
                  >
                    <CameraIcon className="w-4 h-4" />
                    <span className="text-sm">{camera.label || `Cámara ${index + 1}`}</span>
                    {activeId === camera.id && (
                      <motion.div
                        className="ml-auto w-2 h-2 rounded-full bg-indigo-400"
                        layoutId="activeIndicator"
                      />
                    )}
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

interface ResolutionSelectorProps {
  current: string;
  onChange: (res: '4K' | '1080p' | '720p') => void;
  isOpen: boolean;
  onClose: () => void;
}

const ResolutionSelector: React.FC<ResolutionSelectorProps> = ({
  current,
  onChange,
  isOpen,
  onClose
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-[850]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="absolute bottom-24 right-4 z-[860]"
            variants={glassPanelVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
          >
            <div className="bg-[#1a1a25]/90 backdrop-blur-xl rounded-xl border border-white/10 shadow-2xl overflow-hidden min-w-[160px]">
              <div className="px-4 py-3 border-b border-white/10">
                <p className="text-sm font-medium text-white/90">Resolución</p>
              </div>
              <div className="p-2">
                {Object.entries(RESOLUTIONS).map(([key, res], index) => (
                  <motion.button
                    key={key}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-colors ${
                      current === key
                        ? 'bg-indigo-500/20 text-indigo-300'
                        : 'hover:bg-white/5 text-white/80'
                    }`}
                    onClick={() => {
                      onChange(key as '4K' | '1080p' | '720p');
                      onClose();
                    }}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <span className="text-sm font-medium">{res.label}</span>
                    <span className="text-xs text-white/50">{res.width}×{res.height}</span>
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

export const Camera: React.FC<CameraProps> = ({
  resolution = '1080p',
  timerDuration = 0,
  activeCamera = 'default',
  availableCameras = [],
  onCapture,
  onResolutionChange,
  onCameraSwitch,
  onTimerChange,
  onError,
  className = ''
}) => {
  const { setOriginalImage, setUIState } = useImageStore();
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [isStreaming, setIsStreaming] = useState(false);
  const [countdownActive, setCountdownActive] = useState(false);
  const [currentResolution, setCurrentResolution] = useState(resolution);
  const [currentTimer, setCurrentTimer] = useState(timerDuration);
  const [currentCamera, setCurrentCamera] = useState(activeCamera);
  const [showCameraSelector, setShowCameraSelector] = useState(false);
  const [showResolutionSelector, setShowResolutionSelector] = useState(false);
  const [isMirrored, setIsMirrored] = useState(true);
  const [flashActive, setFlashActive] = useState(false);

  // Initialize camera stream
  const initCamera = useCallback(async (deviceId?: string) => {
    try {
      const res = RESOLUTIONS[currentResolution];
      const constraints: MediaStreamConstraints = {
        video: {
          deviceId: deviceId ? { exact: deviceId } : undefined,
          width: { ideal: res.width },
          height: { ideal: res.height }
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsStreaming(true);
      }
    } catch (err) {
      onError?.(err as Error);
      setIsStreaming(false);
    }
  }, [currentResolution, onError]);

  // Stop camera stream
  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
  }, []);

  // Capture photo
  const capturePhoto = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    if (isMirrored) {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0);

    // Flash effect
    setFlashActive(true);
    setTimeout(() => setFlashActive(false), 150);

    // Get ImageData for the store
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    // Save to store and switch to editor mode
    setOriginalImage(imageData, `APEX_Photo_${new Date().toISOString().replace(/[:.]/g, '-')}.jpg`);
    setUIState({ mode: 'editor' });

    // Also call the callback if provided
    if (onCapture) {
      canvas.toBlob((blob) => {
        if (blob) {
          onCapture(blob, {
            timestamp: Date.now(),
            resolution: currentResolution,
            cameraId: currentCamera,
            timerUsed: currentTimer
          });
        }
      }, 'image/jpeg', 0.95);
    }
  }, [isMirrored, currentResolution, currentCamera, currentTimer, onCapture, setOriginalImage, setUIState]);

  // Handle countdown complete
  const handleCountdownComplete = useCallback(() => {
    setCountdownActive(false);
    capturePhoto();
  }, [capturePhoto]);

  // Start capture (with or without timer)
  const handleCaptureClick = useCallback(() => {
    if (currentTimer > 0) {
      setCountdownActive(true);
    } else {
      capturePhoto();
    }
  }, [currentTimer, capturePhoto]);

  // Initialize on mount
  useEffect(() => {
    initCamera(currentCamera !== 'default' ? currentCamera : undefined);
    return () => stopCamera();
  }, [initCamera, stopCamera, currentCamera]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' && !countdownActive) {
        e.preventDefault();
        handleCaptureClick();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleCaptureClick, countdownActive]);

  // Get available cameras
  useEffect(() => {
    const getCameras = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(d => d.kind === 'videoinput');
        // Update available cameras in parent
      } catch (err) {
        console.error('Error enumerating devices:', err);
      }
    };

    getCameras();
  }, []);

  return (
    <motion.div
      className={`relative w-full h-full bg-[#0a0a0f] overflow-hidden ${className}`}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      role="region"
      aria-label="Cámara - Preview en tiempo real"
    >
      {/* Video Preview */}
      <div className="relative w-full h-full">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover transition-transform duration-300 ${
            isMirrored ? 'scale-x-[-1]' : ''
          }`}
          style={{ filter: isStreaming ? 'none' : 'blur(20px)' }}
        />

        {/* Hidden canvas for capture */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Flash overlay */}
        <AnimatePresence>
          {flashActive && (
            <motion.div
              className="absolute inset-0 bg-white pointer-events-none"
              initial={{ opacity: 1 }}
              animate={{ opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            />
          )}
        </AnimatePresence>

        {/* Countdown Overlay */}
        <AnimatePresence>
          {countdownActive && (
            <CountdownOverlay
              seconds={currentTimer}
              onComplete={handleCountdownComplete}
              onCancel={() => setCountdownActive(false)}
            />
          )}
        </AnimatePresence>

        {/* Top Bar - Info */}
        <motion.div
          className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between z-10"
          variants={glassPanelVariants}
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-black/40 backdrop-blur-md rounded-full">
              <div className={`w-2 h-2 rounded-full ${isStreaming ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
              <span className="text-xs font-medium text-white/80">
                {isStreaming ? 'EN VIVO' : 'SIN SEÑAL'}
              </span>
            </div>
            <div className="px-3 py-1.5 bg-black/40 backdrop-blur-md rounded-full">
              <span className="text-xs font-medium text-white/80">{RESOLUTIONS[currentResolution].label}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {currentTimer > 0 && (
              <motion.div
                className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500/30 backdrop-blur-md rounded-full"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
              >
                <Timer className="w-3.5 h-3.5 text-indigo-300" />
                <span className="text-xs font-medium text-indigo-200">{currentTimer}s</span>
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* Bottom Controls */}
        <motion.div
          className="absolute bottom-0 left-0 right-0 p-6 pb-8 z-10"
          variants={glassPanelVariants}
        >
          <div className="flex items-end justify-between max-w-4xl mx-auto">
            {/* Left Controls */}
            <div className="flex items-center gap-3">
              {/* Camera Switch */}
              <div className="relative">
                <motion.button
                  className="p-3 bg-[#1a1a25]/80 backdrop-blur-md rounded-xl border border-white/10 text-white/70 hover:text-white hover:bg-[#222230]/80 transition-colors"
                  variants={buttonHoverVariants}
                  initial="rest"
                  whileHover="hover"
                  whileTap="tap"
                  onClick={() => setShowCameraSelector(!showCameraSelector)}
                  aria-label="Cambiar cámara"
                >
                  <RefreshCw className="w-5 h-5" />
                </motion.button>
                <CameraSelector
                  cameras={availableCameras}
                  activeId={currentCamera}
                  onSelect={(id) => {
                    setCurrentCamera(id);
                    onCameraSwitch?.(id);
                  }}
                  isOpen={showCameraSelector}
                  onClose={() => setShowCameraSelector(false)}
                />
              </div>

              {/* Mirror Toggle */}
              <motion.button
                className={`p-3 backdrop-blur-md rounded-xl border border-white/10 transition-colors ${
                  isMirrored
                    ? 'bg-indigo-500/30 text-indigo-300 border-indigo-500/30'
                    : 'bg-[#1a1a25]/80 text-white/70 hover:text-white'
                }`}
                variants={buttonHoverVariants}
                initial="rest"
                whileHover="hover"
                whileTap="tap"
                onClick={() => setIsMirrored(!isMirrored)}
                aria-label={isMirrored ? 'Desactivar espejo' : 'Activar espejo'}
              >
                <Aperture className="w-5 h-5" />
              </motion.button>
            </div>

            {/* Center - Capture Button */}
            <motion.button
              className="relative group"
              variants={captureButtonVariants}
              initial="rest"
              whileHover="hover"
              whileTap="tap"
              onClick={handleCaptureClick}
              aria-label={currentTimer > 0 ? `Capturar con temporizador ${currentTimer}s` : 'Capturar foto'}
            >
              <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-lg">
                <div className="w-16 h-16 rounded-full border-4 border-[#0a0a0f] flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-[#0a0a0f] group-hover:bg-indigo-500 transition-colors" />
                </div>
              </div>
              {currentTimer > 0 && (
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold text-white">{currentTimer}</span>
                </div>
              )}
            </motion.button>

            {/* Right Controls */}
            <div className="flex items-center gap-3">
              {/* Timer Selector */}
              <div className="flex items-center gap-1 p-1 bg-[#1a1a25]/80 backdrop-blur-md rounded-xl border border-white/10">
                {TIMER_OPTIONS.map((timer) => (
                  <motion.button
                    key={timer}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      currentTimer === timer
                        ? 'bg-indigo-500 text-white'
                        : 'text-white/60 hover:text-white hover:bg-white/5'
                    }`}
                    onClick={() => {
                      setCurrentTimer(timer);
                      onTimerChange?.(timer);
                    }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {timer === 0 ? 'Off' : `${timer}s`}
                  </motion.button>
                ))}
              </div>

              {/* Resolution Selector */}
              <div className="relative">
                <motion.button
                  className="p-3 bg-[#1a1a25]/80 backdrop-blur-md rounded-xl border border-white/10 text-white/70 hover:text-white hover:bg-[#222230]/80 transition-colors"
                  variants={buttonHoverVariants}
                  initial="rest"
                  whileHover="hover"
                  whileTap="tap"
                  onClick={() => setShowResolutionSelector(!showResolutionSelector)}
                  aria-label="Cambiar resolución"
                >
                  <Settings2 className="w-5 h-5" />
                </motion.button>
                <ResolutionSelector
                  current={currentResolution}
                  onChange={(res) => {
                    setCurrentResolution(res);
                    onResolutionChange?.(res);
                  }}
                  isOpen={showResolutionSelector}
                  onClose={() => setShowResolutionSelector(false)}
                />
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default Camera;


