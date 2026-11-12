export interface KeyLikeEvent {
  key: string;
  code?: string;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
}

/**
 * Checks if a key combination targets View Page Source, Save Page, or Browser DevTools.
 */
export function isRestrictedSourceShortcut(e: KeyLikeEvent): boolean {
  const key = (e.key || '').toLowerCase();
  const code = (e.code || '').toLowerCase();

  // F12 (DevTools)
  if (key === 'f12' || code === 'f12') {
    return true;
  }

  // Ctrl+U / Cmd+U / Cmd+Option+U (View Page Source)
  if ((e.ctrlKey || e.metaKey) && !e.shiftKey && key === 'u') {
    return true;
  }

  // Ctrl+S / Cmd+S (Save Page)
  if ((e.ctrlKey || e.metaKey) && !e.shiftKey && key === 's') {
    return true;
  }

  // Ctrl+Shift+I/J/C/K (Windows/Linux DevTools) or Cmd+Option+I/J/C/K (macOS DevTools)
  const devToolsLetters = key === 'i' || key === 'j' || key === 'c' || key === 'k';
  if ((e.ctrlKey && e.shiftKey && devToolsLetters) || (e.metaKey && e.altKey && devToolsLetters)) {
    return true;
  }

  return false;
}

function isEditableOrAllowedTarget(target: EventTarget | null): boolean {
  const el =
    target instanceof HTMLElement
      ? target
      : target instanceof Node
        ? target.parentElement
        : null;
  if (!el) return false;
  if (el.isContentEditable) return true;
  const tag = el.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
    return true;
  }
  return Boolean(el.closest('[data-allow-context="true"]'));
}

export function installSourceGuard(onTrigger?: (reason: string) => void): () => void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return () => {};
  }

  // Frame-busting complement to CSP frame-ancestors & X-Frame-Options
  try {
    if (window.top && window.top !== window.self) {
      window.top.location.href = window.self.location.href;
    }
  } catch {
    // Cross-origin framing blocked by browser
  }

  let lastNoticeAt = 0;
  const notify = (reason: string) => {
    const now = Date.now();
    if (now - lastNoticeAt > 1500) {
      lastNoticeAt = now;
      onTrigger?.(reason);
    }
  };

  const handleContextMenu = (e: MouseEvent) => {
    if (isEditableOrAllowedTarget(e.target)) {
      return;
    }
    e.preventDefault();
    notify('Klik kanan pada halaman dibatasi untuk proteksi antarmuka.');
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!isRestrictedSourceShortcut(e)) return;
    e.preventDefault();
    e.stopPropagation();
    notify('Akses View Source & shortcut inspeksi halaman dinonaktifkan.');
  };

  const handleDragStart = (e: DragEvent) => {
    if (e.target instanceof HTMLImageElement) {
      e.preventDefault();
    }
  };

  document.addEventListener('contextmenu', handleContextMenu, true);
  document.addEventListener('dragstart', handleDragStart, true);
  window.addEventListener('keydown', handleKeyDown, true);

  return () => {
    document.removeEventListener('contextmenu', handleContextMenu, true);
    document.removeEventListener('dragstart', handleDragStart, true);
    window.removeEventListener('keydown', handleKeyDown, true);
  };
}
