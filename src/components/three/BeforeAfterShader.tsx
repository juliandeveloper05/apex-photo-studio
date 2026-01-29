/**
 * APEX Photo Studio v1.1.0 - BeforeAfterShader Component
 * Shader de transición before/after con vignetting y film grain overlay.
 * Fragment shader-based blend con progress uniform.
 */

import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useTexture, Html } from '@react-three/drei';
import * as THREE from 'three';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface BeforeAfterShaderProps {
  /** URL de la imagen original (before) */
  beforeImage: string;
  /** URL de la imagen editada (after) */
  afterImage: string;
  /** Posición de la transición (0-1) */
  progress: number;
  /** Intensidad del vignetting */
  vignetteStrength?: number;
  /** Intensidad del film grain */
  grainIntensity?: number;
  /** Mostrar grain */
  showGrain?: boolean;
  /** Mostrar vignette */
  showVignette?: boolean;
  /** Clase CSS adicional */
  className?: string;
}

// ============================================================================
// SHADER CODE
// ============================================================================

const vertexShader = `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  uniform float uProgress;
  uniform sampler2D uTextureBefore;
  uniform sampler2D uTextureAfter;
  uniform float uVignetteStrength;
  uniform float uGrainIntensity;
  uniform float uTime;
  uniform bool uShowGrain;
  uniform bool uShowVignette;

  varying vec2 vUv;

  // Pseudo-random function for grain
  float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
  }

  // Simplex noise for better grain
  float noise(vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);
    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
  }

  void main() {
    vec2 uv = vUv;

    // Sample both textures
    vec4 before = texture2D(uTextureBefore, uv);
    vec4 after = texture2D(uTextureAfter, uv);

    // Smooth transition based on x position with feathered edge
    float edgeWidth = 0.02;
    float edge = smoothstep(uProgress - edgeWidth, uProgress + edgeWidth, uv.x);

    // Blend between before and after
    vec4 color = mix(before, after, edge);

    // Vignette effect
    if (uShowVignette) {
      vec2 center = uv - 0.5;
      float vignette = 1.0 - dot(center, center) * uVignetteStrength * 2.0;
      vignette = clamp(vignette, 0.3, 1.0);
      color.rgb *= vignette;
    }

    // Film grain
    if (uShowGrain) {
      float grain = noise(uv * 500.0 + uTime * 0.1);
      grain = (grain - 0.5) * uGrainIntensity;
      color.rgb += grain;
    }

    // Transition line highlight
    float lineDist = abs(uv.x - uProgress);
    if (lineDist < 0.002) {
      color.rgb = mix(color.rgb, vec3(1.0), 0.5);
    }

    gl_FragColor = color;
  }
`;

// ============================================================================
// FALLBACK COMPONENT
// ============================================================================

const CSSFallback: React.FC<{
  beforeImage: string;
  afterImage: string;
  progress: number;
}> = ({ beforeImage, afterImage, progress }) => {
  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* After image (full) */}
      <img
        src={afterImage}
        alt="After"
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Before image (clipped) */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ clipPath: `inset(0 ${100 - progress * 100}% 0 0)` }}
      >
        <img
          src={beforeImage}
          alt="Before"
          className="absolute inset-0 w-full h-full object-cover"
        />
      </div>

      {/* Transition line */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg"
        style={{ left: `${progress * 100}%` }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center">
          <div className="flex gap-0.5">
            <div className="w-0.5 h-4 bg-gray-400 rounded-full" />
            <div className="w-0.5 h-4 bg-gray-400 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 3D COMPONENTS
// ============================================================================

interface ShaderPlaneProps {
  beforeTexture: THREE.Texture;
  afterTexture: THREE.Texture;
  progress: number;
  vignetteStrength: number;
  grainIntensity: number;
  showGrain: boolean;
  showVignette: boolean;
}

const ShaderPlane: React.FC<ShaderPlaneProps> = ({
  beforeTexture,
  afterTexture,
  progress,
  vignetteStrength,
  grainIntensity,
  showGrain,
  showVignette
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  // Create shader material
  const shaderMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uProgress: { value: progress },
        uTextureBefore: { value: beforeTexture },
        uTextureAfter: { value: afterTexture },
        uVignetteStrength: { value: vignetteStrength },
        uGrainIntensity: { value: grainIntensity },
        uTime: { value: 0 },
        uShowGrain: { value: showGrain },
        uShowVignette: { value: showVignette }
      },
      transparent: true
    });
  }, [beforeTexture, afterTexture, vignetteStrength, grainIntensity, showGrain, showVignette]);

  // Update uniforms
  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uProgress.value = THREE.MathUtils.lerp(
        materialRef.current.uniforms.uProgress.value,
        progress,
        0.1
      );
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    }
  });

  // Sync progress prop
  useEffect(() => {
    if (materialRef.current) {
      // Target value will be interpolated in useFrame
      materialRef.current.uniforms.uProgress.value = materialRef.current.uniforms.uProgress.value;
    }
  }, [progress]);

  return (
    <mesh ref={meshRef} scale={[2, 2, 1]}>
      <planeGeometry args={[2, 2]} />
      <primitive object={shaderMaterial} ref={materialRef} attach="material" />
    </mesh>
  );
};

interface SceneControllerProps {
  beforeImage: string;
  afterImage: string;
  progress: number;
  vignetteStrength: number;
  grainIntensity: number;
  showGrain: boolean;
  showVignette: boolean;
}

const SceneController: React.FC<SceneControllerProps> = (props) => {
  const { beforeImage, afterImage } = props;

  // Load textures
  const beforeTexture = useTexture(beforeImage);
  const afterTexture = useTexture(afterImage);

  // Configure textures
  useEffect(() => {
    [beforeTexture, afterTexture].forEach(tex => {
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.generateMipmaps = false;
    });
  }, [beforeTexture, afterTexture]);

  return (
    <>
      <ShaderPlane
        beforeTexture={beforeTexture}
        afterTexture={afterTexture}
        progress={props.progress}
        vignetteStrength={props.vignetteStrength}
        grainIntensity={props.grainIntensity}
        showGrain={props.showGrain}
        showVignette={props.showVignette}
      />
    </>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const BeforeAfterShader: React.FC<BeforeAfterShaderProps> = ({
  beforeImage,
  afterImage,
  progress,
  vignetteStrength = 0.3,
  grainIntensity = 0.05,
  showGrain = true,
  showVignette = true,
  className = ''
}) => {
  const [webglSupported, setWebglSupported] = useState(true);
  const [texturesLoaded, setTexturesLoaded] = useState(false);

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

  // Preload textures
  useEffect(() => {
    const loader = new THREE.TextureLoader();
    let loaded = 0;

    const onLoad = () => {
      loaded++;
      if (loaded >= 2) {
        setTexturesLoaded(true);
      }
    };

    loader.load(beforeImage, onLoad);
    loader.load(afterImage, onLoad);
  }, [beforeImage, afterImage]);

  if (!webglSupported) {
    return (
      <div className={`relative ${className}`}>
        <CSSFallback
          beforeImage={beforeImage}
          afterImage={afterImage}
          progress={progress}
        />
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <Canvas
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance'
        }}
        camera={{ position: [0, 0, 1], fov: 50 }}
      >
        <SceneController
          beforeImage={beforeImage}
          afterImage={afterImage}
          progress={progress}
          vignetteStrength={vignetteStrength}
          grainIntensity={grainIntensity}
          showGrain={showGrain}
          showVignette={showVignette}
        />
      </Canvas>

      {/* Loading indicator */}
      {!texturesLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
};

export default BeforeAfterShader;
