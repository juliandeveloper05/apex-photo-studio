/**
 * APEX Photo Studio v1.1.0 - useReducedMotion Hook
 * Detecta la preferencia de reduced-motion del usuario.
 */

import { useState, useEffect } from 'react';

/**
 * Hook para detectar si el usuario prefiere animaciones reducidas
 * @returns boolean indicando si se debe reducir el motion
 */
export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    // Check initial preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    // Listen for changes
    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  return prefersReducedMotion;
}

export default useReducedMotion;
