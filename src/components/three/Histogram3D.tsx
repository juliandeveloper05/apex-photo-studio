/**
 * APEX Photo Studio v1.1.0 - Histogram3D Component
 * Visualizador de histograma en 3D con barras animadas.
 * GPU-instanced Mesh para performance.
 */

import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, PerspectiveCamera } from '@react-three/drei';
import { motion, AnimatePresence } from 'framer-motion';
import * as THREE from 'three';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface Histogram3DProps {
  /** Datos del histograma (256 valores) */
  data: number[];
  /** Canal a mostrar */
  channel?: 'rgb' | 'red' | 'green' | 'blue' | 'luminance';
  /** Altura máxima de las barras */
  maxHeight?: number;
  /** Ancho del área del histograma */
  width?: number;
  /** Profundidad del área del histograma */
  depth?: number;
  /** Suavizado de animación */
  animationSmoothing?: number;
  /** Clase CSS adicional */
  className?: string;
}

interface InstancedBarsProps {
  data: number[];
  channel: string;
  maxHeight: number;
  width: number;
  depth: number;
  animationSmoothing: number;
}

// ============================================================================
// FALLBACK COMPONENT
// ============================================================================

const Canvas2DFallback: React.FC<{ data: number[]; channel: string }> = ({ data, channel }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const barWidth = rect.width / data.length;
    const maxValue = Math.max(...data, 1);

    // Clear
    ctx.clearRect(0, 0, rect.width, rect.height);

    // Draw bars
    data.forEach((value, i) => {
      const barHeight = (value / maxValue) * rect.height * 0.9;
      const x = i * barWidth;
      const y = rect.height - barHeight;

      // Color based on position and channel
      let color: string;
      const t = i / data.length;

      if (channel === 'red') {
        color = `rgb(${Math.round(255 * t)}, 0, 0)`;
      } else if (channel === 'green') {
        color = `rgb(0, ${Math.round(255 * t)}, 0)`;
      } else if (channel === 'blue') {
        color = `rgb(0, 0, ${Math.round(255 * t)})`;
      } else if (channel === 'luminance') {
        const gray = Math.round(255 * t);
        color = `rgb(${gray}, ${gray}, ${gray})`;
      } else {
        // RGB gradient
        if (t < 0.33) {
          color = `rgb(${Math.round(255 * (1 - t * 3))}, ${Math.round(255 * t * 3)}, 0)`;
        } else if (t < 0.66) {
          color = `rgb(0, ${Math.round(255 * (1 - (t - 0.33) * 3))}, ${Math.round(255 * (t - 0.33) * 3)})`;
        } else {
          color = `rgb(${Math.round(255 * (t - 0.66) * 3)}, 0, ${Math.round(255 * (1 - (t - 0.66) * 3))})`;
        }
      }

      ctx.fillStyle = color;
      ctx.fillRect(x, y, barWidth - 0.5, barHeight);
    });

    // Draw grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      const y = rect.height * (i / 4);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(rect.width, y);
      ctx.stroke();
    }
  }, [data, channel]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      style={{ imageRendering: 'crisp-edges' }}
    />
  );
};

// ============================================================================
// 3D COMPONENTS
// ============================================================================

/**
 * Instanced Bars - GPU-instanced mesh for performance
 * Renders 256 bars with a single draw call
 */
const InstancedBars: React.FC<InstancedBarsProps> = ({
  data,
  channel,
  maxHeight,
  width,
  depth,
  animationSmoothing
}) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const targetHeights = useRef<Float32Array>(new Float32Array(data.length));
  const currentHeights = useRef<Float32Array>(new Float32Array(data.length));

  // Bar geometry and material
  const [geometry, material] = useMemo(() => {
    const geo = new THREE.BoxGeometry(0.03, 1, 0.03);
    geo.translate(0, 0.5, 0); // Pivot at bottom

    const mat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.4,
      metalness: 0.1
    });

    return [geo, mat];
  }, []);

  // Get color for bar based on index and channel
  const getBarColor = (index: number): THREE.Color => {
    const t = index / data.length;
    const color = new THREE.Color();

    if (channel === 'red') {
      color.setRGB(t, 0, 0);
    } else if (channel === 'green') {
      color.setRGB(0, t, 0);
    } else if (channel === 'blue') {
      color.setRGB(0, 0, t);
    } else if (channel === 'luminance') {
      color.setRGB(t, t, t);
    } else {
      // RGB gradient
      if (t < 0.33) {
        color.setRGB(1 - t * 3, t * 3, 0);
      } else if (t < 0.66) {
        color.setRGB(0, 1 - (t - 0.33) * 3, (t - 0.33) * 3);
      } else {
        color.setRGB((t - 0.66) * 3, 0, 1 - (t - 0.66) * 3);
      }
    }

    return color;
  };

  // Initialize instance colors
  useEffect(() => {
    if (!meshRef.current) return;

    for (let i = 0; i < data.length; i++) {
      meshRef.current.setColorAt(i, getBarColor(i));
    }

    meshRef.current.instanceColor!.needsUpdate = true;
  }, [channel, data.length]);

  // Update target heights when data changes
  useEffect(() => {
    const maxValue = Math.max(...data, 1);
    for (let i = 0; i < data.length; i++) {
      targetHeights.current[i] = (data[i] / maxValue) * maxHeight;
    }
  }, [data, maxHeight]);

  // Animation loop
  useFrame(() => {
    if (!meshRef.current) return;

    const spacing = width / data.length;
    let needsUpdate = false;

    for (let i = 0; i < data.length; i++) {
      // Smooth interpolation
      const diff = targetHeights.current[i] - currentHeights.current[i];

      if (Math.abs(diff) > 0.001) {
        currentHeights.current[i] += diff * (1 - animationSmoothing);
        needsUpdate = true;

        // Update instance transform
        dummy.position.set(
          (i - data.length / 2) * spacing,
          0,
          0
        );
        dummy.scale.set(1, Math.max(0.01, currentHeights.current[i]), 1);
        dummy.updateMatrix();
        meshRef.current.setMatrixAt(i, dummy.matrix);
      }
    }

    if (needsUpdate) {
      meshRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, data.length]}
      castShadow
      receiveShadow
    />
  );
};

/**
 * Grid Floor - Reference grid for the histogram
 */
const GridFloor: React.FC<{ width: number; depth: number }> = ({ width, depth }) => {
  return (
    <>
      {/* Grid lines */}
      <gridHelper
        args={[width, 16, 0x333333, 0x222222]}
        position={[0, 0, -depth / 4]}
      />

      {/* Base plane */}
      <mesh position={[0, -0.01, -depth / 4]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[width * 1.2, depth]} />
        <meshStandardMaterial
          color="#0a0a0f"
          roughness={0.8}
          metalness={0.1}
          transparent
          opacity={0.8}
        />
      </mesh>
    </>
  );
};

/**
 * Scene Controller - Main scene composition
 */
interface SceneControllerProps {
  data: number[];
  channel: string;
  maxHeight: number;
  width: number;
  depth: number;
  animationSmoothing: number;
}

const SceneController: React.FC<SceneControllerProps> = (props) => {
  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[5, 10, 5]}
        intensity={0.8}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />

      {/* Histogram bars */}
      <InstancedBars {...props} />

      {/* Grid floor */}
      <GridFloor width={props.width} depth={props.depth} />

      {/* Camera controller */}
      <CameraController />
    </>
  );
};

/**
 * Camera Controller - Orbit-like camera with constraints
 */
const CameraController: React.FC = () => {
  const { camera } = useThree();

  useFrame(() => {
    // Subtle camera drift for liveliness
    const time = Date.now() * 0.0005;
    camera.position.x = Math.sin(time) * 0.5;
    camera.lookAt(0, 1, 0);
  });

  return null;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const Histogram3D: React.FC<Histogram3DProps> = ({
  data,
  channel = 'rgb',
  maxHeight = 3,
  width = 8,
  depth = 4,
  animationSmoothing = 0.85,
  className = ''
}) => {
  const [webglSupported, setWebglSupported] = useState(true);

  // Check WebGL support
  useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) {
        setWebglSupported(false);
      }
    } catch (e) {
      setWebglSupported(false);
    }
  }, []);

  // Normalize data to 256 values
  const normalizedData = useMemo(() => {
    if (data.length === 256) return data;

    // Resample to 256 values
    const result = new Array(256).fill(0);
    const ratio = data.length / 256;

    for (let i = 0; i < 256; i++) {
      const sourceIndex = Math.floor(i * ratio);
      result[i] = data[Math.min(sourceIndex, data.length - 1)] || 0;
    }

    return result;
  }, [data]);

  if (!webglSupported) {
    return (
      <div className={`relative ${className}`}>
        <Canvas2DFallback data={normalizedData} channel={channel} />
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <Canvas
        shadows
        dpr={[1, 1.5]}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance'
        }}
      >
        <PerspectiveCamera
          makeDefault
          position={[0, 2, 8]}
          fov={35}
          near={0.1}
          far={50}
        />

        <SceneController
          data={normalizedData}
          channel={channel}
          maxHeight={maxHeight}
          width={width}
          depth={depth}
          animationSmoothing={animationSmoothing}
        />
      </Canvas>

      {/* Channel indicator */}
      <div className="absolute top-2 left-2 px-2 py-1 bg-black/50 backdrop-blur-sm rounded text-xs text-white/70">
        {channel.toUpperCase()} Histogram
      </div>
    </div>
  );
};

export default Histogram3D;
