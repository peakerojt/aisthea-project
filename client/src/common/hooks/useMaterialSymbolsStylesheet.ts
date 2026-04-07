import { useEffect } from 'react';

const MATERIAL_SYMBOLS_ID = 'material-symbols-stylesheet';
const MATERIAL_SYMBOLS_HREF =
  'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200';

type Priority = 'idle' | 'immediate';

const ensureMaterialSymbolsStylesheet = () => {
  if (typeof document === 'undefined') {
    return;
  }

  if (document.getElementById(MATERIAL_SYMBOLS_ID)) {
    return;
  }

  const link = document.createElement('link');
  link.id = MATERIAL_SYMBOLS_ID;
  link.rel = 'stylesheet';
  link.href = MATERIAL_SYMBOLS_HREF;
  document.head.appendChild(link);
};

export const useMaterialSymbolsStylesheet = (priority: Priority) => {
  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    if (priority === 'immediate') {
      ensureMaterialSymbolsStylesheet();
      return undefined;
    }

    if ('requestIdleCallback' in window) {
      const idleId = window.requestIdleCallback(() => {
        ensureMaterialSymbolsStylesheet();
      }, { timeout: 2000 });

      return () => {
        window.cancelIdleCallback(idleId);
      };
    }

    const timeoutId = window.setTimeout(() => {
      ensureMaterialSymbolsStylesheet();
    }, 1200);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [priority]);
};
