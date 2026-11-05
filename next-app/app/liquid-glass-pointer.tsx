'use client';

import { useEffect } from 'react';

export default function LiquidGlassPointer() {
  useEffect(() => {
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!finePointer || reduceMotion) return;
    const selector = '.build-card,.profile-panel,.support-panel,.compare-panel,.key-stats,.detail-stat,.artifact-detail-card,.modal-content,.ost-player,.seo-intro,.voice-line,.advisor-section';
    let frame = 0;
    let latest: PointerEvent | null = null;
    const update = () => {
      frame = 0;
      const target = latest?.target;
      if (!(target instanceof Element)) return;
      const panel = target.closest<HTMLElement>(selector);
      if (!panel || !latest) return;
      const rect = panel.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      panel.style.setProperty('--glass-x', ((latest.clientX - rect.left) / rect.width * 100).toFixed(1) + '%');
      panel.style.setProperty('--glass-y', ((latest.clientY - rect.top) / rect.height * 100).toFixed(1) + '%');
    };
    const onPointerMove = (event: PointerEvent) => {
      latest = event;
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    document.addEventListener('pointermove', onPointerMove, { passive: true });
    return () => {
      document.removeEventListener('pointermove', onPointerMove);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);
  return null;
}
