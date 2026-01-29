/**
 * APEX Photo Studio v1.1.0 - HeroStage 3D Scene
 * Escena 3D dinámica detrás del editor con cámara/film accessory rotando.
 * Soft lit studio: key light, fill, rim. Low-poly model, PBR material.
 */

import React, { useRef, useMemo, Suspense, useEffect, useState, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  useGLTF,
  Environment,
  ContactShadows,
  PerspectiveCamera,
  useTexture,
  Html,
  useProgress
} from '@react-three/drei';
import { motion, AnimatePresence } from 'framer-motion';
import * as THREE from 'three';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface HeroStageProps {
  /** Sensibilidad del parallax por mouse */
  parallaxSensitivity?: number;
  /** Offset máximo del parallax */
  maxParallaxOffset?: number;
  /** Velocidad de rotación */
  rotationSpeed?: number;
  /** Mostrar modelo de cámara */
  showCamera?: boolean;
  /** Mostrar reel de película */
  showFilmReel?: boolean;
  /** Clase CSS adicional */
  className?: string;
}

interface CameraModelProps {
  rotationSpeed: number;
  parallaxOffset: React.MutableRefObject<{ x: number; y: number }>;
}

interface FilmReelProps {
  rotationSpeed: number;
}

interface LightingSetupProps {
  intensity?: number;
}

// ============================================================================
// FALLBACK COMPONENTS
// ============================================================================

const CSSFallback: React.FC = () => {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/20 via-purple-900/10 to-transparent animate-pulse" />

      {/* Floating camera illustration */}
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        animate={{
          y: [0, -20, 0],
          rotate: [0, 5, -5, 0]
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: 'easeInOut'
        }}
      >
        <svg
          width="200"
          height="200"
          viewBox="0 0 200 200"
          fill="none"
          className="opacity-30"
        >
          <rect x="40" y="60" width="120" height="80" rx="10" stroke="url(#gradient)" strokeWidth="2" />
          <circle cx="100" cy="100" r="30" stroke="url(#gradient)" strokeWidth="2" />
          <circle cx="100" cy="100" r="20" fill="url(#gradient)" opacity="0.3" />
          <rect x="80" y="45" width="40" height="15" rx="3" stroke="url(#gradient)" strokeWidth="2" />
          <circle cx="145" cy="75" r="8" stroke="url(#gradient)" strokeWidth="2" />
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#a855f7" />
            </linearGradient>
          </defs>
        </svg>
      </motion.div>

      {/* Decorative elements */}
      <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-indigo-500/50 rounded-full animate-ping" />
      <div className="absolute bottom-1/3 right-1/4 w-3 h-3 bg-purple-500/30 rounded-full animate-pulse" />
    </div>
  );
};

const LoadingSpinner: React.FC = () => {
  return (
    <Html center>
      <div className="flex items-center justify-center">
        <motion.div
          className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        />
      </div>
    </Html>
  );
};

// ============================================================================
// 3D COMPONENTS
// ============================================================================

/**
 * Camera Model - Procedural low-poly camera
 * Fallback cuando no hay GLTF disponible
 */
const ProceduralCamera: React.FC<CameraModelProps> = ({ rotationSpeed, parallaxOffset }) => {
  const groupRef = useRef<THREE.Group>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);

  // PBR Material
  const material = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color('#222230'),
      roughness: 0.45,
      metalness: 0.05,
      envMapIntensity: 1
    });
  }, []);

  const lensMaterial = useMemo(() => {
    return new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#0a0a0f'),
      roughness: 0.05,
      metalness: 0.9,
      transmission: 0.1,
      thickness: 0.5,
      clearcoat: 1,
      clearcoatRoughness: 0.1
    });
  }, []);

  const accentMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color('#6366f1'),
      roughness: 0.3,
      metalness: 0.2,
      emissive: new THREE.Color('#6366f1'),
      emissiveIntensity: 0.2
    });
  }, []);

  useFrame((state) => {
    if (!groupRef.current) return;

    // Continuous rotation
    groupRef.current.rotation.y += rotationSpeed * 0.01;

    // Parallax response
    groupRef.current.rotation.x = THREE.MathUtils.lerp(
      groupRef.current.rotation.x,
      parallaxOffset.current.y * 0.3,
      0.05
    );
    groupRef.current.rotation.z = THREE.MathUtils.lerp(
      groupRef.current.rotation.z,
      parallaxOffset.current.x * 0.2,
      0.05
    );

    // Subtle floating animation
    groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
  });

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {/* Camera Body */}
      <mesh material={material} position={[0, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[2, 1.2, 0.8]} />
      </mesh>

      {/* Lens Housing */}
      <mesh material={material} position={[0, 0, 0.6]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.5, 0.5, 0.4, 32]} />
      </mesh>

      {/* Lens Glass */}
      <mesh material={lensMaterial} position={[0, 0, 0.81]}>
        <circleGeometry args={[0.4, 32]} />
      </mesh>

      {/* Viewfinder */}
      <mesh material={material} position={[0.6, 0.5, 0]}>
        <boxGeometry args={[0.6, 0.3, 0.4]} />
      </mesh>

      {/* Flash */}
      <mesh material={accentMaterial} position={[-0.7, 0.4, 0.1]}>
        <boxGeometry args={[0.3, 0.15, 0.1]} />
      </mesh>

      {/* Shutter Button */}
      <mesh material={accentMaterial} position={[0.8, 0.65, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 0.1, 16]} />
      </mesh>

      {/* Grip */}
      <mesh material={material} position={[0.9, -0.1, 0]}>
        <boxGeometry args={[0.3, 0.8, 0.6]} />
      </mesh>
    </group>
  );
};

/**
 * Film Reel - Procedural film reel model
 */
const ProceduralFilmReel: React.FC<FilmReelProps> = ({ rotationSpeed }) => {
  const groupRef = useRef<THREE.Group>(null);

  const material = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color('#1a1a25'),
      roughness: 0.5,
      metalness: 0.1
    });
  }, []);

  const filmMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color('#0a0a0f'),
      roughness: 0.8,
      metalness: 0
    });
  }, []);

  useFrame(() => {
    if (!groupRef.current) return;
    groupRef.current.rotation.z -= rotationSpeed * 0.02;
  });

  return (
    <group ref={groupRef} position={[2.5, -1, -1]} rotation={[0.3, 0, 0]} scale={0.6}>
      {/* Reel Disks */}
      <mesh material={material} position={[0, 0, -0.15]} castShadow>
        <ringGeometry args={[0.3, 1, 32]} />
      </mesh>
      <mesh material={material} position={[0, 0, 0.15]} castShadow>
        <ringGeometry args={[0.3, 1, 32]} />
      </mesh>

      {/* Film */}
      <mesh material={filmMaterial} position={[0, 0, 0]}>
        <cylinderGeometry args={[1, 1, 0.3, 32, 1, true]} />
      </mesh>

      {/* Center Hub */}
      <mesh material={material} position={[0, 0, 0]}>
        <cylinderGeometry args={[0.3, 0.3, 0.35, 16]} />
      </mesh>

      {/* Spokes */}
      {[0, 1, 2, 3].map((i) => (
        <mesh
          key={i}
          material={material}
          position={[
            Math.cos((i * Math.PI) / 2) * 0.65,
            Math.sin((i * Math.PI) / 2) * 0.65,
            0
          ]}
          rotation={[0, 0, (i * Math.PI) / 2]}
        >
          <boxGeometry args={[0.1, 0.4, 0.32]} />
        </mesh>
      ))}
    </group>
  );
};

/**
 * Lighting Setup - Studio lighting with key, fill, and rim lights
 */
const LightingSetup: React.FC<LightingSetupProps> = ({ intensity = 1 }) => {
  return (
    <>
      {/* Key Light - Main directional light */}
      <directionalLight
        position={[5, 5, 5]}
        intensity={1.2 * intensity}
        color="#ffffff"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={0.1}
        shadow-camera-far={50}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
        shadow-bias={-0.001}
      />

      {/* Fill Light - Softer, cooler light from opposite side */}
      <directionalLight
        position={[-5, 3, 2]}
        intensity={0.6 * intensity}
        color="#e0f2fe"
      />

      {/* Rim Light - Backlight for separation */}
      <pointLight
        position={[0, -3, -2]}
        intensity={0.8 * intensity}
        color="#818cf8"
        distance={10}
        decay={2}
      />

      {/* Ambient Light - Base illumination */}
      <ambientLight intensity={0.3 * intensity} color="#1a1a25" />

      {/* Environment lighting */}
      <Environment preset="city" />
    </>
  );
};

/**
 * Particle Field - Floating particles for atmosphere
 */
const ParticleField: React.FC = () => {
  const pointsRef = useRef<THREE.Points>(null);
  const particleCount = 50;

  const [positions, velocities] = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    const vel = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 15;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 15;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 10;

      vel[i * 3] = (Math.random() - 0.5) * 0.01;
      vel[i * 3 + 1] = (Math.random() - 0.5) * 0.01;
      vel[i * 3 + 2] = (Math.random() - 0.5) * 0.005;
    }

    return [pos, vel];
  }, []);

  useFrame(() => {
    if (!pointsRef.current) return;

    const positionAttribute = pointsRef.current.geometry.attributes.position;
    const posArray = positionAttribute.array as Float32Array;

    for (let i = 0; i < particleCount; i++) {
      posArray[i * 3] += velocities[i * 3];
      posArray[i * 3 + 1] += velocities[i * 3 + 1];
      posArray[i * 3 + 2] += velocities[i * 3 + 2];

      // Wrap around
      if (Math.abs(posArray[i * 3]) > 7.5) velocities[i * 3] *= -1;
      if (Math.abs(posArray[i * 3 + 1]) > 7.5) velocities[i * 3 + 1] *= -1;
      if (Math.abs(posArray[i * 3 + 2]) > 5) velocities[i * 3 + 2] *= -1;
    }

    positionAttribute.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.05}
        color="#6366f1"
        transparent
        opacity={0.6}
        sizeAttenuation
      />
    </points>
  );
};

/**
 * Scene Controller - Main scene composition
 */
interface SceneControllerProps {
  rotationSpeed: number;
  showCamera: boolean;
  showFilmReel: boolean;
}

const SceneController: React.FC<SceneControllerProps> = ({
  rotationSpeed,
  showCamera,
  showFilmReel
}) => {
  const { camera, gl } = useThree();
  const parallaxOffset = useRef({ x: 0, y: 0 });

  // Mouse parallax handler
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 2;
      const y = (e.clientY / window.innerHeight - 0.5) * 2;
      parallaxOffset.current = { x, y };
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Camera parallax
  useFrame(() => {
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, parallaxOffset.current.x * 0.5, 0.05);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, parallaxOffset.current.y * 0.3, 0.05);
    camera.lookAt(0, 0, 0);
  });

  return (
    <>
      <LightingSetup intensity={1} />

      {showCamera && (
        <ProceduralCamera
          rotationSpeed={rotationSpeed}
          parallaxOffset={parallaxOffset}
        />
      )}

      {showFilmReel && (
        <ProceduralFilmReel rotationSpeed={rotationSpeed} />
      )}

      <ParticleField />

      <ContactShadows
        position={[0, -2, 0]}
        opacity={0.4}
        scale={10}
        blur={2}
        far={4}
      />
    </>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const HeroStage: React.FC<HeroStageProps> = ({
  parallaxSensitivity = 0.02,
  maxParallaxOffset = 0.5,
  rotationSpeed = 0.5,
  showCamera = true,
  showFilmReel = true,
  className = ''
}) => {
  const [webglSupported, setWebglSupported] = useState(true);
  const [webglError, setWebglError] = useState<string | null>(null);

  // Check WebGL support
  useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) {
        setWebglSupported(false);
        setWebglError('WebGL no soportado');
      }
    } catch (e) {
      setWebglSupported(false);
      setWebglError('Error detectando WebGL');
    }
  }, []);

  // Handle WebGL context loss
  const handleContextLost = useCallback(() => {
    setWebglError('Contexto WebGL perdido');
    setWebglSupported(false);
  }, []);

  if (!webglSupported) {
    return <CSSFallback />;
  }

  return (
    <div className={`absolute inset-0 ${className}`}>
      <Canvas
        shadows
        dpr={[1, 2]}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
          stencil: false,
          depth: true
        }}
        onCreated={({ gl }) => {
          gl.setClearColor('#0a0a0f', 0);
          gl.domElement.addEventListener('webglcontextlost', handleContextLost);
        }}
      >
        <PerspectiveCamera
          makeDefault
          position={[0, 0, 8]}
          fov={45}
          near={0.1}
          far={100}
        />

        <Suspense fallback={<LoadingSpinner />}>
          <SceneController
            rotationSpeed={rotationSpeed}
            showCamera={showCamera}
            showFilmReel={showFilmReel}
          />
        </Suspense>
      </Canvas>

      {/* Gradient overlay for blending */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-transparent to-[#0a0a0f]/50 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0f]/50 via-transparent to-[#0a0a0f]/50 pointer-events-none" />
    </div>
  );
};

export default HeroStage;
