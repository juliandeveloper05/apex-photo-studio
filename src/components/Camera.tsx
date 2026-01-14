/**
 * APEX Photo Studio - Premium Camera Capture Component
 * 
 * Professional camera capture with:
 * - MediaDevices API for camera access
 * - Resolution selection
 * - Live preview with vignette
 * - Timer with animated countdown
 * - Glassmorphism controls
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { Camera as CameraIcon, Settings, Timer, RotateCcw, Aperture, X, Video, VideoOff } from 'lucide-react';
import { useImageStore } from '@/hooks/useImageStore';

interface CameraDevice {
  deviceId: string;
  label: string;
}

export function Camera() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [devices, setDevices] = useState<CameraDevice[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const { camera, setCameraSettings, setOriginalImage, setUIState } = useImageStore();
  
  // Helper to get specific error messages
  const getCameraErrorMessage = (err: unknown): string => {
    if (err instanceof Error) {
      const name = err.name;
      const message = err.message.toLowerCase();
      
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        return '🚫 Camera permission denied. Click the lock icon in your browser\'s address bar and allow camera access, then refresh the page.';
      }
      if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        return '📷 No camera found. Please connect a camera and try again.';
      }
      if (name === 'NotReadableError' || name === 'TrackStartError') {
        return '⚠️ Camera is in use by another application. Close other apps using the camera and try again.';
      }
      if (name === 'OverconstrainedError') {
        return '⚙️ Camera doesn\'t support the requested resolution. Try a lower resolution in settings.';
      }
      if (name === 'TypeError' || message.includes('undefined')) {
        return '🌐 Camera API not available. Make sure you\'re using HTTPS and a modern browser.';
      }
      if (name === 'AbortError') {
        return '❌ Camera access was interrupted. Please try again.';
      }
      
      return `❓ Camera error: ${err.message}`;
    }
    return '❓ Unknown camera error. Please try again.';
  };

  // Enumerate cameras
  useEffect(() => {
    async function getDevices() {
      try {
        // Check if mediaDevices API is available
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setError('🌐 Camera API not available. Make sure you\'re using HTTPS and a modern browser (Chrome, Firefox, Edge, Safari).');
          return;
        }
        
        // Request permissions first
        await navigator.mediaDevices.getUserMedia({ video: true });
        
        const deviceList = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = deviceList
          .filter(d => d.kind === 'videoinput')
          .map(d => ({
            deviceId: d.deviceId,
            label: d.label || `Camera ${d.deviceId.slice(0, 5)}`,
          }));
        
        if (videoDevices.length === 0) {
          setError('📷 No camera found. Please connect a camera and try again.');
          return;
        }
        
        setDevices(videoDevices);
        
        if (videoDevices.length > 0 && !camera.deviceId) {
          setCameraSettings({ deviceId: videoDevices[0].deviceId });
        }
      } catch (err) {
        setError(getCameraErrorMessage(err));
      }
    }
    
    getDevices();
  }, []);
  
  // Start/stop stream based on device selection
  useEffect(() => {
    if (!camera.deviceId) return;
    
    startStream();
    
    return () => {
      stopStream();
    };
  }, [camera.deviceId, camera.resolution]);
  
  const getResolutionConstraints = useCallback(() => {
    switch (camera.resolution) {
      case '4k':
        return { width: { ideal: 3840 }, height: { ideal: 2160 } };
      case '2k':
        return { width: { ideal: 2560 }, height: { ideal: 1440 } };
      case '1080p':
        return { width: { ideal: 1920 }, height: { ideal: 1080 } };
      case '720p':
        return { width: { ideal: 1280 }, height: { ideal: 720 } };
      case 'max':
      default:
        return { width: { ideal: 4096 }, height: { ideal: 2160 } };
    }
  }, [camera.resolution]);
  
  const startStream = async () => {
    try {
      stopStream();
      
      const constraints: MediaStreamConstraints = {
        video: {
          deviceId: camera.deviceId ? { exact: camera.deviceId } : undefined,
          ...getResolutionConstraints(),
        },
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsStreaming(true);
        setError(null);
      }
    } catch (err) {
      console.error('Failed to start camera:', err);
      setError(getCameraErrorMessage(err));
      setIsStreaming(false);
    }
  };
  
  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsStreaming(false);
  };
  
  const captureFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (!video || !canvas) return;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.drawImage(video, 0, 0);
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setOriginalImage(imageData, `capture_${Date.now()}.jpg`);
    setUIState({ mode: 'editor' });
  }, [setOriginalImage, setUIState]);
  
  const handleCapture = useCallback(() => {
    if (camera.timer > 0) {
      let remaining = camera.timer;
      setCountdown(remaining);
      
      const interval = setInterval(() => {
        remaining--;
        if (remaining <= 0) {
          clearInterval(interval);
          setCountdown(null);
          captureFrame();
        } else {
          setCountdown(remaining);
        }
      }, 1000);
    } else {
      captureFrame();
    }
  }, [camera.timer, captureFrame]);
  
  const resolutions = [
    { value: 'max', label: 'Max Quality' },
    { value: '4k', label: '4K (3840×2160)' },
    { value: '2k', label: '2K (2560×1440)' },
    { value: '1080p', label: 'Full HD (1920×1080)' },
    { value: '720p', label: 'HD (1280×720)' },
  ];
  
  const timers = [0, 2, 5, 10];
  
  return (
    <div className="relative w-full h-full flex flex-col bg-[var(--apex-bg-darkest)]">
      {/* Camera Preview */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        {error ? (
          <div className="text-center p-8 animate-fade-in-up">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-[var(--apex-bg-elevated)] flex items-center justify-center">
              <VideoOff className="w-10 h-10 text-[var(--apex-text-muted)]" />
            </div>
            <p className="text-[var(--apex-text-secondary)] mb-6 max-w-md">{error}</p>
            <button
              onClick={startStream}
              className="px-6 py-2.5 bg-gradient-to-r from-[var(--apex-accent)] to-[#0284c7] hover:from-[var(--apex-accent-light)] hover:to-[var(--apex-accent)] text-white rounded-lg font-medium transition-all duration-200 shadow-lg shadow-[var(--apex-accent-glow)]"
            >
              Retry Connection
            </button>
          </div>
        ) : (
          <>
            {/* Video Preview with Vignette */}
            <div className="relative vignette rounded-lg overflow-hidden shadow-2xl">
              <video
                ref={videoRef}
                className="max-w-full max-h-[calc(100vh-16rem)] object-contain"
                playsInline
                muted
              />
              
              {/* Stream Status Indicator */}
              <div className="absolute top-4 left-4 flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${isStreaming ? 'bg-[var(--apex-green)] animate-pulse' : 'bg-[var(--apex-red)]'}`} />
                <span className="text-xs font-medium text-white/80 glass px-2 py-0.5 rounded">
                  {isStreaming ? 'LIVE' : 'OFFLINE'}
                </span>
              </div>
              
              {/* Resolution Badge */}
              {isStreaming && videoRef.current && (
                <div className="absolute top-4 right-4 glass px-2 py-1 rounded text-xs text-white/70 font-mono">
                  {videoRef.current.videoWidth} × {videoRef.current.videoHeight}
                </div>
              )}
            </div>
            
            {/* Countdown Overlay */}
            {countdown !== null && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                <span 
                  key={countdown}
                  className="text-[10rem] font-bold text-white animate-countdown"
                  style={{ textShadow: '0 0 60px rgba(14, 165, 233, 0.5)' }}
                >
                  {countdown}
                </span>
              </div>
            )}
          </>
        )}
        
        {/* Hidden canvas for capture */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
      
      {/* Controls */}
      <div className="p-6 glass-panel border-t border-[var(--apex-border)] animate-fade-in-up">
        <div className="flex items-center justify-center gap-6">
          {/* Settings Toggle */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-3 rounded-xl transition-all duration-200 ${
              showSettings 
                ? 'bg-[var(--apex-accent)] text-white shadow-lg shadow-[var(--apex-accent-glow)]' 
                : 'bg-[var(--apex-bg-hover)] text-[var(--apex-text-muted)] hover:bg-[var(--apex-bg-elevated)] hover:text-[var(--apex-text-primary)]'
            }`}
          >
            <Settings className="w-5 h-5" />
          </button>
          
          {/* Timer Selection */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--apex-bg-dark)] border border-[var(--apex-border)]">
            <Timer className="w-4 h-4 text-[var(--apex-text-muted)] ml-2" />
            {timers.map(t => (
              <button
                key={t}
                onClick={() => setCameraSettings({ timer: t })}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  camera.timer === t
                    ? 'bg-gradient-to-r from-[var(--apex-accent)] to-[#0284c7] text-white shadow-md'
                    : 'text-[var(--apex-text-muted)] hover:text-[var(--apex-text-primary)] hover:bg-[var(--apex-bg-hover)]'
                }`}
              >
                {t === 0 ? 'Off' : `${t}s`}
              </button>
            ))}
          </div>
          
          {/* Capture Button */}
          <button
            onClick={handleCapture}
            disabled={!isStreaming || countdown !== null}
            className="relative w-20 h-20 rounded-full bg-white disabled:bg-gray-500 
                       transition-all duration-300 transform hover:scale-105 active:scale-95
                       flex items-center justify-center shadow-2xl group
                       disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              boxShadow: isStreaming ? '0 0 30px rgba(255,255,255,0.3)' : undefined
            }}
          >
            {/* Outer Ring */}
            <div className={`absolute inset-0 rounded-full border-4 border-white/30 ${
              isStreaming && countdown === null ? 'animate-capture-pulse' : ''
            }`} />
            
            {/* Inner Circle */}
            <div className="w-16 h-16 rounded-full bg-white border-4 border-gray-200 
                          group-hover:border-[var(--apex-accent)] transition-colors duration-200" />
            
            {/* Shutter Icon on hover */}
            <Aperture className="absolute w-6 h-6 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
          
          {/* Switch Camera */}
          {devices.length > 1 && (
            <button
              onClick={() => {
                const currentIndex = devices.findIndex(d => d.deviceId === camera.deviceId);
                const nextIndex = (currentIndex + 1) % devices.length;
                setCameraSettings({ deviceId: devices[nextIndex].deviceId });
              }}
              className="p-3 rounded-xl bg-[var(--apex-bg-hover)] text-[var(--apex-text-muted)] 
                         hover:bg-[var(--apex-bg-elevated)] hover:text-[var(--apex-text-primary)] transition-all duration-200"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          )}
        </div>
        
        {/* Settings Panel */}
        {showSettings && (
          <div className="mt-6 p-4 glass rounded-xl animate-fade-in-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-[var(--apex-text-primary)]">Camera Settings</h3>
              <button 
                onClick={() => setShowSettings(false)}
                className="p-1 rounded-md hover:bg-[var(--apex-bg-hover)] text-[var(--apex-text-muted)] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Camera Selection */}
              <div>
                <label className="block text-xs text-[var(--apex-text-muted)] mb-2 font-medium">
                  <Video className="inline w-3 h-3 mr-1" />
                  Camera Device
                </label>
                <select
                  value={camera.deviceId}
                  onChange={e => setCameraSettings({ deviceId: e.target.value })}
                  className="w-full"
                >
                  {devices.map(d => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Resolution */}
              <div>
                <label className="block text-xs text-[var(--apex-text-muted)] mb-2 font-medium">
                  <CameraIcon className="inline w-3 h-3 mr-1" />
                  Resolution
                </label>
                <select
                  value={camera.resolution}
                  onChange={e => setCameraSettings({ resolution: e.target.value as 'max' | '4k' | '2k' | '1080p' | '720p' })}
                  className="w-full"
                >
                  {resolutions.map(r => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
