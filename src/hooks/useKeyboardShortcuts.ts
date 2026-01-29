/**
 * APEX Photo Studio v1.1.0 - useKeyboardShortcuts Hook
 * Gestiona atajos de teclado globales.
 */

import { useEffect, useCallback, useRef } from 'react';

export interface KeyboardShortcut {
  /** Tecla o combinación (ej: 'c', 'ctrl+s', 'shift+arrowup') */
  key: string;
  /** Callback al ejecutar el shortcut */
  handler: (event: KeyboardEvent) => void;
  /** Prevenir comportamiento por defecto */
  preventDefault?: boolean;
  /** Solo ejecutar cuando el elemento tiene foco */
  target?: HTMLElement | null;
}

export interface UseKeyboardShortcutsOptions {
  /** Lista de shortcuts a registrar */
  shortcuts: KeyboardShortcut[];
  /** Habilitar/deshabilitar todos los shortcuts */
  enabled?: boolean;
  /** Ignorar shortcuts cuando el foco está en inputs */
  ignoreInputs?: boolean;
}

/**
 * Hook para gestionar atajos de teclado globales
 */
export function useKeyboardShortcuts(options: UseKeyboardShortcutsOptions): void {
  const { shortcuts, enabled = true, ignoreInputs = true } = options;
  const shortcutsRef = useRef(shortcuts);

  // Update ref when shortcuts change
  useEffect(() => {
    shortcutsRef.current = shortcuts;
  }, [shortcuts]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    // Ignore if target is an input/textarea
    if (ignoreInputs) {
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }
    }

    const key = event.key.toLowerCase();
    const ctrl = event.ctrlKey || event.metaKey;
    const shift = event.shiftKey;
    const alt = event.altKey;

    for (const shortcut of shortcutsRef.current) {
      const shortcutKey = shortcut.key.toLowerCase();
      const parts = shortcutKey.split('+');

      // Check modifiers
      const needsCtrl = parts.includes('ctrl') || parts.includes('cmd');
      const needsShift = parts.includes('shift');
      const needsAlt = parts.includes('alt');

      if (needsCtrl !== ctrl || needsShift !== shift || needsAlt !== alt) {
        continue;
      }

      // Get the actual key
      const actualKey = parts.find(p => !['ctrl', 'cmd', 'shift', 'alt'].includes(p));
      if (!actualKey) continue;

      // Check if key matches
      const keyMatches = key === actualKey ||
        (actualKey === 'arrowup' && key === 'arrowup') ||
        (actualKey === 'arrowdown' && key === 'arrowdown') ||
        (actualKey === 'arrowleft' && key === 'arrowleft') ||
        (actualKey === 'arrowright' && key === 'arrowright');

      if (keyMatches) {
        if (shortcut.preventDefault) {
          event.preventDefault();
        }
        shortcut.handler(event);
        break;
      }
    }
  }, [enabled, ignoreInputs]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
}

export default useKeyboardShortcuts;
